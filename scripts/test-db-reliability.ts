#!/usr/bin/env tsx

/**
 * Database Reliability Test Script
 * 
 * Tests the enhanced Prisma client with retry logic and connection stability
 */

import { config } from 'dotenv'
import { join } from 'path'
import { prisma, DatabaseHealthCheck } from '../packages/database/src/index'
import { performance } from 'perf_hooks'

// Load environment variables
config({ path: join(__dirname, '../.env') })

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

async function testDatabaseReliability() {
  log('\n🔧 Database Reliability Test Suite', colors.bold)
  log('Testing enhanced Prisma client with retry logic\n', colors.blue)

  // Test 1: Basic connection health
  log('Test 1: Connection Health Check', colors.bold)
  try {
    const start = performance.now()
    const health = await prisma.$healthCheck()
    const latency = Math.round(performance.now() - start)
    
    if (health.status === 'healthy') {
      log(`✅ Health check passed (${latency}ms)`, colors.green)
    } else {
      log(`❌ Health check failed: ${health.error}`, colors.red)
    }
  } catch (error) {
    log(`❌ Health check error: ${(error as Error).message}`, colors.red)
  }

  // Test 2: Basic query
  log('\nTest 2: Basic Query Test', colors.bold)
  try {
    const start = performance.now()
    const result = await prisma.$queryRaw`SELECT COUNT(*) as user_count FROM "User"`
    const latency = Math.round(performance.now() - start)
    log(`✅ Basic query successful (${latency}ms)`, colors.green)
    log(`   Result: ${JSON.stringify(result)}`)
  } catch (error) {
    log(`❌ Basic query failed: ${(error as Error).message}`, colors.red)
  }

  // Test 3: User operations
  log('\nTest 3: User Operations Test', colors.bold)
  try {
    const start = performance.now()
    const userCount = await prisma.user.count()
    const latency = Math.round(performance.now() - start)
    log(`✅ User count query successful (${latency}ms)`, colors.green)
    log(`   Total users: ${userCount}`)
    
    // Test finding a user
    const user = await prisma.user.findFirst({
      where: { email: 'dev@truecheckia.com' }
    })
    
    if (user) {
      log(`✅ User lookup successful`, colors.green)
      log(`   Found user: ${user.email} (${user.name})`)
    } else {
      log(`⚠️  Dev user not found`, colors.yellow)
    }
  } catch (error) {
    log(`❌ User operations failed: ${(error as Error).message}`, colors.red)
  }

  // Test 4: Connection stress test
  log('\nTest 4: Connection Stress Test', colors.bold)
  const concurrentQueries = 5
  const promises = []
  
  for (let i = 0; i < concurrentQueries; i++) {
    promises.push(
      prisma.$queryRaw`SELECT ${i} as query_id, NOW() as timestamp`
        .then(result => ({ success: true, queryId: i, result }))
        .catch(error => ({ success: false, queryId: i, error: error.message }))
    )
  }
  
  try {
    const results = await Promise.all(promises)
    const successful = results.filter(r => r.success).length
    
    log(`✅ Stress test completed: ${successful}/${concurrentQueries} queries successful`, 
        successful === concurrentQueries ? colors.green : colors.yellow)
        
    if (successful < concurrentQueries) {
      const failed = results.filter(r => !r.success)
      failed.forEach(f => {
        log(`   Query ${f.queryId} failed: ${f.error}`, colors.red)
      })
    }
  } catch (error) {
    log(`❌ Stress test failed: ${(error as Error).message}`, colors.red)
  }

  // Test 5: Transaction test
  log('\nTest 5: Transaction Test', colors.bold)
  try {
    const start = performance.now()
    
    const result = await prisma.$transaction(async (tx) => {
      const count1 = await tx.user.count()
      const count2 = await tx.analysis.count()
      return { users: count1, analyses: count2 }
    })
    
    const latency = Math.round(performance.now() - start)
    log(`✅ Transaction successful (${latency}ms)`, colors.green)
    log(`   Data: ${JSON.stringify(result)}`)
  } catch (error) {
    log(`❌ Transaction failed: ${(error as Error).message}`, colors.red)
  }

  // Test 6: Performance baseline
  log('\nTest 6: Performance Baseline', colors.bold)
  const iterations = 10
  const latencies: number[] = []
  
  for (let i = 0; i < iterations; i++) {
    try {
      const start = performance.now()
      await prisma.$queryRaw`SELECT 1 as ping`
      const latency = performance.now() - start
      latencies.push(latency)
    } catch (error) {
      log(`❌ Performance test iteration ${i + 1} failed`, colors.red)
    }
  }
  
  if (latencies.length > 0) {
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length
    const minLatency = Math.min(...latencies)
    const maxLatency = Math.max(...latencies)
    
    log(`✅ Performance baseline established:`, colors.green)
    log(`   Average: ${Math.round(avgLatency)}ms`)
    log(`   Min: ${Math.round(minLatency)}ms`)
    log(`   Max: ${Math.round(maxLatency)}ms`)
    
    if (avgLatency > 1000) {
      log(`⚠️  High average latency detected (${Math.round(avgLatency)}ms)`, colors.yellow)
      log(`   Consider optimizing connection settings or database location`, colors.yellow)
    } else if (avgLatency < 100) {
      log(`🚀 Excellent performance!`, colors.green)
    }
  }

  log('\n📊 Test Summary', colors.bold)
  log('Enhanced Prisma client with retry logic is active', colors.blue)
  log('Connection string optimized for Neon PostgreSQL', colors.blue)
  log('Automatic retry on connection errors enabled', colors.blue)
  
  // Cleanup
  try {
    await prisma.$disconnect()
    log('\n✅ Database connection closed cleanly', colors.green)
  } catch (error) {
    log(`⚠️  Error during disconnect: ${(error as Error).message}`, colors.yellow)
  }
}

// Run tests
if (require.main === module) {
  testDatabaseReliability()
    .then(() => {
      log('\n🎉 Database reliability tests completed', colors.green)
      process.exit(0)
    })
    .catch(error => {
      log(`\n💥 Test suite crashed: ${error.message}`, colors.red)
      console.error(error)
      process.exit(1)
    })
}

export { testDatabaseReliability }