#!/usr/bin/env tsx

/**
 * Serverless Issues Auto-Fix Script
 * Automatically fixes common serverless deployment issues
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

class ServerlessFixer {
  private projectRoot = resolve(__dirname, '..')

  async fix(): Promise<void> {
    console.log('🔧 Starting Serverless Issues Auto-Fix...\n')

    await this.fixHealthFunction()
    await this.addDynamicImports()
    await this.createEnvTemplate()
    await this.updatePackageJson()

    console.log('\n✅ Auto-fix completed!')
    console.log('\n📝 Manual steps required:')
    console.log('1. Install missing dependencies: npm install')
    console.log('2. Copy .env.production.example and fill with your values')
    console.log('3. Configure Vercel environment variables')
    console.log('4. Re-run validation: npx tsx scripts/validate-serverless-readiness.ts')
  }

  private async fixHealthFunction(): Promise<void> {
    console.log('🩺 Fixing health function...')
    
    const healthPath = resolve(this.projectRoot, 'api/health.ts')
    const healthContent = `import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from './_utils/vercel-adapter'

const healthCheck = async (req: any, res: any) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    region: process.env.VERCEL_REGION || 'unknown',
    services: {
      database: 'checking...',
      redis: 'checking...',
      openai: 'checking...'
    }
  }

  // Basic service checks
  try {
    // Check if environment variables are set
    health.services.database = process.env.DATABASE_URL ? 'configured' : 'not_configured'
    health.services.redis = process.env.UPSTASH_REDIS_REST_URL ? 'configured' : 'not_configured'
    health.services.openai = process.env.OPENAI_API_KEY ? 'configured' : 'not_configured'

    // If any service is not configured, mark as degraded
    const allConfigured = Object.values(health.services).every(status => status === 'configured')
    health.status = allConfigured ? 'healthy' : 'degraded'

  } catch (error) {
    health.status = 'unhealthy'
    health.services = {
      database: 'error',
      redis: 'error', 
      openai: 'error'
    }
  }

  const statusCode = health.status === 'healthy' ? 200 : 
                     health.status === 'degraded' ? 200 : 503

  res.status(statusCode).json({
    success: health.status !== 'unhealthy',
    data: health
  })
}

const handler = createVercelHandler(healthCheck)
export default handler`

    writeFileSync(healthPath, healthContent)
    console.log('✅ Health function fixed')
  }

  private async addDynamicImports(): Promise<void> {
    console.log('⚡ Adding dynamic imports to critical functions...')

    // Fix analysis/check.ts
    const checkPath = resolve(this.projectRoot, 'api/analysis/check.ts')
    if (readFileSync(checkPath, 'utf-8').includes('import { analysisController }')) {
      const optimizedContent = `import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { authenticateMiddleware } from '../_middleware/auth'
import { createAnalysisRateLimitMiddleware } from '../_middleware/rate-limit'
import { validateRequestMiddleware } from '../_middleware/validation'
import { analyzeTextSchema } from '@truecheckia/types'

// Dynamic import to reduce cold start
const analyzeText = async (req: any, res: any) => {
  const { analysisController } = await import('../../apps/api/src/controllers/analysis.controller')
  return analysisController.analyzeText(req, res)
}

const handler = createVercelHandler(
  analyzeText,
  [
    authenticateMiddleware,
    createAnalysisRateLimitMiddleware(),
    validateRequestMiddleware(analyzeTextSchema),
  ]
)

export default handler`
      
      writeFileSync(checkPath, optimizedContent)
      console.log('✅ analysis/check.ts optimized with dynamic imports')
    }

    // Fix v1/analyze.ts
    const analyzePath = resolve(this.projectRoot, 'api/v1/analyze.ts')
    if (readFileSync(analyzePath, 'utf-8').includes('import { apiController }')) {
      const optimizedContent = `import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { createApiRateLimitMiddleware } from '../_middleware/rate-limit'
import { validateRequestMiddleware } from '../_middleware/validation'
import { analyzeTextSchema } from '@truecheckia/types'

// Dynamic import to reduce cold start
const analyze = async (req: any, res: any) => {
  const { apiController } = await import('../../apps/api/src/controllers/api.controller')
  return apiController.analyze(req, res)
}

const handler = createVercelHandler(
  analyze,
  [
    createApiRateLimitMiddleware(),
    validateRequestMiddleware(analyzeTextSchema),
  ]
)

export default handler`

      writeFileSync(analyzePath, optimizedContent)
      console.log('✅ v1/analyze.ts optimized with dynamic imports')
    }

    // Fix auth functions with dynamic imports
    const authFunctions = ['login', 'register', 'refresh']
    
    for (const func of authFunctions) {
      const funcPath = resolve(this.projectRoot, `api/auth/${func}.ts`)
      const content = readFileSync(funcPath, 'utf-8')
      
      if (content.includes('import authController')) {
        const optimizedContent = content.replace(
          /import authController from '.*'/,
          '// Dynamic import moved to handler'
        ).replace(
          /authController\.(\w+)/,
          'controller.$1'
        ).replace(
          'const handler = createVercelHandler(',
          `// Dynamic import to reduce cold start
const ${func}Handler = async (req: any, res: any) => {
  const authController = await import('../../apps/api/src/controllers/auth.controller')
  return authController.default.${func}(req, res)
}

const handler = createVercelHandler(`
        ).replace(
          `authController.${func},`,
          `${func}Handler,`
        )

        writeFileSync(funcPath, optimizedContent)
        console.log(`✅ auth/${func}.ts optimized with dynamic imports`)
      }
    }
  }

  private async createEnvTemplate(): Promise<void> {
    console.log('📝 Creating production environment template...')

    const envTemplate = `# ==========================================
# PRODUCTION ENVIRONMENT VARIABLES
# ==========================================
# Copy this file to your Vercel environment variables
# or use .env.local for local testing

# ==========================================
# CORE REQUIREMENTS (CRITICAL)
# ==========================================
DATABASE_URL="postgresql://username:password@host:5432/database"
OPENAI_API_KEY="sk-your-openai-api-key"
JWT_SECRET="your-super-secure-jwt-secret-256-bits"
JWT_REFRESH_SECRET="your-super-secure-refresh-secret-256-bits"

# ==========================================
# SERVERLESS REQUIREMENTS (CRITICAL)
# ==========================================
UPSTASH_REDIS_REST_URL="https://region.rest.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"

# ==========================================
# SECURITY (RECOMMENDED)
# ==========================================
CRON_SECRET="random-string-for-cron-authentication"
WEBHOOK_SECRET="random-string-for-webhook-authentication"

# ==========================================
# EMAIL SERVICE (RECOMMENDED)
# ==========================================
RESEND_API_KEY="re_your-resend-api-key"
RESEND_FROM_EMAIL="TrueCheckIA <noreply@yourdomain.com>"

# ==========================================
# PAYMENT PROCESSING (RECOMMENDED)
# ==========================================
STRIPE_SECRET_KEY="sk_live_your-stripe-secret-key"
STRIPE_WEBHOOK_SECRET="whsec_your-stripe-webhook-secret"
STRIPE_PRO_PRICE_ID="price_your_pro_price_id"
STRIPE_ENTERPRISE_PRICE_ID="price_your_enterprise_price_id"

# ==========================================
# APPLICATION CONFIGURATION
# ==========================================
NODE_ENV="production"
FRONTEND_URL="https://yourdomain.com"
CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"

# ==========================================
# OPTIONAL CONFIGURATIONS
# ==========================================
RATE_LIMIT_MAX="1000"
RATE_LIMIT_WINDOW_MS="900000"
CACHE_TTL="86400"

# ==========================================
# VERCEL-SPECIFIC (AUTO-SET)
# ==========================================
# These are automatically set by Vercel:
# VERCEL="1"
# VERCEL_ENV="production"
# VERCEL_URL="your-deployment-url.vercel.app"
# VERCEL_REGION="iad1"
`

    const envPath = resolve(this.projectRoot, '.env.production.example')
    writeFileSync(envPath, envTemplate)
    console.log('✅ Production environment template created')
  }

  private async updatePackageJson(): Promise<void> {
    console.log('📦 Updating package.json with missing dependencies...')

    const packagePath = resolve(this.projectRoot, 'package.json')
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'))

    // Add missing dependencies
    if (!packageJson.dependencies) {
      packageJson.dependencies = {}
    }

    const missingDeps = {
      '@prisma/client': '^5.7.1',
      'zod': '^3.22.4',
      'jsonwebtoken': '^9.0.2',
      '@types/jsonwebtoken': '^9.0.5'
    }

    let added = false
    for (const [dep, version] of Object.entries(missingDeps)) {
      if (!packageJson.dependencies[dep] && !packageJson.devDependencies?.[dep]) {
        if (dep.startsWith('@types/')) {
          if (!packageJson.devDependencies) packageJson.devDependencies = {}
          packageJson.devDependencies[dep] = version
        } else {
          packageJson.dependencies[dep] = version
        }
        added = true
        console.log(`  ➕ Added ${dep}: ${version}`)
      }
    }

    // Add validation scripts
    if (!packageJson.scripts) {
      packageJson.scripts = {}
    }

    const newScripts = {
      'validate:serverless': 'tsx scripts/validate-serverless-readiness.ts',
      'fix:serverless': 'tsx scripts/fix-serverless-issues.ts',
      'deploy:prepare': 'npm run validate:serverless && npm run build',
      'optimize:bundle': 'tsx scripts/optimize-bundle-size.ts'
    }

    for (const [script, command] of Object.entries(newScripts)) {
      if (!packageJson.scripts[script]) {
        packageJson.scripts[script] = command
        console.log(`  ➕ Added script: ${script}`)
      }
    }

    if (added) {
      writeFileSync(packagePath, JSON.stringify(packageJson, null, 2))
      console.log('✅ Package.json updated with missing dependencies')
    } else {
      console.log('✅ Package.json already has all required dependencies')
    }
  }
}

// Run the fixer
const fixer = new ServerlessFixer()
fixer.fix().catch(console.error)