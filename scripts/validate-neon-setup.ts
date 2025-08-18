#!/usr/bin/env tsx

/**
 * Quick Neon Setup Validation Script
 * 
 * Validates Neon PostgreSQL configuration for TrueCheckIA
 * Runs essential checks to ensure production readiness
 */

import { runConnectivityTests, validateNeonUrls } from './test-neon-connectivity'
import { checkDatabaseHealth, checkDatabasePerformance } from '../packages/database/src/health'
import { prisma as db } from '../packages/database/src/index'

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

interface ValidationResult {
  category: string
  checks: Array<{
    name: string
    status: 'pass' | 'fail' | 'warning'
    message: string
    details?: any
  }>
}

async function validateEnvironmentVars(): Promise<ValidationResult> {
  const checks = []
  
  // Check required variables
  const required = ['DATABASE_URL', 'DIRECT_URL']
  for (const varName of required) {
    if (process.env[varName]) {
      // Validate URL format
      try {
        const url = new URL(process.env[varName]!)
        const isNeon = url.hostname.includes('neon.tech') || url.hostname.includes('postgres.neon.tech')
        
        checks.push({
          name: `${varName} format`,
          status: isNeon ? 'pass' : 'warning' as const,
          message: isNeon ? 'Valid Neon URL' : 'URL format valid but not Neon',
          details: {
            host: url.hostname,
            database: url.pathname.slice(1),
            isPooled: url.hostname.includes('pooler'),
            ssl: url.searchParams.get('sslmode') || 'default'
          }
        })
      } catch (error) {
        checks.push({
          name: `${varName} format`,
          status: 'fail',
          message: 'Invalid URL format',
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }
    } else {
      checks.push({
        name: varName,
        status: 'fail',
        message: 'Environment variable not set'
      })
    }
  }
  
  // Check optional variables
  const optional = ['SHADOW_DATABASE_URL']
  for (const varName of optional) {
    if (process.env[varName]) {
      checks.push({
        name: `${varName} (optional)`,
        status: 'pass',
        message: 'Optional variable configured'
      })
    } else {
      checks.push({
        name: `${varName} (optional)`,
        status: 'warning',
        message: 'Optional variable not set - migrations may be slower'
      })
    }
  }
  
  return {
    category: 'Environment Variables',
    checks
  }
}

async function validateConnectivity(): Promise<ValidationResult> {
  const checks = []
  
  try {
    log('\n🔗 Testing database connectivity...', colors.blue)
    const connectivityPassed = await runConnectivityTests()
    
    checks.push({
      name: 'Database Connectivity',
      status: connectivityPassed ? 'pass' : 'fail',
      message: connectivityPassed ? 'All connection tests passed' : 'One or more connection tests failed'
    })
    
  } catch (error) {
    checks.push({
      name: 'Database Connectivity',
      status: 'fail',
      message: 'Connectivity test crashed',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    })
  }
  
  return {
    category: 'Connectivity',
    checks
  }
}

async function validateDatabaseHealth(): Promise<ValidationResult> {
  const checks = []
  
  try {
    const health = await checkDatabaseHealth()
    
    checks.push({
      name: 'Database Health',
      status: health.status === 'healthy' ? 'pass' : 'fail',
      message: health.status === 'healthy' ? `Healthy (${health.latency}ms latency)` : 'Database unhealthy',
      details: health
    })
    
    // Latency check
    if (health.latency) {
      const latencyStatus = health.latency < 100 ? 'pass' : health.latency < 300 ? 'warning' : 'fail'
      checks.push({
        name: 'Connection Latency',
        status: latencyStatus,
        message: `${health.latency}ms ${latencyStatus === 'pass' ? '(excellent)' : latencyStatus === 'warning' ? '(acceptable)' : '(too high)'}`
      })
    }
    
    // Connection count check
    if (health.connectionCount !== undefined) {
      checks.push({
        name: 'Active Connections',
        status: health.connectionCount < 20 ? 'pass' : 'warning',
        message: `${health.connectionCount} active connections`
      })
    }
    
  } catch (error) {
    checks.push({
      name: 'Database Health',
      status: 'fail',
      message: 'Health check failed',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    })
  }
  
  try {
    const performance = await checkDatabasePerformance()
    
    if (performance.status === 'healthy') {
      checks.push({
        name: 'Database Performance',
        status: 'pass',
        message: `Query performance OK (${performance.metrics?.queryTime}ms)`,
        details: performance.metrics
      })
    } else {
      checks.push({
        name: 'Database Performance',
        status: 'fail',
        message: 'Performance test failed',
        details: performance
      })
    }
    
  } catch (error) {
    checks.push({
      name: 'Database Performance',
      status: 'warning',
      message: 'Performance test skipped (no data yet)',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    })
  }
  
  return {
    category: 'Database Health',
    checks
  }
}

async function validateNeonConfiguration(): Promise<ValidationResult> {
  const checks = []
  
  // Check if using pooled connections
  const databaseUrl = process.env.DATABASE_URL
  if (databaseUrl) {
    const isPooled = databaseUrl.includes('pooler') || databaseUrl.includes('pgbouncer=true')
    checks.push({
      name: 'Connection Pooling',
      status: isPooled ? 'pass' : 'warning',
      message: isPooled ? 'Using pooled connections (recommended for serverless)' : 'Direct connections (may hit limits in serverless)'
    })
    
    // Check SSL mode
    const url = new URL(databaseUrl)
    const sslMode = url.searchParams.get('sslmode')
    checks.push({
      name: 'SSL Configuration',
      status: sslMode === 'require' ? 'pass' : 'warning',
      message: `SSL mode: ${sslMode || 'default'} ${sslMode === 'require' ? '(secure)' : '(check security)'}`
    })
    
    // Check timeout settings
    const connectTimeout = url.searchParams.get('connect_timeout')
    checks.push({
      name: 'Connection Timeout',
      status: connectTimeout ? 'pass' : 'warning',
      message: connectTimeout ? `${connectTimeout}s timeout configured` : 'No explicit timeout (using defaults)'
    })
    
    // Check region
    const region = url.hostname.includes('us-east-1') ? 'us-east-1' : 
                  url.hostname.includes('eu-central-1') ? 'eu-central-1' : 'unknown'
    checks.push({
      name: 'Database Region',
      status: region === 'us-east-1' ? 'pass' : 'warning',
      message: `Region: ${region} ${region === 'us-east-1' ? '(optimal for Vercel)' : '(check latency)'}`
    })
  }
  
  return {
    category: 'Neon Configuration',
    checks
  }
}

function printValidationResults(results: ValidationResult[]) {
  log('\n📊 Validation Results', colors.bold)
  
  let totalChecks = 0
  let passedChecks = 0
  let warnings = 0
  let failures = 0
  
  for (const result of results) {
    log(`\n${result.category}:`, colors.bold)
    
    for (const check of result.checks) {
      totalChecks++
      
      const icon = check.status === 'pass' ? '✅' : check.status === 'warning' ? '⚠️' : '❌'
      const color = check.status === 'pass' ? colors.green : check.status === 'warning' ? colors.yellow : colors.red
      
      log(`  ${icon} ${check.name}: ${check.message}`, color)
      
      if (check.details && (check.status === 'fail' || check.status === 'warning')) {
        const detailsStr = typeof check.details === 'object' ? 
          Object.entries(check.details).map(([k, v]) => `${k}: ${v}`).join(', ') :
          String(check.details)
        log(`     Details: ${detailsStr}`, colors.reset)
      }
      
      if (check.status === 'pass') passedChecks++
      else if (check.status === 'warning') warnings++
      else failures++
    }
  }
  
  // Summary
  log('\n📋 Summary', colors.bold)
  log(`Total checks: ${totalChecks}`)
  log(`Passed: ${passedChecks}`, colors.green)
  log(`Warnings: ${warnings}`, warnings > 0 ? colors.yellow : colors.reset)
  log(`Failed: ${failures}`, failures > 0 ? colors.red : colors.reset)
  
  // Overall status
  if (failures === 0 && warnings === 0) {
    log('\n🎉 Perfect! Neon setup is production ready', colors.green)
  } else if (failures === 0) {
    log('\n✅ Good! Setup is functional with minor optimizations needed', colors.yellow)
  } else {
    log('\n❌ Issues found that need to be resolved before production', colors.red)
  }
  
  // Recommendations
  if (warnings > 0 || failures > 0) {
    log('\n💡 Recommendations:', colors.bold)
    
    if (failures > 0) {
      log('  🚨 Fix failed checks before deploying to production', colors.red)
      log('  📖 See docs/neon-setup.md for detailed instructions', colors.blue)
    }
    
    if (warnings > 0) {
      log('  ⚡ Address warnings for optimal performance', colors.yellow)
      log('  🔧 Consider connection pooling and region optimization', colors.yellow)
    }
  }
  
  return failures === 0
}

async function runFullValidation() {
  log('🚀 TrueCheckIA Neon PostgreSQL Validation', colors.bold)
  log('Checking production readiness...', colors.blue)
  
  const validationResults: ValidationResult[] = []
  
  try {
    // Run all validation categories
    validationResults.push(await validateEnvironmentVars())
    validationResults.push(await validateNeonConfiguration())
    validationResults.push(await validateConnectivity())
    validationResults.push(await validateDatabaseHealth())
    
    const success = printValidationResults(validationResults)
    
    if (success) {
      log('\n🎯 Next Steps:', colors.bold)
      log('  1. Configure Upstash Redis (npm run setup:upstash)', colors.blue)
      log('  2. Setup Vercel deployment', colors.blue)
      log('  3. Configure monitoring and alerts', colors.blue)
    }
    
    return success
    
  } catch (error) {
    log(`\n💥 Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, colors.red)
    return false
  }
}

// Main execution
if (require.main === module) {
  runFullValidation()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      log(`\n💥 Validation crashed: ${error.message}`, colors.red)
      console.error(error)
      process.exit(1)
    })
}

export { runFullValidation, validateNeonUrls }