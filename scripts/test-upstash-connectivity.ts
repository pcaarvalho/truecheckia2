#!/usr/bin/env tsx

/**
 * TrueCheckIA - Upstash Connectivity Test Script
 * TAREFA 2: Configuração do Redis Serverless usando Upstash
 * 
 * This script comprehensively tests Upstash Redis connectivity and features
 */

import { Redis } from '@upstash/redis'
import { config } from '@truecheckia/config'
import { performance } from 'perf_hooks'
import { jsonOperations } from '../apps/api/src/lib/serverless-redis'
import { queueSerialize, queueDeserialize } from '../apps/api/src/lib/upstash'

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

class UpstashConnectivityTest {
  private redis: Redis
  private testResults: Array<{ test: string; success: boolean; duration?: number; error?: string }> = []

  constructor() {
    // Initialize Redis with environment variables
    if (!config.upstash.url || !config.upstash.token) {
      throw new Error('Upstash Redis credentials not configured. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN')
    }

    this.redis = new Redis({
      url: config.upstash.url,
      token: config.upstash.token,
    })
  }

  private async measureTime<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now()
    const result = await operation()
    const duration = performance.now() - start
    return { result, duration }
  }

  private recordResult(test: string, success: boolean, duration?: number, error?: string) {
    this.testResults.push({ test, success, duration, error })
    
    if (success) {
      const durationStr = duration ? ` (${duration.toFixed(2)}ms)` : ''
      logSuccess(`${test}${durationStr}`)
    } else {
      logError(`${test}: ${error}`)
    }
  }

  async testBasicConnectivity(): Promise<void> {
    logInfo('Testing basic connectivity...')
    
    try {
      const { result, duration } = await this.measureTime(() => this.redis.ping())
      this.recordResult('Basic PING', true, duration)
      logInfo(`Ping response: ${result}`)
    } catch (error) {
      this.recordResult('Basic PING', false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async testStringOperations(): Promise<void> {
    logInfo('Testing string operations...')
    
    const testKey = 'test:string:connectivity'
    const testValue = {
      timestamp: Date.now(),
      source: 'connectivity-test',
      data: 'Hello Upstash!'
    }

    try {
      // SET operation using jsonOperations
      const { duration: setDuration } = await this.measureTime(() => 
        jsonOperations.setJSON(testKey, testValue, { ex: 60 })
      )
      this.recordResult('String SET', true, setDuration)

      // GET operation using jsonOperations
      const { result: getValue, duration: getDuration } = await this.measureTime(() => 
        jsonOperations.getJSON(testKey)
      )
      
      const isMatch = getValue && 
        getValue.timestamp === testValue.timestamp &&
        getValue.source === testValue.source &&
        getValue.data === testValue.data
      
      if (isMatch) {
        this.recordResult('String GET', true, getDuration)
      } else {
        this.recordResult('String GET', false, getDuration, `Value mismatch: expected ${JSON.stringify(testValue)}, got ${JSON.stringify(getValue)}`)
      }

      // EXISTS operation
      const { result: exists, duration: existsDuration } = await this.measureTime(() => 
        this.redis.exists(testKey)
      )
      this.recordResult('String EXISTS', exists === 1, existsDuration)

      // DEL operation
      const { result: deleted, duration: delDuration } = await this.measureTime(() => 
        this.redis.del(testKey)
      )
      this.recordResult('String DEL', deleted === 1, delDuration)

    } catch (error) {
      this.recordResult('String Operations', false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async testHashOperations(): Promise<void> {
    logInfo('Testing hash operations...')
    
    const testKey = 'test:hash:connectivity'
    const testData = {
      userId: '12345',
      email: 'test@truecheckia.com',
      plan: 'pro',
      credits: '100',
      timestamp: Date.now().toString()
    }

    try {
      // HSET operation using jsonOperations
      const { duration: hsetDuration } = await this.measureTime(() => 
        jsonOperations.hsetJSON(testKey, testData)
      )
      this.recordResult('Hash HSET', true, hsetDuration)

      // HGET operation using jsonOperations
      const { result: email, duration: hgetDuration } = await this.measureTime(() => 
        jsonOperations.hgetJSON(testKey, 'email')
      )
      this.recordResult('Hash HGET', email === testData.email, hgetDuration)

      // HGETALL operation using jsonOperations
      const { result: allData, duration: hgetallDuration } = await this.measureTime(() => 
        jsonOperations.hgetallJSON(testKey)
      )
      
      if (!allData) {
        this.recordResult('Hash HGETALL', false, hgetallDuration, 'No data returned')
      } else {
        // Check that all expected fields exist and have the correct values
        // Allow for automatic type conversion (string numbers to actual numbers)
        const isCorrect = Object.keys(testData).every(key => {
          const expected = testData[key as keyof typeof testData]
          const actual = allData[key]
          
          // Handle automatic number conversion from JSON
          if (typeof expected === 'string' && !isNaN(Number(expected))) {
            return Number(expected) === actual || expected === actual
          }
          
          return expected === actual
        })
        this.recordResult('Hash HGETALL', isCorrect, hgetallDuration)
      }

      // HDEL operation
      const { result: deleted, duration: hdelDuration } = await this.measureTime(() => 
        this.redis.hdel(testKey, 'email', 'plan')
      )
      this.recordResult('Hash HDEL', deleted === 2, hdelDuration)

      // Cleanup
      await this.redis.del(testKey)

    } catch (error) {
      this.recordResult('Hash Operations', false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async testListOperations(): Promise<void> {
    logInfo('Testing list operations...')
    
    const testKey = 'test:list:connectivity'
    const testItems = ['item1', 'item2', 'item3']

    try {
      // LPUSH operation using jsonOperations
      const { result: pushed, duration: lpushDuration } = await this.measureTime(() => 
        jsonOperations.lpushJSON(testKey, ...testItems)
      )
      this.recordResult('List LPUSH', pushed === testItems.length, lpushDuration)

      // LLEN operation
      const { result: length, duration: llenDuration } = await this.measureTime(() => 
        this.redis.llen(testKey)
      )
      this.recordResult('List LLEN', length === testItems.length, llenDuration)

      // RPOP operation using jsonOperations
      const { result: popped, duration: rpopDuration } = await this.measureTime(() => 
        jsonOperations.rpopJSON(testKey)
      )
      this.recordResult('List RPOP', popped === 'item1', rpopDuration)

      // Cleanup
      await this.redis.del(testKey)

    } catch (error) {
      this.recordResult('List Operations', false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async testSetOperations(): Promise<void> {
    logInfo('Testing set operations...')
    
    const testKey = 'test:set:connectivity'
    const testMembers = ['member1', 'member2', 'member3']

    try {
      // SADD operation
      const { result: added, duration: saddDuration } = await this.measureTime(() => 
        this.redis.sadd(testKey, ...testMembers)
      )
      this.recordResult('Set SADD', added === testMembers.length, saddDuration)

      // SCARD operation
      const { result: cardinality, duration: scardDuration } = await this.measureTime(() => 
        this.redis.scard(testKey)
      )
      this.recordResult('Set SCARD', cardinality === testMembers.length, scardDuration)

      // SISMEMBER operation
      const { result: isMember, duration: sismemberDuration } = await this.measureTime(() => 
        this.redis.sismember(testKey, 'member2')
      )
      this.recordResult('Set SISMEMBER', isMember === 1, sismemberDuration)

      // Cleanup
      await this.redis.del(testKey)

    } catch (error) {
      this.recordResult('Set Operations', false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async testSortedSetOperations(): Promise<void> {
    logInfo('Testing sorted set operations...')
    
    const testKey = 'test:zset:connectivity'
    const testData = [
      { score: 1, member: 'first' },
      { score: 2, member: 'second' },
      { score: 3, member: 'third' }
    ]

    try {
      // ZADD operation
      const { result: added, duration: zaddDuration } = await this.measureTime(() => 
        this.redis.zadd(testKey, ...testData)
      )
      this.recordResult('SortedSet ZADD', added === testData.length, zaddDuration)

      // ZCARD operation
      const { result: cardinality, duration: zcardDuration } = await this.measureTime(() => 
        this.redis.zcard(testKey)
      )
      this.recordResult('SortedSet ZCARD', cardinality === testData.length, zcardDuration)

      // ZRANGE operation
      const { result: range, duration: zrangeDuration } = await this.measureTime(() => 
        this.redis.zrange(testKey, 0, -1)
      )
      this.recordResult('SortedSet ZRANGE', range.length === testData.length, zrangeDuration)

      // Cleanup
      await this.redis.del(testKey)

    } catch (error) {
      this.recordResult('SortedSet Operations', false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async testTTLOperations(): Promise<void> {
    logInfo('Testing TTL operations...')
    
    const testKey = 'test:ttl:connectivity'
    const testValue = 'ttl-test-value'
    const ttlSeconds = 30

    try {
      // SET with TTL
      const { duration: setDuration } = await this.measureTime(() => 
        this.redis.set(testKey, testValue, { ex: ttlSeconds })
      )
      this.recordResult('TTL SET', true, setDuration)

      // Check TTL
      const { result: ttl, duration: ttlDuration } = await this.measureTime(() => 
        this.redis.ttl(testKey)
      )
      this.recordResult('TTL Check', ttl > 0 && ttl <= ttlSeconds, ttlDuration)

      // EXPIRE operation
      const { result: expired, duration: expireDuration } = await this.measureTime(() => 
        this.redis.expire(testKey, 60)
      )
      this.recordResult('TTL EXPIRE', expired === 1, expireDuration)

      // Cleanup
      await this.redis.del(testKey)

    } catch (error) {
      this.recordResult('TTL Operations', false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async testRateLimitingPattern(): Promise<void> {
    logInfo('Testing rate limiting pattern...')
    
    const userId = 'test-user-123'
    const rateLimitKey = `rate:limit:${userId}`
    const maxRequests = 5
    const windowSeconds = 60

    try {
      let allowedRequests = 0
      
      // Simulate multiple requests
      for (let i = 0; i < maxRequests + 2; i++) {
        const { result: current, duration } = await this.measureTime(async () => {
          const current = await this.redis.incr(rateLimitKey)
          if (current === 1) {
            await this.redis.expire(rateLimitKey, windowSeconds)
          }
          return current
        })
        
        if (current <= maxRequests) {
          allowedRequests++
        }
        
        // Log first increment duration as representative
        if (i === 0) {
          this.recordResult('Rate Limit INCR', true, duration)
        }
      }
      
      const correctlyLimited = allowedRequests === maxRequests
      this.recordResult('Rate Limiting Logic', correctlyLimited)
      
      if (!correctlyLimited) {
        logWarning(`Expected ${maxRequests} allowed requests, got ${allowedRequests}`)
      }

      // Cleanup
      await this.redis.del(rateLimitKey)

    } catch (error) {
      this.recordResult('Rate Limiting', false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async testCachePattern(): Promise<void> {
    logInfo('Testing cache pattern...')
    
    const cacheKey = 'cache:test:user:12345'
    const cacheData = {
      userId: '12345',
      username: 'testuser',
      email: 'test@truecheckia.com',
      plan: 'pro',
      credits: 100,
      lastLogin: new Date().toISOString(),
      metadata: {
        loginCount: 42,
        preferences: {
          theme: 'dark',
          language: 'pt-BR'
        }
      }
    }

    try {
      // Cache SET using jsonOperations
      const { duration: setDuration } = await this.measureTime(() => 
        jsonOperations.setJSON(cacheKey, cacheData, { ex: 3600 })
      )
      this.recordResult('Cache SET', true, setDuration)

      // Cache GET using jsonOperations
      const { result: cached, duration: getDuration } = await this.measureTime(() => 
        jsonOperations.getJSON(cacheKey)
      )
      
      const isCorrect = cached && 
        cached.userId === cacheData.userId &&
        cached.email === cacheData.email &&
        cached.metadata?.preferences?.theme === cacheData.metadata.preferences.theme
      
      this.recordResult('Cache Pattern', !!isCorrect, getDuration)

      // Cache invalidation
      const { result: deleted, duration: delDuration } = await this.measureTime(() => 
        this.redis.del(cacheKey)
      )
      this.recordResult('Cache Invalidation', deleted === 1, delDuration)

    } catch (error) {
      this.recordResult('Cache Pattern', false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async testPerformanceBenchmark(): Promise<void> {
    logInfo('Running performance benchmark...')
    
    const operations = 50 // Moderate load for connectivity test
    const testPrefix = 'benchmark:test'

    try {
      // Concurrent SET operations
      const setStart = performance.now()
      const setPromises = Array.from({ length: operations }, (_, i) =>
        this.redis.set(`${testPrefix}:${i}`, JSON.stringify({
          index: i,
          timestamp: Date.now(),
          data: `test-data-${i}`
        }), { ex: 300 })
      )
      await Promise.all(setPromises)
      const setDuration = performance.now() - setStart
      
      this.recordResult('Concurrent SET Operations', true, setDuration)
      logInfo(`SET: ${operations} operations in ${setDuration.toFixed(2)}ms (${(setDuration / operations).toFixed(2)}ms avg)`)

      // Concurrent GET operations
      const getStart = performance.now()
      const getPromises = Array.from({ length: operations }, (_, i) =>
        this.redis.get(`${testPrefix}:${i}`)
      )
      const results = await Promise.all(getPromises)
      const getDuration = performance.now() - getStart
      
      const allSuccess = results.every(result => result !== null)
      this.recordResult('Concurrent GET Operations', allSuccess, getDuration)
      logInfo(`GET: ${operations} operations in ${getDuration.toFixed(2)}ms (${(getDuration / operations).toFixed(2)}ms avg)`)

      // Cleanup
      const cleanupStart = performance.now()
      const delPromises = Array.from({ length: operations }, (_, i) =>
        this.redis.del(`${testPrefix}:${i}`)
      )
      await Promise.all(delPromises)
      const cleanupDuration = performance.now() - cleanupStart
      
      this.recordResult('Concurrent DEL Operations', true, cleanupDuration)
      logInfo(`DEL: ${operations} operations in ${cleanupDuration.toFixed(2)}ms (${(cleanupDuration / operations).toFixed(2)}ms avg)`)

      // Performance analysis
      const totalDuration = setDuration + getDuration + cleanupDuration
      const totalOperations = operations * 3
      const avgOperationTime = totalDuration / totalOperations
      
      logInfo(`Total: ${totalOperations} operations in ${totalDuration.toFixed(2)}ms`)
      logInfo(`Average: ${avgOperationTime.toFixed(2)}ms per operation`)
      
      if (avgOperationTime > 1000) {
        logWarning('Performance is slow (>1s per operation)')
      } else if (avgOperationTime > 500) {
        logWarning('Performance could be better (>500ms per operation)')
      } else {
        logSuccess('Performance looks good!')
      }

    } catch (error) {
      this.recordResult('Performance Benchmark', false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async testQueueSimulation(): Promise<void> {
    logInfo('Testing queue simulation pattern...')
    
    const queueName = 'test-queue'
    const jobData = {
      id: 'job-' + Date.now(),
      type: 'analysis',
      payload: {
        text: 'This is a test text for analysis',
        userId: 'user-123'
      },
      timestamp: Date.now()
    }

    try {
      // Add job to queue using proper serialization
      const { duration: addDuration } = await this.measureTime(() => 
        jsonOperations.lpushJSON(`queue:${queueName}:pending`, jobData)
      )
      this.recordResult('Queue Job Add', true, addDuration)

      // Check queue length
      const { result: queueLength, duration: lenDuration } = await this.measureTime(() => 
        this.redis.llen(`queue:${queueName}:pending`)
      )
      this.recordResult('Queue Length Check', queueLength === 1, lenDuration)

      // Process job (pop from queue) using proper deserialization
      const { result: job, duration: popDuration } = await this.measureTime(() => 
        jsonOperations.rpopJSON(`queue:${queueName}:pending`)
      )
      
      const jobCorrect = job && job.id === jobData.id
      this.recordResult('Queue Simulation', !!jobCorrect, popDuration)

      // Store job result using jsonOperations
      const result = { status: 'completed', result: 'Test passed', completedAt: Date.now() }
      const { duration: resultDuration } = await this.measureTime(() => 
        jsonOperations.hsetJSON(`job:${jobData.id}`, result)
      )
      this.recordResult('Queue Job Result', true, resultDuration)

      // Cleanup
      await this.redis.del(`job:${jobData.id}`)

    } catch (error) {
      this.recordResult('Queue Simulation', false, undefined, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  printSummary(): void {
    log('\n' + '='.repeat(60), 'cyan')
    log('UPSTASH CONNECTIVITY TEST SUMMARY', 'cyan')
    log('='.repeat(60), 'cyan')
    
    const successful = this.testResults.filter(r => r.success).length
    const total = this.testResults.length
    const successRate = (successful / total * 100).toFixed(1)
    
    log(`\nOverall Results: ${successful}/${total} tests passed (${successRate}%)`, 'bright')
    
    if (successful === total) {
      logSuccess('🎉 All tests passed! Upstash is ready for production.')
    } else if (successful > total * 0.8) {
      logWarning('⚠️  Most tests passed, but some issues detected.')
    } else {
      logError('❌ Multiple test failures detected. Check configuration.')
    }
    
    // Performance summary
    const performanceTests = this.testResults.filter(r => r.duration !== undefined)
    if (performanceTests.length > 0) {
      const avgDuration = performanceTests.reduce((sum, r) => sum + (r.duration || 0), 0) / performanceTests.length
      log(`\nAverage operation time: ${avgDuration.toFixed(2)}ms`, 'blue')
      
      if (avgDuration < 100) {
        logSuccess('Excellent performance!')
      } else if (avgDuration < 500) {
        logInfo('Good performance')
      } else {
        logWarning('Performance could be optimized')
      }
    }
    
    // Failed tests details
    const failedTests = this.testResults.filter(r => !r.success)
    if (failedTests.length > 0) {
      log('\nFailed Tests:', 'red')
      failedTests.forEach(test => {
        log(`  ❌ ${test.test}: ${test.error}`, 'red')
      })
    }
    
    // Recommendations
    log('\nRecommendations:', 'yellow')
    if (successful === total) {
      log('  ✅ Ready for production deployment', 'green')
      log('  ✅ Consider setting up monitoring', 'green')
      log('  ✅ Configure proper backup strategy', 'green')
    } else {
      log('  🔧 Fix failing tests before production', 'yellow')
      log('  🔧 Verify environment variables', 'yellow')
      log('  🔧 Check Upstash dashboard for issues', 'yellow')
    }
    
    log('\n' + '='.repeat(60), 'cyan')
  }

  async runAllTests(): Promise<void> {
    log('🚀 Starting Upstash Redis Connectivity Tests', 'cyan')
    log('='.repeat(60), 'cyan')
    
    const startTime = performance.now()
    
    try {
      await this.testBasicConnectivity()
      await this.testStringOperations()
      await this.testHashOperations()
      await this.testListOperations()
      await this.testSetOperations()
      await this.testSortedSetOperations()
      await this.testTTLOperations()
      await this.testRateLimitingPattern()
      await this.testCachePattern()
      await this.testQueueSimulation()
      await this.testPerformanceBenchmark()
    } catch (error) {
      logError(`Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    const totalTime = performance.now() - startTime
    log(`\nTotal test time: ${totalTime.toFixed(2)}ms`, 'blue')
    
    this.printSummary()
  }
}

// Main execution
async function main() {
  try {
    const tester = new UpstashConnectivityTest()
    await tester.runAllTests()
  } catch (error) {
    logError(`Failed to initialize test: ${error instanceof Error ? error.message : 'Unknown error'}`)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    logError(`Unhandled error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    process.exit(1)
  })
}

export default UpstashConnectivityTest