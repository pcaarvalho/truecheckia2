#!/usr/bin/env tsx

/**
 * TrueCheckIA - Redis Performance Benchmark Script
 * TAREFA 2: Configuração do Redis Serverless usando Upstash
 * 
 * Compara performance entre Redis tradicional e Upstash Redis
 */

import { Redis as TraditionalRedis } from 'ioredis'
import { Redis as UpstashRedis } from '@upstash/redis'
import { config } from '@truecheckia/config'
import { performance } from 'perf_hooks'
import { createHash } from 'crypto'

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green')
}

function logError(message: string) {
  log(`❌ ${message}`, 'red')
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow')
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'blue')
}

interface BenchmarkResult {
  operation: string
  provider: 'traditional' | 'upstash'
  totalTime: number
  operations: number
  avgTime: number
  opsPerSecond: number
  minTime: number
  maxTime: number
  p95Time: number
  success: boolean
  errors: number
}

interface BenchmarkConfig {
  warmupOps: number
  benchmarkOps: number
  concurrency: number
  dataSize: 'small' | 'medium' | 'large'
}

class RedisPerformanceBenchmark {
  private traditionalRedis: TraditionalRedis | null = null
  private upstashRedis: UpstashRedis
  private results: BenchmarkResult[] = []

  constructor() {
    // Initialize Upstash Redis
    if (!config.upstash.url || !config.upstash.token) {
      throw new Error('Upstash Redis credentials not configured')
    }

    this.upstashRedis = new UpstashRedis({
      url: config.upstash.url,
      token: config.upstash.token,
    })

    // Try to initialize traditional Redis if available
    try {
      if (config.redis.url) {
        this.traditionalRedis = new TraditionalRedis(config.redis.url, {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 1,
          lazyConnect: true,
        })
      }
    } catch (error) {
      logWarning('Traditional Redis not available')
    }
  }

  private generateTestData(size: 'small' | 'medium' | 'large') {
    const base = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      userId: 'benchmark-user',
    }

    switch (size) {
      case 'small':
        return JSON.stringify({
          ...base,
          data: 'small test data'
        })
      case 'medium':
        return JSON.stringify({
          ...base,
          data: Array.from({ length: 100 }, (_, i) => `data-item-${i}`),
          metadata: {
            processed: false,
            retries: 0,
            tags: ['test', 'benchmark', 'medium']
          }
        })
      case 'large':
        return JSON.stringify({
          ...base,
          data: Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            content: `large-content-item-${i}`,
            metadata: {
              created: Date.now(),
              modified: Date.now(),
              tags: ['large', 'benchmark', 'test']
            }
          })),
          analytics: {
            views: Math.floor(Math.random() * 10000),
            clicks: Math.floor(Math.random() * 1000),
            conversions: Math.floor(Math.random() * 100),
          }
        })
    }
  }

  private async measureOperations<T>(
    operations: Array<() => Promise<T>>,
    label: string
  ): Promise<{ results: T[]; times: number[]; errors: number }> {
    const times: number[] = []
    const results: T[] = []
    let errors = 0

    logInfo(`Running ${operations.length} ${label} operations...`)

    for (const operation of operations) {
      const start = performance.now()
      try {
        const result = await operation()
        results.push(result)
        times.push(performance.now() - start)
      } catch (error) {
        errors++
        times.push(performance.now() - start)
        results.push(null as T)
      }
    }

    return { results, times, errors }
  }

  private calculateStats(times: number[]): {
    total: number
    avg: number
    min: number
    max: number
    p95: number
    opsPerSecond: number
  } {
    const sorted = times.slice().sort((a, b) => a - b)
    const total = times.reduce((sum, time) => sum + time, 0)
    const avg = total / times.length
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    const p95Index = Math.floor(sorted.length * 0.95)
    const p95 = sorted[p95Index]
    const opsPerSecond = times.length / (total / 1000)

    return { total, avg, min, max, p95, opsPerSecond }
  }

  private recordResult(
    operation: string,
    provider: 'traditional' | 'upstash',
    times: number[],
    operations: number,
    errors: number
  ) {
    const stats = this.calculateStats(times)
    
    const result: BenchmarkResult = {
      operation,
      provider,
      totalTime: stats.total,
      operations,
      avgTime: stats.avg,
      opsPerSecond: stats.opsPerSecond,
      minTime: stats.min,
      maxTime: stats.max,
      p95Time: stats.p95,
      success: errors === 0,
      errors
    }

    this.results.push(result)

    const errorStr = errors > 0 ? ` (${errors} errors)` : ''
    log(`  ${provider}: ${stats.avg.toFixed(2)}ms avg, ${stats.opsPerSecond.toFixed(0)} ops/sec${errorStr}`, 
        errors > 0 ? 'yellow' : 'green')
  }

  async benchmarkStringOperations(config: BenchmarkConfig): Promise<void> {
    logInfo('Benchmarking string operations...')
    
    const testData = this.generateTestData(config.dataSize)
    const keys = Array.from({ length: config.benchmarkOps }, (_, i) => `bench:string:${i}`)

    // Benchmark Upstash SET operations
    const upstashSetOps = keys.map(key => () => 
      this.upstashRedis.set(key, testData, { ex: 300 })
    )
    const upstashSetResult = await this.measureOperations(upstashSetOps, 'Upstash SET')
    this.recordResult('STRING SET', 'upstash', upstashSetResult.times, config.benchmarkOps, upstashSetResult.errors)

    // Benchmark Upstash GET operations
    const upstashGetOps = keys.map(key => () => this.upstashRedis.get(key))
    const upstashGetResult = await this.measureOperations(upstashGetOps, 'Upstash GET')
    this.recordResult('STRING GET', 'upstash', upstashGetResult.times, config.benchmarkOps, upstashGetResult.errors)

    // Benchmark Traditional Redis if available
    if (this.traditionalRedis) {
      try {
        // Traditional SET operations
        const traditionalSetOps = keys.map(key => () => 
          this.traditionalRedis!.setex(key, 300, testData)
        )
        const traditionalSetResult = await this.measureOperations(traditionalSetOps, 'Traditional SET')
        this.recordResult('STRING SET', 'traditional', traditionalSetResult.times, config.benchmarkOps, traditionalSetResult.errors)

        // Traditional GET operations
        const traditionalGetOps = keys.map(key => () => this.traditionalRedis!.get(key))
        const traditionalGetResult = await this.measureOperations(traditionalGetOps, 'Traditional GET')
        this.recordResult('STRING GET', 'traditional', traditionalGetResult.times, config.benchmarkOps, traditionalGetResult.errors)
      } catch (error) {
        logError(`Traditional Redis string operations failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Cleanup
    const upstashDelOps = keys.map(key => () => this.upstashRedis.del(key))
    await this.measureOperations(upstashDelOps, 'Cleanup')
  }

  async benchmarkHashOperations(config: BenchmarkConfig): Promise<void> {
    logInfo('Benchmarking hash operations...')
    
    const hashData = {
      userId: 'benchmark-user',
      email: 'benchmark@truecheckia.com',
      plan: 'pro',
      credits: '1000',
      metadata: JSON.stringify({ benchmark: true }),
      timestamp: Date.now().toString()
    }
    const keys = Array.from({ length: config.benchmarkOps }, (_, i) => `bench:hash:${i}`)

    // Benchmark Upstash HSET operations
    const upstashHsetOps = keys.map(key => () => 
      this.upstashRedis.hset(key, hashData)
    )
    const upstashHsetResult = await this.measureOperations(upstashHsetOps, 'Upstash HSET')
    this.recordResult('HASH SET', 'upstash', upstashHsetResult.times, config.benchmarkOps, upstashHsetResult.errors)

    // Benchmark Upstash HGETALL operations
    const upstashHgetallOps = keys.map(key => () => this.upstashRedis.hgetall(key))
    const upstashHgetallResult = await this.measureOperations(upstashHgetallOps, 'Upstash HGETALL')
    this.recordResult('HASH GETALL', 'upstash', upstashHgetallResult.times, config.benchmarkOps, upstashHgetallResult.errors)

    // Benchmark Traditional Redis if available
    if (this.traditionalRedis) {
      try {
        // Traditional HSET operations
        const traditionalHsetOps = keys.map(key => () => 
          this.traditionalRedis!.hmset(key, hashData)
        )
        const traditionalHsetResult = await this.measureOperations(traditionalHsetOps, 'Traditional HSET')
        this.recordResult('HASH SET', 'traditional', traditionalHsetResult.times, config.benchmarkOps, traditionalHsetResult.errors)

        // Traditional HGETALL operations
        const traditionalHgetallOps = keys.map(key => () => this.traditionalRedis!.hgetall(key))
        const traditionalHgetallResult = await this.measureOperations(traditionalHgetallOps, 'Traditional HGETALL')
        this.recordResult('HASH GETALL', 'traditional', traditionalHgetallResult.times, config.benchmarkOps, traditionalHgetallResult.errors)
      } catch (error) {
        logError(`Traditional Redis hash operations failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Cleanup
    const upstashDelOps = keys.map(key => () => this.upstashRedis.del(key))
    await this.measureOperations(upstashDelOps, 'Cleanup')
  }

  async benchmarkListOperations(config: BenchmarkConfig): Promise<void> {
    logInfo('Benchmarking list operations...')
    
    const listItems = Array.from({ length: 10 }, (_, i) => `item-${i}`)
    const keys = Array.from({ length: config.benchmarkOps }, (_, i) => `bench:list:${i}`)

    // Benchmark Upstash LPUSH operations
    const upstashLpushOps = keys.map(key => () => 
      this.upstashRedis.lpush(key, ...listItems)
    )
    const upstashLpushResult = await this.measureOperations(upstashLpushOps, 'Upstash LPUSH')
    this.recordResult('LIST PUSH', 'upstash', upstashLpushResult.times, config.benchmarkOps, upstashLpushResult.errors)

    // Benchmark Upstash LLEN operations
    const upstashLlenOps = keys.map(key => () => this.upstashRedis.llen(key))
    const upstashLlenResult = await this.measureOperations(upstashLlenOps, 'Upstash LLEN')
    this.recordResult('LIST LEN', 'upstash', upstashLlenResult.times, config.benchmarkOps, upstashLlenResult.errors)

    // Benchmark Traditional Redis if available
    if (this.traditionalRedis) {
      try {
        // Traditional LPUSH operations
        const traditionalLpushOps = keys.map(key => () => 
          this.traditionalRedis!.lpush(key, ...listItems)
        )
        const traditionalLpushResult = await this.measureOperations(traditionalLpushOps, 'Traditional LPUSH')
        this.recordResult('LIST PUSH', 'traditional', traditionalLpushResult.times, config.benchmarkOps, traditionalLpushResult.errors)

        // Traditional LLEN operations
        const traditionalLlenOps = keys.map(key => () => this.traditionalRedis!.llen(key))
        const traditionalLlenResult = await this.measureOperations(traditionalLlenOps, 'Traditional LLEN')
        this.recordResult('LIST LEN', 'traditional', traditionalLlenResult.times, config.benchmarkOps, traditionalLlenResult.errors)
      } catch (error) {
        logError(`Traditional Redis list operations failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Cleanup
    const upstashDelOps = keys.map(key => () => this.upstashRedis.del(key))
    await this.measureOperations(upstashDelOps, 'Cleanup')
  }

  async benchmarkRateLimiting(config: BenchmarkConfig): Promise<void> {
    logInfo('Benchmarking rate limiting pattern...')
    
    const userId = 'benchmark-rate-limit'
    const rateLimitKey = `rate:limit:${userId}`

    // Benchmark Upstash rate limiting
    const upstashRateLimitOps = Array.from({ length: config.benchmarkOps }, () => async () => {
      const current = await this.upstashRedis.incr(rateLimitKey)
      if (current === 1) {
        await this.upstashRedis.expire(rateLimitKey, 60)
      }
      return current
    })
    const upstashRateLimitResult = await this.measureOperations(upstashRateLimitOps, 'Upstash Rate Limit')
    this.recordResult('RATE LIMIT', 'upstash', upstashRateLimitResult.times, config.benchmarkOps, upstashRateLimitResult.errors)

    // Reset for traditional test
    await this.upstashRedis.del(rateLimitKey)

    // Benchmark Traditional Redis if available
    if (this.traditionalRedis) {
      try {
        const traditionalRateLimitOps = Array.from({ length: config.benchmarkOps }, () => async () => {
          const current = await this.traditionalRedis!.incr(rateLimitKey)
          if (current === 1) {
            await this.traditionalRedis!.expire(rateLimitKey, 60)
          }
          return current
        })
        const traditionalRateLimitResult = await this.measureOperations(traditionalRateLimitOps, 'Traditional Rate Limit')
        this.recordResult('RATE LIMIT', 'traditional', traditionalRateLimitResult.times, config.benchmarkOps, traditionalRateLimitResult.errors)
      } catch (error) {
        logError(`Traditional Redis rate limiting failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Cleanup
    await this.upstashRedis.del(rateLimitKey)
  }

  async benchmarkConcurrentOperations(config: BenchmarkConfig): Promise<void> {
    logInfo('Benchmarking concurrent operations...')
    
    const testData = this.generateTestData(config.dataSize)
    const keys = Array.from({ length: config.benchmarkOps }, (_, i) => `bench:concurrent:${i}`)

    // Benchmark Upstash concurrent operations
    const upstashConcurrentOps = keys.map(key => async () => {
      await this.upstashRedis.set(key, testData, { ex: 300 })
      const result = await this.upstashRedis.get(key)
      await this.upstashRedis.del(key)
      return result
    })

    const upstashStart = performance.now()
    const upstashPromises = Array.from({ length: config.concurrency }, (_, batch) => {
      const start = batch * Math.floor(config.benchmarkOps / config.concurrency)
      const end = start + Math.floor(config.benchmarkOps / config.concurrency)
      return Promise.all(upstashConcurrentOps.slice(start, end).map(op => op()))
    })
    
    try {
      await Promise.all(upstashPromises)
      const upstashTime = performance.now() - upstashStart
      this.recordResult('CONCURRENT OPS', 'upstash', [upstashTime], config.benchmarkOps, 0)
    } catch (error) {
      const upstashTime = performance.now() - upstashStart
      this.recordResult('CONCURRENT OPS', 'upstash', [upstashTime], config.benchmarkOps, 1)
      logError(`Upstash concurrent operations failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Benchmark Traditional Redis if available
    if (this.traditionalRedis) {
      try {
        const traditionalConcurrentOps = keys.map(key => async () => {
          await this.traditionalRedis!.setex(key, 300, testData)
          const result = await this.traditionalRedis!.get(key)
          await this.traditionalRedis!.del(key)
          return result
        })

        const traditionalStart = performance.now()
        const traditionalPromises = Array.from({ length: config.concurrency }, (_, batch) => {
          const start = batch * Math.floor(config.benchmarkOps / config.concurrency)
          const end = start + Math.floor(config.benchmarkOps / config.concurrency)
          return Promise.all(traditionalConcurrentOps.slice(start, end).map(op => op()))
        })
        
        await Promise.all(traditionalPromises)
        const traditionalTime = performance.now() - traditionalStart
        this.recordResult('CONCURRENT OPS', 'traditional', [traditionalTime], config.benchmarkOps, 0)
      } catch (error) {
        logError(`Traditional Redis concurrent operations failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  printResults(): void {
    log('\n' + '='.repeat(80), 'cyan')
    log('REDIS PERFORMANCE BENCHMARK RESULTS', 'cyan')
    log('='.repeat(80), 'cyan')

    // Group results by operation
    const operations = [...new Set(this.results.map(r => r.operation))]
    
    for (const operation of operations) {
      log(`\n${operation}:`, 'bright')
      
      const operationResults = this.results.filter(r => r.operation === operation)
      const upstashResult = operationResults.find(r => r.provider === 'upstash')
      const traditionalResult = operationResults.find(r => r.provider === 'traditional')

      if (upstashResult) {
        const errorStr = upstashResult.errors > 0 ? ` (${upstashResult.errors} errors)` : ''
        log(`  Upstash:     ${upstashResult.avgTime.toFixed(2)}ms avg, ${upstashResult.opsPerSecond.toFixed(0)} ops/sec${errorStr}`, 
            upstashResult.errors > 0 ? 'yellow' : 'green')
        log(`               Min: ${upstashResult.minTime.toFixed(2)}ms, Max: ${upstashResult.maxTime.toFixed(2)}ms, P95: ${upstashResult.p95Time.toFixed(2)}ms`, 'blue')
      }

      if (traditionalResult) {
        const errorStr = traditionalResult.errors > 0 ? ` (${traditionalResult.errors} errors)` : ''
        log(`  Traditional: ${traditionalResult.avgTime.toFixed(2)}ms avg, ${traditionalResult.opsPerSecond.toFixed(0)} ops/sec${errorStr}`, 
            traditionalResult.errors > 0 ? 'yellow' : 'green')
        log(`               Min: ${traditionalResult.minTime.toFixed(2)}ms, Max: ${traditionalResult.maxTime.toFixed(2)}ms, P95: ${traditionalResult.p95Time.toFixed(2)}ms`, 'blue')
      }

      if (upstashResult && traditionalResult) {
        const speedRatio = traditionalResult.avgTime / upstashResult.avgTime
        const throughputRatio = upstashResult.opsPerSecond / traditionalResult.opsPerSecond
        
        if (speedRatio > 1) {
          log(`  Comparison:  Upstash is ${speedRatio.toFixed(2)}x faster`, 'green')
        } else {
          log(`  Comparison:  Traditional is ${(1 / speedRatio).toFixed(2)}x faster`, 'yellow')
        }
        
        log(`               Throughput ratio: ${throughputRatio.toFixed(2)}x`, 'blue')
      }
    }

    // Overall analysis
    log('\nOverall Analysis:', 'bright')
    
    const upstashResults = this.results.filter(r => r.provider === 'upstash')
    const traditionalResults = this.results.filter(r => r.provider === 'traditional')
    
    if (upstashResults.length > 0) {
      const avgUpstashLatency = upstashResults.reduce((sum, r) => sum + r.avgTime, 0) / upstashResults.length
      const totalUpstashThroughput = upstashResults.reduce((sum, r) => sum + r.opsPerSecond, 0)
      log(`  Upstash avg latency: ${avgUpstashLatency.toFixed(2)}ms`, 'green')
      log(`  Upstash total throughput: ${totalUpstashThroughput.toFixed(0)} ops/sec`, 'green')
    }

    if (traditionalResults.length > 0) {
      const avgTraditionalLatency = traditionalResults.reduce((sum, r) => sum + r.avgTime, 0) / traditionalResults.length
      const totalTraditionalThroughput = traditionalResults.reduce((sum, r) => sum + r.opsPerSecond, 0)
      log(`  Traditional avg latency: ${avgTraditionalLatency.toFixed(2)}ms`, 'green')
      log(`  Traditional total throughput: ${totalTraditionalThroughput.toFixed(0)} ops/sec`, 'green')
    }

    // Recommendations
    log('\nRecommendations:', 'yellow')
    
    const hasErrors = this.results.some(r => r.errors > 0)
    if (hasErrors) {
      logWarning('Some operations had errors - investigate connectivity or configuration issues')
    }

    const highLatencyOperations = this.results.filter(r => r.avgTime > 1000)
    if (highLatencyOperations.length > 0) {
      logWarning(`High latency detected in: ${highLatencyOperations.map(r => `${r.operation} (${r.provider})`).join(', ')}`)
    }

    const upstashAvgLatency = upstashResults.reduce((sum, r) => sum + r.avgTime, 0) / upstashResults.length
    if (upstashAvgLatency < 200) {
      logSuccess('Upstash performance is excellent for production workloads')
    } else if (upstashAvgLatency < 500) {
      logInfo('Upstash performance is good for most workloads')
    } else {
      logWarning('Upstash performance may need optimization for high-throughput workloads')
    }

    log('\n' + '='.repeat(80), 'cyan')
  }

  async runBenchmarks(): Promise<void> {
    log('🚀 Starting Redis Performance Benchmarks', 'cyan')
    log('='.repeat(80), 'cyan')
    
    const startTime = performance.now()

    // Different benchmark configurations
    const configs: { name: string; config: BenchmarkConfig }[] = [
      {
        name: 'Light Load (Small Data)',
        config: {
          warmupOps: 10,
          benchmarkOps: 50,
          concurrency: 5,
          dataSize: 'small'
        }
      },
      {
        name: 'Medium Load (Medium Data)',
        config: {
          warmupOps: 5,
          benchmarkOps: 25,
          concurrency: 3,
          dataSize: 'medium'
        }
      },
      {
        name: 'Heavy Load (Large Data)',
        config: {
          warmupOps: 3,
          benchmarkOps: 10,
          concurrency: 2,
          dataSize: 'large'
        }
      }
    ]

    for (const { name, config } of configs) {
      log(`\n📊 Running ${name} Benchmark...`, 'cyan')
      
      try {
        await this.benchmarkStringOperations(config)
        await this.benchmarkHashOperations(config)
        await this.benchmarkListOperations(config)
        await this.benchmarkRateLimiting(config)
        
        // Only run concurrent operations for light and medium loads
        if (config.dataSize !== 'large') {
          await this.benchmarkConcurrentOperations(config)
        }
      } catch (error) {
        logError(`Benchmark ${name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    const totalTime = performance.now() - startTime
    log(`\nTotal benchmark time: ${(totalTime / 1000).toFixed(2)} seconds`, 'blue')
    
    this.printResults()
  }

  async cleanup(): Promise<void> {
    if (this.traditionalRedis) {
      this.traditionalRedis.disconnect()
    }
  }
}

// Main execution
async function main() {
  let benchmark: RedisPerformanceBenchmark | null = null

  try {
    benchmark = new RedisPerformanceBenchmark()
    await benchmark.runBenchmarks()
  } catch (error) {
    logError(`Failed to initialize benchmark: ${error instanceof Error ? error.message : 'Unknown error'}`)
    process.exit(1)
  } finally {
    if (benchmark) {
      await benchmark.cleanup()
    }
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    logError(`Unhandled error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    process.exit(1)
  })
}

export default RedisPerformanceBenchmark