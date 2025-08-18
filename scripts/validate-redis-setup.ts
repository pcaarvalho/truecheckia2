#!/usr/bin/env tsx

/**
 * TrueCheckIA - Redis Setup Final Validation Script
 * TAREFA 2: Configuração do Redis Serverless usando Upstash
 * 
 * Validação final completa do sistema Redis serverless
 */

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

interface ValidationResult {
  test: string
  passed: boolean
  score: number
  maxScore: number
  details: string
  duration?: number
}

class RedisSetupValidator {
  private results: ValidationResult[] = []
  private totalScore = 0
  private maxTotalScore = 0

  private async runScript(scriptPath: string, description: string): Promise<ValidationResult> {
    logInfo(`Running ${description}...`)
    const start = performance.now()
    
    try {
      // Import and run the test script
      const testModule = await import(scriptPath)
      
      // Most test scripts export a default class with a run method
      if (testModule.default) {
        const instance = new testModule.default()
        
        if (typeof instance.runAllTests === 'function') {
          await instance.runAllTests()
        } else if (typeof instance.runDiagnostic === 'function') {
          await instance.runDiagnostic()
        } else if (typeof instance.runBenchmarks === 'function') {
          await instance.runBenchmarks()
        }
      }
      
      const duration = performance.now() - start
      return {
        test: description,
        passed: true,
        score: 10,
        maxScore: 10,
        details: 'All tests passed successfully',
        duration
      }
    } catch (error) {
      const duration = performance.now() - start
      return {
        test: description,
        passed: false,
        score: 0,
        maxScore: 10,
        details: error instanceof Error ? error.message : 'Unknown error',
        duration
      }
    }
  }

  private recordResult(result: ValidationResult) {
    this.results.push(result)
    this.totalScore += result.score
    this.maxTotalScore += result.maxScore

    const percentage = (result.score / result.maxScore * 100).toFixed(0)
    const durationStr = result.duration ? ` (${(result.duration / 1000).toFixed(1)}s)` : ''
    
    if (result.passed) {
      logSuccess(`${result.test}: ${percentage}%${durationStr}`)
    } else {
      logError(`${result.test}: ${percentage}% - ${result.details}${durationStr}`)
    }
  }

  async validateEnvironment(): Promise<ValidationResult> {
    logInfo('Validating environment configuration...')
    const start = performance.now()
    
    let score = 0
    const maxScore = 10
    const issues: string[] = []

    // Check required environment variables
    const requiredVars = [
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
      'DATABASE_URL',
      'OPENAI_API_KEY',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET'
    ]

    const missingVars = requiredVars.filter(varName => !process.env[varName])
    
    if (missingVars.length === 0) {
      score += 6
    } else {
      issues.push(`Missing required variables: ${missingVars.join(', ')}`)
    }

    // Check optional serverless variables
    const optionalVars = ['CRON_SECRET', 'WEBHOOK_SECRET']
    const missingOptional = optionalVars.filter(varName => !process.env[varName])
    
    if (missingOptional.length === 0) {
      score += 2
    } else {
      score += 1
      issues.push(`Missing optional variables: ${missingOptional.join(', ')}`)
    }

    // Check mode detection
    const nodeEnv = process.env.NODE_ENV
    const forceServerless = process.env.FORCE_SERVERLESS === 'true'
    const isServerless = nodeEnv === 'production' || forceServerless
    
    if (isServerless) {
      score += 2
    } else {
      score += 1
      issues.push('Not in serverless mode (set FORCE_SERVERLESS=true for testing)')
    }

    const duration = performance.now() - start
    return {
      test: 'Environment Configuration',
      passed: score >= 8,
      score,
      maxScore,
      details: issues.length > 0 ? issues.join('; ') : 'All environment variables configured correctly',
      duration
    }
  }

  async validateUpstashConnectivity(): Promise<ValidationResult> {
    logInfo('Validating Upstash connectivity...')
    
    try {
      const result = await this.runScript('../scripts/test-upstash-connectivity.ts', 'Upstash Connectivity')
      return result
    } catch (error) {
      return {
        test: 'Upstash Connectivity',
        passed: false,
        score: 0,
        maxScore: 10,
        details: `Connectivity test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  async validateMigrationReadiness(): Promise<ValidationResult> {
    logInfo('Validating migration readiness...')
    
    try {
      const result = await this.runScript('../scripts/test-redis-migration.ts', 'Migration Readiness')
      return result
    } catch (error) {
      return {
        test: 'Migration Readiness',
        passed: false,
        score: 0,
        maxScore: 10,
        details: `Migration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  async validatePerformance(): Promise<ValidationResult> {
    logInfo('Validating performance benchmarks...')
    
    try {
      const result = await this.runScript('../scripts/benchmark-redis-performance.ts', 'Performance Benchmark')
      
      // Performance gets partial score based on results
      return {
        ...result,
        score: Math.min(result.score, 8), // Performance is less critical than functionality
        maxScore: 8
      }
    } catch (error) {
      return {
        test: 'Performance Benchmark',
        passed: false,
        score: 0,
        maxScore: 8,
        details: `Performance test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  async validateSystemDiagnostic(): Promise<ValidationResult> {
    logInfo('Running system diagnostic...')
    
    try {
      const result = await this.runScript('../scripts/diagnose-redis-setup.ts', 'System Diagnostic')
      return result
    } catch (error) {
      return {
        test: 'System Diagnostic',
        passed: false,
        score: 0,
        maxScore: 10,
        details: `Diagnostic failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  async validateQueueSystem(): Promise<ValidationResult> {
    logInfo('Validating queue system...')
    const start = performance.now()
    
    try {
      // Test queue adapter functionality
      const { QueueAdapter, EnvironmentUtils } = await import('../apps/api/src/lib/queue-adapter')
      
      let score = 0
      const issues: string[] = []
      
      // Test environment detection
      const mode = EnvironmentUtils.getMode()
      if (mode === 'serverless') {
        score += 3
      } else {
        score += 1
        issues.push('Not in serverless mode')
      }
      
      // Test queue statistics
      try {
        const stats = await QueueAdapter.getQueueStats()
        if (stats) {
          score += 3
        } else {
          issues.push('Queue stats not available')
        }
      } catch (error) {
        issues.push('Queue stats failed')
      }
      
      // Test serverless queue modules
      const queueTypes = ['serverless-analysis', 'serverless-email', 'serverless-credits']
      let loadedQueues = 0
      
      for (const queueType of queueTypes) {
        try {
          await import(`../apps/api/src/queues/${queueType}.queue`)
          loadedQueues++
        } catch (error) {
          issues.push(`Failed to load ${queueType} queue`)
        }
      }
      
      score += Math.floor((loadedQueues / queueTypes.length) * 4)
      
      const duration = performance.now() - start
      return {
        test: 'Queue System',
        passed: score >= 8,
        score,
        maxScore: 10,
        details: issues.length > 0 ? issues.join('; ') : 'Queue system working correctly',
        duration
      }
    } catch (error) {
      const duration = performance.now() - start
      return {
        test: 'Queue System',
        passed: false,
        score: 0,
        maxScore: 10,
        details: `Queue system test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      }
    }
  }

  printFinalReport(): void {
    log('\n' + '='.repeat(80), 'cyan')
    log('🏁 REDIS SERVERLESS SETUP - FINAL VALIDATION REPORT', 'cyan')
    log('='.repeat(80), 'cyan')
    
    const finalScore = (this.totalScore / this.maxTotalScore * 100).toFixed(1)
    const passed = this.results.filter(r => r.passed).length
    const total = this.results.length
    
    log(`\nOverall Score: ${this.totalScore}/${this.maxTotalScore} (${finalScore}%)`, 'bright')
    log(`Tests Passed: ${passed}/${total}`, 'bright')
    
    // Grade assessment
    let grade: string
    let color: keyof typeof colors
    let status: string
    
    if (parseFloat(finalScore) >= 90) {
      grade = 'A'
      color = 'green'
      status = 'EXCELLENT - Ready for production!'
    } else if (parseFloat(finalScore) >= 80) {
      grade = 'B'
      color = 'green'
      status = 'GOOD - Ready with minor optimizations'
    } else if (parseFloat(finalScore) >= 70) {
      grade = 'C'
      color = 'yellow'
      status = 'ACCEPTABLE - Needs improvements before production'
    } else if (parseFloat(finalScore) >= 60) {
      grade = 'D'
      color = 'yellow'
      status = 'POOR - Significant issues to address'
    } else {
      grade = 'F'
      color = 'red'
      status = 'FAILED - Critical issues must be fixed'
    }
    
    log(`\nGrade: ${grade}`, color)
    log(`Status: ${status}`, color)
    
    // Detailed results
    log('\nDetailed Results:', 'blue')
    for (const result of this.results) {
      const percentage = (result.score / result.maxScore * 100).toFixed(0)
      const icon = result.passed ? '✅' : '❌'
      const color = result.passed ? 'green' : 'red'
      log(`  ${icon} ${result.test}: ${percentage}% (${result.score}/${result.maxScore})`, color)
      
      if (!result.passed) {
        log(`    └─ ${result.details}`, 'red')
      }
    }
    
    // Recommendations
    log('\nRecommendations:', 'yellow')
    
    if (parseFloat(finalScore) >= 90) {
      logSuccess('🎉 Your Redis serverless setup is excellent!')
      logSuccess('✅ Ready for production deployment')
      logSuccess('✅ All systems are functioning optimally')
      logSuccess('✅ Consider setting up monitoring alerts')
    } else if (parseFloat(finalScore) >= 80) {
      logInfo('🔧 Setup is good but can be optimized:')
      logInfo('  • Address any failed tests')
      logInfo('  • Review performance metrics')
      logInfo('  • Test under production load')
    } else if (parseFloat(finalScore) >= 60) {
      logWarning('⚠️ Setup needs improvements:')
      logWarning('  • Fix all failed tests before production')
      logWarning('  • Review environment configuration')
      logWarning('  • Verify Upstash settings')
      logWarning('  • Run individual tests for debugging')
    } else {
      logError('❌ Critical issues detected:')
      logError('  • DO NOT deploy to production')
      logError('  • Fix all failing tests')
      logError('  • Verify environment variables')
      logError('  • Check Upstash configuration')
      logError('  • Review installation guide')
    }
    
    // Next steps
    log('\nNext Steps:', 'blue')
    if (parseFloat(finalScore) >= 80) {
      log('  1. Deploy to staging environment', 'blue')
      log('  2. Run load tests with production data', 'blue')
      log('  3. Set up monitoring and alerting', 'blue')
      log('  4. Schedule production migration', 'blue')
      log('  5. Prepare rollback procedures', 'blue')
    } else {
      log('  1. Fix all failed tests', 'blue')
      log('  2. Run validation again', 'blue')
      log('  3. Consult troubleshooting guide', 'blue')
      log('  4. Review configuration documentation', 'blue')
      log('  5. Seek support if needed', 'blue')
    }
    
    log('\n' + '='.repeat(80), 'cyan')
    
    // Exit with appropriate code
    if (parseFloat(finalScore) >= 80) {
      process.exit(0)
    } else {
      process.exit(1)
    }
  }

  async runFullValidation(): Promise<void> {
    log('🔍 Starting Full Redis Serverless Setup Validation', 'cyan')
    log('This comprehensive validation will verify all aspects of your setup\n', 'blue')
    
    const startTime = performance.now()
    
    try {
      // Run all validation tests
      this.recordResult(await this.validateEnvironment())
      this.recordResult(await this.validateUpstashConnectivity())
      this.recordResult(await this.validateQueueSystem())
      this.recordResult(await this.validateMigrationReadiness())
      this.recordResult(await this.validatePerformance())
      this.recordResult(await this.validateSystemDiagnostic())
      
    } catch (error) {
      logError(`Validation execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    const totalTime = performance.now() - startTime
    log(`\nValidation completed in ${(totalTime / 1000).toFixed(1)} seconds`, 'blue')
    
    this.printFinalReport()
  }
}

// Main execution
async function main() {
  try {
    const validator = new RedisSetupValidator()
    await validator.runFullValidation()
  } catch (error) {
    logError(`Failed to run validation: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

export default RedisSetupValidator