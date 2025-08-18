#!/usr/bin/env tsx

/**
 * Serverless Readiness Validation Script
 * Validates that TrueCheckIA is ready for Vercel deployment
 */

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { config } from '../packages/config/src'

interface ValidationResult {
  category: string
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  critical: boolean
}

class ServerlessValidator {
  private results: ValidationResult[] = []
  private projectRoot = resolve(__dirname, '..')

  async validate(): Promise<void> {
    console.log('🔍 Starting Serverless Readiness Validation...\n')

    await this.validateProjectStructure()
    await this.validateServerlessFunctions()
    await this.validateMiddleware()
    await this.validateAdapters()
    await this.validateConfiguration()
    await this.validateEnvironmentVariables()
    await this.validateDependencies()
    await this.validateBundleSize()

    this.printResults()
    this.printSummary()
  }

  private async validateProjectStructure(): Promise<void> {
    const requiredDirs = [
      'api',
      'api/_utils',
      'api/_middleware', 
      'apps/api/src',
      'packages/database',
      'packages/config',
      'packages/types'
    ]

    for (const dir of requiredDirs) {
      const path = resolve(this.projectRoot, dir)
      this.addResult({
        category: 'Structure',
        name: `Directory ${dir}`,
        status: existsSync(path) ? 'pass' : 'fail',
        message: existsSync(path) ? 'Exists' : 'Missing required directory',
        critical: true
      })
    }

    // Check vercel.json
    const vercelConfig = resolve(this.projectRoot, 'vercel.json')
    this.addResult({
      category: 'Structure',
      name: 'vercel.json',
      status: existsSync(vercelConfig) ? 'pass' : 'fail',
      message: existsSync(vercelConfig) ? 'Configuration exists' : 'Missing Vercel configuration',
      critical: true
    })
  }

  private async validateServerlessFunctions(): Promise<void> {
    const functionPaths = [
      // Auth functions
      'api/auth/login.ts',
      'api/auth/register.ts',
      'api/auth/refresh.ts',
      'api/auth/logout.ts',
      
      // Analysis functions
      'api/analysis/check.ts',
      'api/analysis/history.ts',
      'api/analysis/[id].ts',
      
      // API functions
      'api/v1/analyze.ts',
      'api/v1/status.ts',
      
      // User functions
      'api/user/profile.ts',
      'api/user/credits.ts',
      
      // System functions
      'api/health.ts',
      'api/webhooks/[...all].ts'
    ]

    for (const funcPath of functionPaths) {
      const fullPath = resolve(this.projectRoot, funcPath)
      const exists = existsSync(fullPath)
      
      if (exists) {
        const content = readFileSync(fullPath, 'utf-8')
        const hasVercelHandler = content.includes('createVercelHandler')
        const hasExport = content.includes('export default')
        
        this.addResult({
          category: 'Functions',
          name: funcPath,
          status: (hasVercelHandler && hasExport) ? 'pass' : 'warning',
          message: hasVercelHandler ? 'Properly configured' : 'Missing Vercel adapter',
          critical: false
        })
      } else {
        this.addResult({
          category: 'Functions',
          name: funcPath,
          status: 'fail',
          message: 'Function missing',
          critical: true
        })
      }
    }
  }

  private async validateMiddleware(): Promise<void> {
    const middlewareFiles = [
      'api/_middleware/auth.ts',
      'api/_middleware/rate-limit.ts',
      'api/_middleware/validation.ts'
    ]

    for (const middleware of middlewareFiles) {
      const path = resolve(this.projectRoot, middleware)
      const exists = existsSync(path)
      
      if (exists) {
        const content = readFileSync(path, 'utf-8')
        const hasVercelTypes = content.includes('VercelRequest') && content.includes('VercelResponse')
        
        this.addResult({
          category: 'Middleware',
          name: middleware,
          status: hasVercelTypes ? 'pass' : 'warning',
          message: hasVercelTypes ? 'Vercel compatible' : 'Check Vercel compatibility',
          critical: false
        })
      } else {
        this.addResult({
          category: 'Middleware',
          name: middleware,
          status: 'fail',
          message: 'Middleware missing',
          critical: true
        })
      }
    }

    // Validate vercel-adapter
    const adapterPath = resolve(this.projectRoot, 'api/_utils/vercel-adapter.ts')
    const adapterExists = existsSync(adapterPath)
    
    this.addResult({
      category: 'Middleware',
      name: 'Vercel Adapter',
      status: adapterExists ? 'pass' : 'fail',
      message: adapterExists ? 'Core adapter exists' : 'Missing Vercel adapter',
      critical: true
    })
  }

  private async validateAdapters(): Promise<void> {
    const adapterFiles = [
      'apps/api/src/lib/queue-adapter.ts',
      'apps/api/src/lib/serverless-redis.ts',
      'apps/api/src/lib/upstash.ts',
      'apps/api/src/queues/serverless-index.ts'
    ]

    for (const adapter of adapterFiles) {
      const path = resolve(this.projectRoot, adapter)
      const exists = existsSync(path)
      
      if (exists) {
        const content = readFileSync(path, 'utf-8')
        const hasServerlessSupport = content.includes('serverless') || content.includes('upstash')
        
        this.addResult({
          category: 'Adapters',
          name: adapter.split('/').pop() || adapter,
          status: hasServerlessSupport ? 'pass' : 'warning',
          message: hasServerlessSupport ? 'Serverless ready' : 'Check serverless compatibility',
          critical: false
        })
      } else {
        this.addResult({
          category: 'Adapters',
          name: adapter.split('/').pop() || adapter,
          status: 'fail',
          message: 'Adapter missing',
          critical: true
        })
      }
    }
  }

  private async validateConfiguration(): Promise<void> {
    // Validate vercel.json content
    const vercelPath = resolve(this.projectRoot, 'vercel.json')
    if (existsSync(vercelPath)) {
      try {
        const vercelConfig = JSON.parse(readFileSync(vercelPath, 'utf-8'))
        
        // Check builds
        const hasBuilds = vercelConfig.builds && vercelConfig.builds.length > 0
        this.addResult({
          category: 'Configuration',
          name: 'Vercel Builds',
          status: hasBuilds ? 'pass' : 'fail',
          message: hasBuilds ? 'Build configuration exists' : 'Missing build configuration',
          critical: true
        })

        // Check routes
        const hasRoutes = vercelConfig.routes && vercelConfig.routes.length > 0
        this.addResult({
          category: 'Configuration',
          name: 'Vercel Routes',
          status: hasRoutes ? 'pass' : 'fail', 
          message: hasRoutes ? `${vercelConfig.routes.length} routes configured` : 'Missing route configuration',
          critical: true
        })

        // Check functions config
        const hasFunctions = vercelConfig.functions && Object.keys(vercelConfig.functions).length > 0
        this.addResult({
          category: 'Configuration',
          name: 'Function Config',
          status: hasFunctions ? 'pass' : 'warning',
          message: hasFunctions ? 'Function configuration exists' : 'Using default function configuration',
          critical: false
        })

        // Check cron jobs
        const hasCrons = vercelConfig.crons && vercelConfig.crons.length > 0
        this.addResult({
          category: 'Configuration', 
          name: 'Cron Jobs',
          status: hasCrons ? 'pass' : 'warning',
          message: hasCrons ? `${vercelConfig.crons.length} cron jobs configured` : 'No cron jobs configured',
          critical: false
        })

      } catch (error) {
        this.addResult({
          category: 'Configuration',
          name: 'vercel.json',
          status: 'fail',
          message: 'Invalid JSON configuration',
          critical: true
        })
      }
    }

    // Check package.json for Vercel dependency
    const packagePath = resolve(this.projectRoot, 'package.json')
    if (existsSync(packagePath)) {
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'))
      const hasVercelNode = packageJson.dependencies && packageJson.dependencies['@vercel/node']
      
      this.addResult({
        category: 'Configuration',
        name: '@vercel/node',
        status: hasVercelNode ? 'pass' : 'fail',
        message: hasVercelNode ? 'Vercel runtime dependency exists' : 'Missing @vercel/node dependency',
        critical: true
      })
    }
  }

  private async validateEnvironmentVariables(): Promise<void> {
    const requiredVars = [
      'DATABASE_URL',
      'OPENAI_API_KEY', 
      'JWT_SECRET',
      'JWT_REFRESH_SECRET'
    ]

    const serverlessVars = [
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN'
    ]

    const recommendedVars = [
      'CRON_SECRET',
      'WEBHOOK_SECRET',
      'RESEND_API_KEY',
      'STRIPE_SECRET_KEY'
    ]

    // Check required variables
    for (const envVar of requiredVars) {
      const exists = !!process.env[envVar]
      this.addResult({
        category: 'Environment',
        name: envVar,
        status: exists ? 'pass' : 'fail',
        message: exists ? 'Configured' : 'Missing required environment variable',
        critical: true
      })
    }

    // Check serverless variables
    for (const envVar of serverlessVars) {
      const exists = !!process.env[envVar]
      this.addResult({
        category: 'Environment',
        name: envVar,
        status: exists ? 'pass' : 'fail',
        message: exists ? 'Configured' : 'Missing serverless environment variable',
        critical: true
      })
    }

    // Check recommended variables
    for (const envVar of recommendedVars) {
      const exists = !!process.env[envVar]
      this.addResult({
        category: 'Environment',
        name: envVar,
        status: exists ? 'pass' : 'warning',
        message: exists ? 'Configured' : 'Recommended for production',
        critical: false
      })
    }
  }

  private async validateDependencies(): Promise<void> {
    const packagePath = resolve(this.projectRoot, 'package.json')
    
    if (existsSync(packagePath)) {
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'))
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }

      // Check critical dependencies
      const criticalDeps = [
        '@upstash/redis',
        '@vercel/node',
        '@prisma/client',
        'zod',
        'jsonwebtoken'
      ]

      for (const dep of criticalDeps) {
        const exists = !!deps[dep]
        this.addResult({
          category: 'Dependencies',
          name: dep,
          status: exists ? 'pass' : 'fail',
          message: exists ? `Installed (${deps[dep]})` : 'Missing critical dependency',
          critical: true
        })
      }

      // Check for potential heavy dependencies that could impact cold starts
      const heavyDeps = [
        'aws-sdk',
        'mongoose',
        '@tensorflow/tfjs',
        'sharp',
        'puppeteer'
      ]

      for (const dep of heavyDeps) {
        if (deps[dep]) {
          this.addResult({
            category: 'Dependencies',
            name: dep,
            status: 'warning',
            message: 'Heavy dependency detected - may impact cold starts',
            critical: false
          })
        }
      }
    }
  }

  private async validateBundleSize(): Promise<void> {
    // Check for potential bundle size issues
    const largeFiles = [
      'api/webhooks/[...all].ts',
      'api/_utils/vercel-adapter.ts',
      'api/analysis/check.ts'
    ]

    for (const file of largeFiles) {
      const path = resolve(this.projectRoot, file)
      if (existsSync(path)) {
        const content = readFileSync(path, 'utf-8')
        const lines = content.split('\n').length
        const size = Buffer.byteLength(content, 'utf8')

        const status = lines > 200 || size > 10000 ? 'warning' : 'pass'
        this.addResult({
          category: 'Bundle Size',
          name: file,
          status,
          message: `${lines} lines, ${Math.round(size / 1024)}KB${status === 'warning' ? ' - Consider optimization' : ''}`,
          critical: false
        })
      }
    }

    // Check for dynamic imports usage
    const functionsDir = resolve(this.projectRoot, 'api')
    const files = this.getAllTsFiles(functionsDir)
    
    let dynamicImportCount = 0
    let staticImportCount = 0

    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      const dynamicImports = content.match(/await import\(/g) || []
      const staticImports = content.match(/^import .* from/gm) || []
      
      dynamicImportCount += dynamicImports.length
      staticImportCount += staticImports.length
    }

    const optimizationRatio = dynamicImportCount / (staticImportCount + dynamicImportCount)
    this.addResult({
      category: 'Bundle Size',
      name: 'Import Optimization',
      status: optimizationRatio > 0.3 ? 'pass' : optimizationRatio > 0.1 ? 'warning' : 'fail',
      message: `${Math.round(optimizationRatio * 100)}% dynamic imports (target: >30%)`,
      critical: false
    })
  }

  private getAllTsFiles(dir: string): string[] {
    const fs = require('fs')
    const path = require('path')
    let files: string[] = []

    try {
      const items = fs.readdirSync(dir)
      for (const item of items) {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)
        
        if (stat.isDirectory()) {
          files = files.concat(this.getAllTsFiles(fullPath))
        } else if (item.endsWith('.ts')) {
          files.push(fullPath)
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return files
  }

  private addResult(result: ValidationResult): void {
    this.results.push(result)
  }

  private printResults(): void {
    const categories = [...new Set(this.results.map(r => r.category))]
    
    for (const category of categories) {
      console.log(`\n📋 ${category}`)
      console.log('─'.repeat(50))
      
      const categoryResults = this.results.filter(r => r.category === category)
      
      for (const result of categoryResults) {
        const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌'
        const critical = result.critical ? ' [CRITICAL]' : ''
        console.log(`${icon} ${result.name}: ${result.message}${critical}`)
      }
    }
  }

  private printSummary(): void {
    const totalTests = this.results.length
    const passed = this.results.filter(r => r.status === 'pass').length
    const warnings = this.results.filter(r => r.status === 'warning').length
    const failed = this.results.filter(r => r.status === 'fail').length
    const criticalFailed = this.results.filter(r => r.status === 'fail' && r.critical).length

    console.log('\n' + '═'.repeat(60))
    console.log('📊 VALIDATION SUMMARY')
    console.log('═'.repeat(60))
    
    console.log(`Total Tests: ${totalTests}`)
    console.log(`✅ Passed: ${passed} (${Math.round(passed/totalTests*100)}%)`)
    console.log(`⚠️  Warnings: ${warnings} (${Math.round(warnings/totalTests*100)}%)`)
    console.log(`❌ Failed: ${failed} (${Math.round(failed/totalTests*100)}%)`)
    console.log(`🚨 Critical Failures: ${criticalFailed}`)

    console.log('\n🎯 READINESS ASSESSMENT')
    console.log('─'.repeat(30))

    if (criticalFailed === 0) {
      if (failed === 0 && warnings === 0) {
        console.log('🟢 READY FOR PRODUCTION DEPLOYMENT')
        console.log('All systems green! Deploy with confidence.')
      } else if (failed === 0) {
        console.log('🟡 READY FOR DEPLOYMENT WITH OPTIMIZATIONS')
        console.log('No critical issues, but some optimizations recommended.')
      } else {
        console.log('🟡 READY FOR STAGING DEPLOYMENT')
        console.log('Non-critical issues detected. Test thoroughly before production.')
      }
    } else {
      console.log('🔴 NOT READY FOR DEPLOYMENT')
      console.log(`${criticalFailed} critical issue(s) must be resolved first.`)
    }

    console.log('\n📝 NEXT STEPS')
    console.log('─'.repeat(15))
    
    if (criticalFailed > 0) {
      console.log('1. ❗ Fix all critical failures before deployment')
      console.log('2. 🔧 Address non-critical failures') 
      console.log('3. ⚡ Consider optimization warnings')
      console.log('4. 🧪 Re-run validation after fixes')
    } else if (failed > 0) {
      console.log('1. 🔧 Address remaining failures')
      console.log('2. ⚡ Review optimization warnings')
      console.log('3. 🧪 Test in staging environment')
      console.log('4. 🚀 Deploy to production')
    } else if (warnings > 0) {
      console.log('1. ⚡ Review optimization warnings')
      console.log('2. 🧪 Load test critical paths')
      console.log('3. 🚀 Deploy to production')
      console.log('4. 📊 Monitor performance metrics')
    } else {
      console.log('1. 🧪 Final end-to-end testing')
      console.log('2. 🚀 Deploy to production')
      console.log('3. 📊 Monitor metrics and performance')
      console.log('4. 🎉 Celebrate successful deployment!')
    }

    console.log('\n' + '═'.repeat(60))
  }
}

// Run validation
const validator = new ServerlessValidator()
validator.validate().catch(console.error)