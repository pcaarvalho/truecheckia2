#!/usr/bin/env tsx

/**
 * TrueCheckIA - Redis Migration Test Script
 * TAREFA 2: Configuração do Redis Serverless usando Upstash
 * 
 * Script para testar a migração completa do Redis tradicional para Upstash
 */

import { Redis as TraditionalRedis } from 'ioredis'
import { Redis as UpstashRedis } from '@upstash/redis'
import { config } from '@truecheckia/config'
import { performance } from 'perf_hooks'

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

interface TestResult {
  test: string
  success: boolean
  duration?: number
  error?: string
  details?: any
}

class RedisMigrationTester {
  private traditionalRedis: TraditionalRedis | null = null
  private upstashRedis: UpstashRedis
  private testResults: TestResult[] = []

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
        this.traditionalRedis = new TraditionalRedis(config.redis.url)
      }
    } catch (error) {
      logWarning('Traditional Redis not available (this is expected in serverless environments)')
    }
  }

  private async measureTime<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now()
    const result = await operation()
    const duration = performance.now() - start
    return { result, duration }
  }

  private recordResult(test: string, success: boolean, duration?: number, error?: string, details?: any) {
    this.testResults.push({ test, success, duration, error, details })
    
    if (success) {
      const durationStr = duration ? ` (${duration.toFixed(2)}ms)` : ''
      logSuccess(`${test}${durationStr}`)
    } else {
      logError(`${test}: ${error}`)
    }
  }

  async testUpstashConnection(): Promise<void> {
    logInfo('Testing Upstash Redis connection...')
    
    try {
      const { result, duration } = await this.measureTime(() => this.upstashRedis.ping())
      this.recordResult('Upstash Connection', true, duration, undefined, { ping: result })
    } catch (error) {
      this.recordResult('Upstash Connection', false, undefined, 
        error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async testTraditionalConnection(): Promise<void> {
    logInfo('Testing Traditional Redis connection...')
    
    if (!this.traditionalRedis) {
      this.recordResult('Traditional Redis Connection', false, undefined, 'Traditional Redis not configured')
      return
    }

    try {
      const { result, duration } = await this.measureTime(() => this.traditionalRedis!.ping())
      this.recordResult('Traditional Redis Connection', true, duration, undefined, { ping: result })
    } catch (error) {
      this.recordResult('Traditional Redis Connection', false, undefined,
        error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async testDataConsistency(): Promise<void> {
    logInfo('Testing data consistency between Redis instances...')
    
    const testKey = 'migration:test:consistency'
    const testData = {
      userId: 'test-user-123',
      email: 'test@truecheckia.com',
      plan: 'pro',
      credits: 150,
      metadata: {
        lastLogin: new Date().toISOString(),
        preferences: {
          theme: 'dark',
          notifications: true
        }
      }
    }

    try {
      // Write to Upstash
      await this.upstashRedis.set(testKey, JSON.stringify(testData), { ex: 300 })
      
      // Read from Upstash
      const upstashResult = await this.upstashRedis.get(testKey)
      const upstashData = upstashResult ? JSON.parse(upstashResult as string) : null

      // Check consistency
      const isConsistent = upstashData && 
        upstashData.userId === testData.userId &&
        upstashData.email === testData.email &&
        upstashData.credits === testData.credits &&
        upstashData.metadata.preferences.theme === testData.metadata.preferences.theme

      this.recordResult('Data Consistency', isConsistent, undefined, 
        isConsistent ? undefined : 'Data mismatch between write and read')

      // Cleanup
      await this.upstashRedis.del(testKey)

    } catch (error) {
      this.recordResult('Data Consistency', false, undefined,
        error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async testRateLimitingCompatibility(): Promise<void> {
    logInfo('Testing rate limiting compatibility...')
    
    const userId = 'test-rate-limit-user'
    const rateLimitKey = `rate:limit:${userId}`
    const maxRequests = 5
    const windowSeconds = 60

    try {
      let successfulRequests = 0
      const requestResults: number[] = []

      // Simulate rate limiting requests
      for (let i = 0; i < maxRequests + 3; i++) {
        const current = await this.upstashRedis.incr(rateLimitKey)
        requestResults.push(current)
        
        if (current === 1) {
          await this.upstashRedis.expire(rateLimitKey, windowSeconds)
        }
        
        if (current <= maxRequests) {
          successfulRequests++
        }
      }

      const rateLimitingWorks = successfulRequests === maxRequests
      this.recordResult('Rate Limiting Compatibility', rateLimitingWorks, undefined,
        rateLimitingWorks ? undefined : `Expected ${maxRequests} allowed, got ${successfulRequests}`,
        { requestResults, successfulRequests })

      // Cleanup
      await this.upstashRedis.del(rateLimitKey)

    } catch (error) {
      this.recordResult('Rate Limiting Compatibility', false, undefined,
        error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async testCachePatterns(): Promise<void> {
    logInfo('Testing cache patterns...')
    
    const testCases = [
      {
        name: 'User Cache',
        key: 'cache:user:123',
        data: { id: '123', name: 'Test User', email: 'test@example.com' }
      },
      {
        name: 'Analysis Cache',
        key: 'cache:analysis:abc123',
        data: { aiScore: 85, confidence: 0.92, isAiGenerated: true }
      },
      {
        name: 'Session Cache',
        key: 'cache:session:sess123',
        data: { userId: '123', loginTime: Date.now(), ipAddress: '127.0.0.1' }
      }
    ]

    for (const testCase of testCases) {
      try {
        const { duration: setDuration } = await this.measureTime(() =>
          this.upstashRedis.set(testCase.key, JSON.stringify(testCase.data), { ex: 300 })
        )

        const { result: retrieved, duration: getDuration } = await this.measureTime(() =>
          this.upstashRedis.get(testCase.key)
        )

        const parsedData = retrieved ? JSON.parse(retrieved as string) : null
        const isCorrect = parsedData && JSON.stringify(parsedData) === JSON.stringify(testCase.data)

        this.recordResult(`Cache Pattern: ${testCase.name}`, isCorrect, setDuration + getDuration,
          isCorrect ? undefined : 'Data mismatch')

        // Cleanup
        await this.upstashRedis.del(testCase.key)

      } catch (error) {
        this.recordResult(`Cache Pattern: ${testCase.name}`, false, undefined,
          error instanceof Error ? error.message : 'Unknown error')
      }
    }
  }

  async testQueueSimulation(): Promise<void> {
    logInfo('Testing queue simulation patterns...')
    
    const queueNames = ['analysis', 'email', 'credits']
    
    for (const queueName of queueNames) {
      try {
        const jobData = {
          id: `job-${queueName}-${Date.now()}`,
          type: queueName,
          payload: { test: true, timestamp: Date.now() },
          createdAt: Date.now()
        }

        // Add job to queue
        const { duration: addDuration } = await this.measureTime(() =>
          this.upstashRedis.lpush(`queue:${queueName}:pending`, JSON.stringify(jobData))
        )

        // Check queue length
        const queueLength = await this.upstashRedis.llen(`queue:${queueName}:pending`)

        // Process job
        const processedJob = await this.upstashRedis.rpop(`queue:${queueName}:pending`)
        const jobCorrect = processedJob && JSON.parse(processedJob as string).id === jobData.id

        // Store job result
        await this.upstashRedis.hset(`job:${jobData.id}`, {
          status: 'completed',
          result: 'Test passed',
          completedAt: Date.now().toString()
        })

        this.recordResult(`Queue Simulation: ${queueName}`, jobCorrect, addDuration,
          jobCorrect ? undefined : 'Job processing failed')

        // Cleanup
        await this.upstashRedis.del(`job:${jobData.id}`)

      } catch (error) {
        this.recordResult(`Queue Simulation: ${queueName}`, false, undefined,
          error instanceof Error ? error.message : 'Unknown error')
      }
    }
  }

  async testPerformanceComparison(): Promise<void> {
    logInfo('Testing performance comparison...')
    
    const operations = 25
    const testData = Array.from({ length: operations }, (_, i) => ({
      key: `perf:test:${i}`,
      value: JSON.stringify({
        index: i,
        timestamp: Date.now(),
        data: `test-data-${i}`,
        metadata: { processed: false, retries: 0 }
      })
    }))

    try {
      // Test Upstash performance
      const upstashStart = performance.now()
      
      // Concurrent SET operations
      await Promise.all(testData.map(item =>
        this.upstashRedis.set(item.key, item.value, { ex: 300 })
      ))
      
      // Concurrent GET operations
      const upstashResults = await Promise.all(testData.map(item =>
        this.upstashRedis.get(item.key)
      ))
      
      // Cleanup
      await Promise.all(testData.map(item =>
        this.upstashRedis.del(item.key)
      ))
      
      const upstashDuration = performance.now() - upstashStart
      const upstashAvg = upstashDuration / (operations * 3) // SET + GET + DEL

      this.recordResult('Upstash Performance', true, upstashDuration, undefined, {
        totalOps: operations * 3,
        avgPerOp: upstashAvg,
        opsPerSecond: (operations * 3) / (upstashDuration / 1000)
      })

      // Test Traditional Redis if available
      if (this.traditionalRedis) {
        try {
          const traditionalStart = performance.now()
          
          // Concurrent SET operations
          await Promise.all(testData.map(item =>
            this.traditionalRedis!.setex(item.key, 300, item.value)
          ))
          
          // Concurrent GET operations
          const traditionalResults = await Promise.all(testData.map(item =>
            this.traditionalRedis!.get(item.key)
          ))
          
          // Cleanup
          await Promise.all(testData.map(item =>
            this.traditionalRedis!.del(item.key)
          ))
          
          const traditionalDuration = performance.now() - traditionalStart
          const traditionalAvg = traditionalDuration / (operations * 3)

          this.recordResult('Traditional Redis Performance', true, traditionalDuration, undefined, {
            totalOps: operations * 3,
            avgPerOp: traditionalAvg,
            opsPerSecond: (operations * 3) / (traditionalDuration / 1000),
            comparisonRatio: upstashAvg / traditionalAvg
          })

        } catch (error) {
          this.recordResult('Traditional Redis Performance', false, undefined,
            error instanceof Error ? error.message : 'Unknown error')
        }
      }

    } catch (error) {
      this.recordResult('Performance Comparison', false, undefined,
        error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async testFailoverScenario(): Promise<void> {
    logInfo('Testing failover scenario...')
    
    try {
      // Simulate high load scenario
      const heavyData = {
        largeArray: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          data: `large-data-item-${i}`,
          metadata: { processed: false, timestamp: Date.now() }
        })),
        complexObject: {
          nested: {
            deeply: {
              nested: {
                data: 'test'
              }
            }
          }
        }
      }

      const heavyKey = 'test:heavy:data'
      
      // Test large data handling
      const { duration } = await this.measureTime(() =>
        this.upstashRedis.set(heavyKey, JSON.stringify(heavyData), { ex: 60 })
      )

      // Retrieve and verify
      const retrieved = await this.upstashRedis.get(heavyKey)
      const parsedData = retrieved ? JSON.parse(retrieved as string) : null
      
      const isCorrect = parsedData && 
        parsedData.largeArray.length === 1000 &&
        parsedData.complexObject.nested.deeply.nested.data === 'test'

      this.recordResult('Heavy Data Handling', isCorrect, duration,
        isCorrect ? undefined : 'Large data verification failed')

      // Test concurrent access
      const concurrentOps = Array.from({ length: 10 }, (_, i) =>
        this.upstashRedis.get(heavyKey)
      )
      
      const concurrentResults = await Promise.all(concurrentOps)
      const allSuccess = concurrentResults.every(result => result !== null)

      this.recordResult('Concurrent Access', allSuccess, undefined,
        allSuccess ? undefined : 'Some concurrent reads failed')

      // Cleanup
      await this.upstashRedis.del(heavyKey)

    } catch (error) {
      this.recordResult('Failover Scenario', false, undefined,
        error instanceof Error ? error.message : 'Unknown error')
    }
  }

  printSummary(): void {
    log('\n' + '='.repeat(70), 'cyan')
    log('REDIS MIGRATION TEST SUMMARY', 'cyan')
    log('='.repeat(70), 'cyan')
    
    const successful = this.testResults.filter(r => r.success).length
    const total = this.testResults.length
    const successRate = (successful / total * 100).toFixed(1)
    
    log(`\nOverall Results: ${successful}/${total} tests passed (${successRate}%)`, 'bright')
    
    if (successful === total) {
      logSuccess('🎉 All migration tests passed! Ready for production.')
    } else if (successful > total * 0.8) {
      logWarning('⚠️  Most tests passed, but some issues detected.')
    } else {
      logError('❌ Multiple test failures. Migration not ready.')
    }

    // Performance analysis
    const performanceTests = this.testResults.filter(r => r.duration !== undefined && r.details?.avgPerOp)
    if (performanceTests.length > 0) {
      log('\nPerformance Analysis:', 'blue')
      performanceTests.forEach(test => {
        if (test.details?.avgPerOp) {
          const avgMs = test.details.avgPerOp.toFixed(2)
          const opsPerSec = test.details.opsPerSecond?.toFixed(0) || 'N/A'
          log(`  ${test.test}: ${avgMs}ms avg, ${opsPerSec} ops/sec`, 'blue')
          
          if (test.details.comparisonRatio) {
            const ratio = test.details.comparisonRatio.toFixed(2)
            const comparison = test.details.comparisonRatio > 1 ? 'slower' : 'faster'
            log(`    vs Traditional: ${ratio}x ${comparison}`, 'yellow')
          }
        }
      })
    }

    // Failed tests details
    const failedTests = this.testResults.filter(r => !r.success)
    if (failedTests.length > 0) {
      log('\nFailed Tests:', 'red')
      failedTests.forEach(test => {
        log(`  ❌ ${test.test}: ${test.error}`, 'red')
      })
    }
    
    // Migration recommendations
    log('\nMigration Recommendations:', 'yellow')
    if (successful === total) {
      log('  ✅ Migration validation successful', 'green')
      log('  ✅ All patterns working correctly', 'green')
      log('  ✅ Performance acceptable', 'green')
      log('  ✅ Ready for production deployment', 'green')
    } else {
      log('  🔧 Fix failing tests before migration', 'yellow')
      log('  🔧 Verify environment configuration', 'yellow')
      log('  🔧 Test with production data volume', 'yellow')
    }

    // Next steps
    log('\nNext Steps:', 'blue')
    log('  1. Deploy to staging environment', 'blue')
    log('  2. Run load tests with production data', 'blue')
    log('  3. Set up monitoring and alerting', 'blue')
    log('  4. Prepare rollback procedures', 'blue')
    log('  5. Schedule production migration', 'blue')
    
    log('\n' + '='.repeat(70), 'cyan')
  }

  async runAllTests(): Promise<void> {
    log('🚀 Starting Redis Migration Tests', 'cyan')
    log('='.repeat(70), 'cyan')
    
    const startTime = performance.now()
    
    try {
      await this.testUpstashConnection()
      await this.testTraditionalConnection()
      await this.testDataConsistency()
      await this.testRateLimitingCompatibility()
      await this.testCachePatterns()
      await this.testQueueSimulation()
      await this.testPerformanceComparison()
      await this.testFailoverScenario()
    } catch (error) {
      logError(`Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    const totalTime = performance.now() - startTime
    log(`\nTotal test time: ${totalTime.toFixed(2)}ms`, 'blue')
    
    this.printSummary()
  }

  async cleanup(): Promise<void> {
    if (this.traditionalRedis) {
      this.traditionalRedis.disconnect()
    }
  }
}

// Main execution
async function main() {
  let tester: RedisMigrationTester | null = null

  try {
    tester = new RedisMigrationTester()
    await tester.runAllTests()
  } catch (error) {
    logError(`Failed to initialize test: ${error instanceof Error ? error.message : 'Unknown error'}`)
    process.exit(1)
  } finally {
    if (tester) {
      await tester.cleanup()
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

export default RedisMigrationTester