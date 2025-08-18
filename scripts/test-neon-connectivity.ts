#!/usr/bin/env tsx

/**
 * Neon PostgreSQL Connectivity Test Script
 * 
 * Tests connection strings for different Neon environments and configurations
 * Used for validating setup during deployment to Vercel
 */

import { config } from 'dotenv'
import { join } from 'path'
import { PrismaClient } from '@prisma/client'
import { performance } from 'perf_hooks'

// Load environment variables
config({ path: join(__dirname, '../.env') })

interface ConnectionTest {
  name: string
  url: string
  description: string
}

interface TestResult {
  name: string
  success: boolean
  latency?: number
  error?: string
  metadata?: any
}

// Color codes for terminal output
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

async function testConnection(test: ConnectionTest): Promise<TestResult> {
  const start = performance.now()
  
  try {
    // Create temporary Prisma client with the test URL
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: test.url
        }
      },
      log: ['error']
    })

    // Test basic connectivity
    await prisma.$queryRaw`SELECT 1 as test`
    
    // Test database operations
    const userCount = await prisma.user.count()
    
    // Get connection pool info
    const poolInfo = await prisma.$queryRaw<Array<{
      total_conns: number
      active_conns: number
      idle_conns: number
    }>>`
      SELECT 
        COUNT(*) as total_conns,
        COUNT(*) FILTER (WHERE state = 'active') as active_conns,
        COUNT(*) FILTER (WHERE state = 'idle') as idle_conns
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `

    await prisma.$disconnect()
    
    const latency = performance.now() - start
    
    return {
      name: test.name,
      success: true,
      latency: Math.round(latency),
      metadata: {
        userCount,
        poolInfo: poolInfo[0] || {},
        database: test.url.includes('pooler') ? 'pooled' : 'direct'
      }
    }
    
  } catch (error) {
    return {
      name: test.name,
      success: false,
      latency: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function validateNeonUrls() {
  const requiredVars = ['DATABASE_URL', 'DIRECT_URL']
  const optionalVars = ['SHADOW_DATABASE_URL']
  
  log('\n🔍 Validating Environment Variables', colors.bold)
  
  const missing: string[] = []
  const present: string[] = []
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      present.push(varName)
      log(`✅ ${varName}: configured`, colors.green)
    } else {
      missing.push(varName)
      log(`❌ ${varName}: missing`, colors.red)
    }
  })
  
  optionalVars.forEach(varName => {
    if (process.env[varName]) {
      present.push(varName)
      log(`✅ ${varName}: configured (optional)`, colors.blue)
    } else {
      log(`⚠️  ${varName}: not set (optional)`, colors.yellow)
    }
  })
  
  if (missing.length > 0) {
    log(`\n❌ Missing required environment variables: ${missing.join(', ')}`, colors.red)
    return false
  }
  
  return true
}

function analyzeNeonUrl(url: string): any {
  try {
    const parsed = new URL(url)
    
    return {
      host: parsed.hostname,
      database: parsed.pathname.slice(1),
      isPooled: parsed.hostname.includes('pooler'),
      region: parsed.hostname.includes('us-east-1') ? 'us-east-1' : 
              parsed.hostname.includes('eu-central-1') ? 'eu-central-1' : 
              'unknown',
      sslMode: parsed.searchParams.get('sslmode') || 'require',
      pgbouncer: parsed.searchParams.get('pgbouncer') === 'true'
    }
  } catch (error) {
    return { error: 'Invalid URL format' }
  }
}

async function runConnectivityTests() {
  log('\n🚀 Starting Neon PostgreSQL Connectivity Tests', colors.bold)
  
  // Validate environment variables first
  const envValid = await validateNeonUrls()
  if (!envValid) {
    process.exit(1)
  }
  
  const tests: ConnectionTest[] = []
  
  // Add DATABASE_URL test (pooled connection)
  if (process.env.DATABASE_URL) {
    tests.push({
      name: 'DATABASE_URL (Pooled)',
      url: process.env.DATABASE_URL,
      description: 'Main pooled connection for application'
    })
  }
  
  // Add DIRECT_URL test (direct connection)
  if (process.env.DIRECT_URL) {
    tests.push({
      name: 'DIRECT_URL (Direct)',
      url: process.env.DIRECT_URL,
      description: 'Direct connection for migrations'
    })
  }
  
  // Add SHADOW_DATABASE_URL test if available
  if (process.env.SHADOW_DATABASE_URL) {
    tests.push({
      name: 'SHADOW_DATABASE_URL',
      url: process.env.SHADOW_DATABASE_URL,
      description: 'Shadow database for schema diffing'
    })
  }
  
  log('\n📊 Connection URL Analysis', colors.bold)
  tests.forEach(test => {
    const analysis = analyzeNeonUrl(test.url)
    log(`\n${test.name}:`)
    log(`  Host: ${analysis.host || 'N/A'}`)
    log(`  Database: ${analysis.database || 'N/A'}`)
    log(`  Region: ${analysis.region || 'N/A'}`)
    log(`  Pooled: ${analysis.isPooled ? 'Yes' : 'No'}`)
    log(`  PgBouncer: ${analysis.pgbouncer ? 'Yes' : 'No'}`)
  })
  
  log('\n🧪 Running Connection Tests', colors.bold)
  
  const results: TestResult[] = []
  
  for (const test of tests) {
    log(`\nTesting ${test.name}...`)
    const result = await testConnection(test)
    results.push(result)
    
    if (result.success) {
      log(`✅ ${test.name}: Connected successfully (${result.latency}ms)`, colors.green)
      if (result.metadata) {
        log(`   Users in DB: ${result.metadata.userCount}`)
        log(`   Connection type: ${result.metadata.database}`)
        if (result.metadata.poolInfo.total_conns !== undefined) {
          log(`   Pool connections: ${result.metadata.poolInfo.total_conns} total, ${result.metadata.poolInfo.active_conns} active`)
        }
      }
    } else {
      log(`❌ ${test.name}: Failed`, colors.red)
      log(`   Error: ${result.error}`, colors.red)
      log(`   Time to failure: ${result.latency}ms`)
    }
  }
  
  // Summary
  log('\n📋 Test Summary', colors.bold)
  const successful = results.filter(r => r.success).length
  const total = results.length
  
  if (successful === total) {
    log(`✅ All ${total} tests passed!`, colors.green)
    log('🎉 Neon PostgreSQL setup is working correctly', colors.green)
  } else {
    log(`❌ ${total - successful} out of ${total} tests failed`, colors.red)
    log('🚨 Please check your Neon configuration', colors.red)
  }
  
  // Performance recommendations
  const avgLatency = results
    .filter(r => r.success && r.latency)
    .reduce((acc, r) => acc + (r.latency || 0), 0) / results.filter(r => r.success).length
  
  if (avgLatency > 0) {
    log(`\n⚡ Average connection latency: ${Math.round(avgLatency)}ms`)
    
    if (avgLatency > 500) {
      log('⚠️  High latency detected. Consider:', colors.yellow)
      log('   - Using a closer Neon region', colors.yellow)
      log('   - Optimizing connection pooling', colors.yellow)
      log('   - Enabling connection caching', colors.yellow)
    } else if (avgLatency < 100) {
      log('🚀 Excellent connection performance!', colors.green)
    }
  }
  
  return successful === total
}

// Main execution
if (require.main === module) {
  runConnectivityTests()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      log(`\n💥 Test runner crashed: ${error.message}`, colors.red)
      console.error(error)
      process.exit(1)
    })
}

export { runConnectivityTests, validateNeonUrls }