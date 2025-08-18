#!/usr/bin/env tsx

/**
 * TrueCheckIA - Redis Setup Diagnostic Script
 * TAREFA 2: Configuração do Redis Serverless usando Upstash
 * 
 * Script de diagnóstico completo para troubleshooting
 */

import { Redis as UpstashRedis } from '@upstash/redis'
import { config } from '@truecheckia/config'
import { performance } from 'perf_hooks'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

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

function logSection(title: string) {
  log(`\n${'='.repeat(60)}`, 'cyan')
  log(`${title}`, 'cyan')
  log(`${'='.repeat(60)}`, 'cyan')
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

interface DiagnosticResult {
  section: string
  checks: Array<{
    name: string
    status: 'pass' | 'fail' | 'warning'
    message: string
    details?: any
  }>
}

class RedisSetupDiagnostic {
  private results: DiagnosticResult[] = []
  private upstash: UpstashRedis | null = null

  constructor() {
    try {
      if (config.upstash.url && config.upstash.token) {
        this.upstash = new UpstashRedis({
          url: config.upstash.url,
          token: config.upstash.token,
        })
      }
    } catch (error) {
      // Will be handled in environment check
    }
  }

  private addResult(section: string, name: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any) {
    let sectionResult = this.results.find(r => r.section === section)
    if (!sectionResult) {
      sectionResult = { section, checks: [] }
      this.results.push(sectionResult)
    }
    
    sectionResult.checks.push({ name, status, message, details })
    
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️'
    const color = status === 'pass' ? 'green' : status === 'fail' ? 'red' : 'yellow'
    log(`  ${icon} ${name}: ${message}`, color)
  }

  async checkEnvironment(): Promise<void> {
    logSection('ENVIRONMENT VARIABLES')
    
    // Required variables
    const requiredVars = [
      'DATABASE_URL',
      'OPENAI_API_KEY', 
      'JWT_SECRET',
      'JWT_REFRESH_SECRET'
    ]
    
    for (const varName of requiredVars) {
      const value = process.env[varName]
      if (value) {
        this.addResult('Environment', varName, 'pass', 'Configured', { 
          length: value.length,
          masked: value.substring(0, 10) + '...' 
        })
      } else {
        this.addResult('Environment', varName, 'fail', 'Missing required variable')
      }
    }
    
    // Serverless variables
    const serverlessVars = [
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN'
    ]
    
    for (const varName of serverlessVars) {
      const value = process.env[varName]
      if (value) {
        this.addResult('Environment', varName, 'pass', 'Configured', {
          length: value.length,
          masked: value.substring(0, 20) + '...'
        })
      } else {
        this.addResult('Environment', varName, 'fail', 'Missing serverless variable')
      }
    }
    
    // Optional variables
    const optionalVars = [
      'CRON_SECRET',
      'WEBHOOK_SECRET',
      'FORCE_SERVERLESS'
    ]
    
    for (const varName of optionalVars) {
      const value = process.env[varName]
      if (value) {
        this.addResult('Environment', varName, 'pass', 'Configured', { value })
      } else {
        this.addResult('Environment', varName, 'warning', 'Optional variable not set')
      }
    }
    
    // Environment mode detection
    const nodeEnv = process.env.NODE_ENV
    const forceServerless = process.env.FORCE_SERVERLESS === 'true'
    const isServerless = nodeEnv === 'production' || forceServerless
    
    this.addResult('Environment', 'Mode Detection', 'pass', 
      `Running in ${isServerless ? 'serverless' : 'traditional'} mode`, {
        NODE_ENV: nodeEnv,
        FORCE_SERVERLESS: forceServerless,
        detected: isServerless ? 'serverless' : 'traditional'
      })
  }

  async checkFileStructure(): Promise<void> {
    logSection('FILE STRUCTURE')
    
    const criticalFiles = [
      { path: 'package.json', required: true },
      { path: 'apps/api/src/lib/queue-adapter.ts', required: true },
      { path: 'apps/api/src/lib/upstash.ts', required: true },
      { path: 'apps/api/src/lib/serverless-redis.ts', required: true },
      { path: 'apps/api/src/queues/serverless-index.ts', required: true },
      { path: 'vercel.json', required: false },
      { path: '.env', required: false },
    ]
    
    for (const file of criticalFiles) {
      const fullPath = resolve(process.cwd(), file.path)
      const exists = existsSync(fullPath)
      
      if (exists) {
        try {
          const stats = readFileSync(fullPath, 'utf8')
          this.addResult('File Structure', file.path, 'pass', 'File exists', {
            size: stats.length,
            lines: stats.split('\n').length
          })
        } catch (error) {
          this.addResult('File Structure', file.path, 'warning', 'File exists but cannot read')
        }
      } else {
        const status = file.required ? 'fail' : 'warning'
        const message = file.required ? 'Required file missing' : 'Optional file missing'
        this.addResult('File Structure', file.path, status, message)
      }
    }
    
    // Check scripts directory
    const scriptsDir = resolve(process.cwd(), 'scripts')
    if (existsSync(scriptsDir)) {
      this.addResult('File Structure', 'scripts/', 'pass', 'Scripts directory exists')
    } else {
      this.addResult('File Structure', 'scripts/', 'warning', 'Scripts directory missing')
    }
  }

  async checkUpstashConnectivity(): Promise<void> {
    logSection('UPSTASH CONNECTIVITY')
    
    if (!this.upstash) {
      this.addResult('Upstash', 'Initialization', 'fail', 'Cannot initialize Upstash client')
      return
    }
    
    try {
      // Basic ping test
      const start = performance.now()
      const pingResult = await this.upstash.ping()
      const pingTime = performance.now() - start
      
      this.addResult('Upstash', 'Ping Test', 'pass', `${pingTime.toFixed(2)}ms`, {
        response: pingResult,
        latency: pingTime
      })
      
      // Basic operations test
      const testKey = 'diagnostic:test:' + Date.now()
      const testData = { timestamp: Date.now(), test: true }
      
      // SET test
      const setStart = performance.now()
      await this.upstash.set(testKey, JSON.stringify(testData), { ex: 60 })
      const setTime = performance.now() - setStart
      
      this.addResult('Upstash', 'SET Operation', 'pass', `${setTime.toFixed(2)}ms`, {
        latency: setTime
      })
      
      // GET test
      const getStart = performance.now()
      const retrieved = await this.upstash.get(testKey)
      const getTime = performance.now() - getStart
      
      const dataCorrect = retrieved && JSON.parse(retrieved as string).test === true
      this.addResult('Upstash', 'GET Operation', dataCorrect ? 'pass' : 'fail', 
        `${getTime.toFixed(2)}ms`, {
          latency: getTime,
          dataCorrect
        })
      
      // DEL test
      const delStart = performance.now()
      const deleted = await this.upstash.del(testKey)
      const delTime = performance.now() - delStart
      
      this.addResult('Upstash', 'DEL Operation', deleted === 1 ? 'pass' : 'fail',
        `${delTime.toFixed(2)}ms`, {
          latency: delTime,
          deleted
        })
      
      // Performance assessment
      const avgLatency = (pingTime + setTime + getTime + delTime) / 4
      let performanceStatus: 'pass' | 'warning' | 'fail' = 'pass'
      let performanceMessage = 'Excellent performance'
      
      if (avgLatency > 1000) {
        performanceStatus = 'fail'
        performanceMessage = 'Poor performance (>1s avg)'
      } else if (avgLatency > 500) {
        performanceStatus = 'warning'
        performanceMessage = 'Moderate performance (>500ms avg)'
      } else if (avgLatency > 200) {
        performanceStatus = 'warning'
        performanceMessage = 'Acceptable performance'
      }
      
      this.addResult('Upstash', 'Performance Assessment', performanceStatus, 
        `${avgLatency.toFixed(2)}ms avg - ${performanceMessage}`, {
          avgLatency,
          breakdown: { ping: pingTime, set: setTime, get: getTime, del: delTime }
        })
      
    } catch (error) {
      this.addResult('Upstash', 'Connection Test', 'fail', 
        error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async checkQueueSystem(): Promise<void> {
    logSection('QUEUE SYSTEM')
    
    try {
      // Check queue adapter
      const { QueueAdapter, EnvironmentUtils } = await import('../apps/api/src/lib/queue-adapter')
      
      const mode = EnvironmentUtils.getMode()
      const queueProvider = EnvironmentUtils.getQueueProvider()
      const redisProvider = EnvironmentUtils.getRedisProvider()
      
      this.addResult('Queue System', 'Mode Detection', 'pass', mode, {
        queue: queueProvider,
        redis: redisProvider
      })
      
      // Test queue statistics
      try {
        const stats = await QueueAdapter.getQueueStats()
        this.addResult('Queue System', 'Statistics', 'pass', 'Queue stats accessible', stats)
      } catch (error) {
        this.addResult('Queue System', 'Statistics', 'warning', 
          'Cannot get queue stats: ' + (error instanceof Error ? error.message : 'Unknown error'))
      }
      
      // Test individual queue classes
      const queueTypes = ['serverless-analysis', 'serverless-email', 'serverless-credits']
      
      for (const queueType of queueTypes) {
        try {
          const queueModule = await import(`../apps/api/src/queues/${queueType}.queue`)
          this.addResult('Queue System', `${queueType} Queue`, 'pass', 'Module loaded successfully')
        } catch (error) {
          this.addResult('Queue System', `${queueType} Queue`, 'fail', 
            'Cannot load queue module: ' + (error instanceof Error ? error.message : 'Unknown error'))
        }
      }
      
    } catch (error) {
      this.addResult('Queue System', 'Queue Adapter', 'fail', 
        'Cannot load queue adapter: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  async checkVercelConfiguration(): Promise<void> {
    logSection('VERCEL CONFIGURATION')
    
    const vercelJsonPath = resolve(process.cwd(), 'vercel.json')
    
    if (!existsSync(vercelJsonPath)) {
      this.addResult('Vercel', 'vercel.json', 'fail', 'vercel.json file missing')
      return
    }
    
    try {
      const vercelConfig = JSON.parse(readFileSync(vercelJsonPath, 'utf8'))
      
      // Check cron jobs
      if (vercelConfig.crons && Array.isArray(vercelConfig.crons)) {
        this.addResult('Vercel', 'Cron Jobs', 'pass', 
          `${vercelConfig.crons.length} cron jobs configured`, {
            crons: vercelConfig.crons.map((cron: any) => ({
              path: cron.path,
              schedule: cron.schedule
            }))
          })
      } else {
        this.addResult('Vercel', 'Cron Jobs', 'warning', 'No cron jobs configured')
      }
      
      // Check functions configuration
      if (vercelConfig.functions) {
        this.addResult('Vercel', 'Functions Config', 'pass', 'Functions configuration present', {
          functions: Object.keys(vercelConfig.functions)
        })
      } else {
        this.addResult('Vercel', 'Functions Config', 'warning', 'No functions configuration')
      }
      
      // Check routes configuration
      if (vercelConfig.routes && Array.isArray(vercelConfig.routes)) {
        this.addResult('Vercel', 'Routes Config', 'pass', 
          `${vercelConfig.routes.length} routes configured`)
      } else {
        this.addResult('Vercel', 'Routes Config', 'warning', 'No routes configuration')
      }
      
    } catch (error) {
      this.addResult('Vercel', 'vercel.json Parse', 'fail', 
        'Cannot parse vercel.json: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  async checkDependencies(): Promise<void> {
    logSection('DEPENDENCIES')
    
    const packageJsonPath = resolve(process.cwd(), 'package.json')
    
    if (!existsSync(packageJsonPath)) {
      this.addResult('Dependencies', 'package.json', 'fail', 'package.json missing')
      return
    }
    
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
      
      const requiredDeps = [
        '@upstash/redis',
        'ioredis',
        '@truecheckia/config',
        '@truecheckia/database'
      ]
      
      for (const dep of requiredDeps) {
        const version = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]
        if (version) {
          this.addResult('Dependencies', dep, 'pass', `Version ${version}`)
        } else {
          this.addResult('Dependencies', dep, 'fail', 'Package not found')
        }
      }
      
      // Check if node_modules exists
      const nodeModulesPath = resolve(process.cwd(), 'node_modules')
      if (existsSync(nodeModulesPath)) {
        this.addResult('Dependencies', 'node_modules', 'pass', 'Dependencies installed')
      } else {
        this.addResult('Dependencies', 'node_modules', 'fail', 'Dependencies not installed - run npm install')
      }
      
    } catch (error) {
      this.addResult('Dependencies', 'package.json Parse', 'fail', 
        'Cannot parse package.json: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  async checkCachePatterns(): Promise<void> {
    logSection('CACHE PATTERNS')
    
    if (!this.upstash) {
      this.addResult('Cache', 'Client', 'fail', 'Upstash client not available')
      return
    }
    
    try {
      // Test user cache pattern
      const userId = 'diagnostic-user-' + Date.now()
      const userKey = `user:${userId}`
      const userData = {
        id: userId,
        email: 'diagnostic@truecheckia.com',
        plan: 'pro',
        credits: 100
      }
      
      await this.upstash.set(userKey, JSON.stringify(userData), { ex: 300 })
      const retrievedUser = await this.upstash.get(userKey)
      const userCorrect = retrievedUser && JSON.parse(retrievedUser as string).id === userId
      
      this.addResult('Cache', 'User Cache Pattern', userCorrect ? 'pass' : 'fail', 
        userCorrect ? 'Working correctly' : 'Data mismatch')
      
      await this.upstash.del(userKey)
      
      // Test analysis cache pattern
      const textHash = 'diagnostic-hash-' + Date.now()
      const analysisKey = `analysis:${textHash}`
      const analysisData = {
        aiScore: 85,
        confidence: 0.92,
        isAiGenerated: true,
        explanation: 'Diagnostic test'
      }
      
      await this.upstash.set(analysisKey, JSON.stringify(analysisData), { ex: 86400 })
      const retrievedAnalysis = await this.upstash.get(analysisKey)
      const analysisCorrect = retrievedAnalysis && JSON.parse(retrievedAnalysis as string).aiScore === 85
      
      this.addResult('Cache', 'Analysis Cache Pattern', analysisCorrect ? 'pass' : 'fail',
        analysisCorrect ? 'Working correctly' : 'Data mismatch')
      
      await this.upstash.del(analysisKey)
      
      // Test rate limiting pattern
      const rateLimitKey = `rate:diagnostic:${Date.now()}`
      
      const count1 = await this.upstash.incr(rateLimitKey)
      await this.upstash.expire(rateLimitKey, 60)
      const count2 = await this.upstash.incr(rateLimitKey)
      
      const rateLimitWorking = count1 === 1 && count2 === 2
      this.addResult('Cache', 'Rate Limit Pattern', rateLimitWorking ? 'pass' : 'fail',
        rateLimitWorking ? 'Working correctly' : 'Increment pattern failed')
      
      await this.upstash.del(rateLimitKey)
      
    } catch (error) {
      this.addResult('Cache', 'Pattern Test', 'fail',
        'Cache pattern test failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  printSummary(): void {
    logSection('DIAGNOSTIC SUMMARY')
    
    let totalChecks = 0
    let passedChecks = 0
    let failedChecks = 0
    let warningChecks = 0
    
    for (const result of this.results) {
      for (const check of result.checks) {
        totalChecks++
        if (check.status === 'pass') passedChecks++
        else if (check.status === 'fail') failedChecks++
        else warningChecks++
      }
    }
    
    const successRate = (passedChecks / totalChecks * 100).toFixed(1)
    
    log(`\nTotal Checks: ${totalChecks}`)
    logSuccess(`Passed: ${passedChecks}`)
    logError(`Failed: ${failedChecks}`)
    logWarning(`Warnings: ${warningChecks}`)
    log(`Success Rate: ${successRate}%`, 'bright')
    
    // Overall status
    if (failedChecks === 0) {
      if (warningChecks === 0) {
        logSuccess('\n🎉 Perfect! Your Redis setup is ready for production.')
      } else {
        logWarning(`\n⚠️  Setup is functional but has ${warningChecks} warnings to address.`)
      }
    } else {
      logError(`\n❌ Setup has ${failedChecks} critical issues that must be fixed.`)
    }
    
    // Recommendations
    log('\nRecommendations:', 'yellow')
    
    if (failedChecks > 0) {
      log('  🔧 Fix all failed checks before proceeding', 'red')
      log('  🔧 Verify environment variables configuration', 'red')
      log('  🔧 Check Upstash dashboard for issues', 'red')
    }
    
    if (warningChecks > 0) {
      log('  ⚠️  Address warnings for optimal setup', 'yellow')
      log('  ⚠️  Consider adding optional configurations', 'yellow')
    }
    
    if (failedChecks === 0) {
      log('  ✅ Run full test suite: tsx scripts/test-redis-migration.ts', 'green')
      log('  ✅ Run performance benchmark: tsx scripts/benchmark-redis-performance.ts', 'green')
      log('  ✅ Ready for deployment to Vercel', 'green')
    }
    
    log('\n' + '='.repeat(60), 'cyan')
  }

  async runDiagnostic(): Promise<void> {
    log('🔍 Starting Redis Setup Diagnostic', 'cyan')
    log('This diagnostic will check all aspects of your Redis serverless setup\n', 'blue')
    
    const startTime = performance.now()
    
    try {
      await this.checkEnvironment()
      await this.checkFileStructure()
      await this.checkDependencies()
      await this.checkUpstashConnectivity()
      await this.checkQueueSystem()
      await this.checkVercelConfiguration()
      await this.checkCachePatterns()
    } catch (error) {
      logError(`Diagnostic execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    const totalTime = performance.now() - startTime
    log(`\nDiagnostic completed in ${(totalTime / 1000).toFixed(2)} seconds`, 'blue')
    
    this.printSummary()
  }
}

// Main execution
async function main() {
  try {
    const diagnostic = new RedisSetupDiagnostic()
    await diagnostic.runDiagnostic()
  } catch (error) {
    logError(`Failed to run diagnostic: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

export default RedisSetupDiagnostic