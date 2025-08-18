import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { existsSync } from 'fs'

// Load environment variables
// Look for .env file starting from current directory and going up to project root
const findEnvFile = () => {
  const currentDir = process.cwd()
  
  // Try current directory first
  let envPath = resolve(currentDir, '.env')
  if (existsSync(envPath)) {
    return envPath
  }
  
  // Try parent directories (for monorepo structure)
  const parentDir = resolve(currentDir, '../..')
  envPath = resolve(parentDir, '.env')
  if (existsSync(envPath)) {
    return envPath
  }
  
  // Default to current directory
  return resolve(currentDir, '.env')
}

dotenv.config({ path: findEnvFile() })

export const config = {
  env: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
  
  database: {
    url: process.env.DATABASE_URL!,
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  upstash: {
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  },

  vercel: {
    cronSecret: process.env.CRON_SECRET || 'default-cron-secret',
    webhookSecret: process.env.WEBHOOK_SECRET || 'default-webhook-secret',
  },
  
  api: {
    port: parseInt(process.env.API_PORT || '4000'),
    baseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
  },
  
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || process.env.FRONTEND_URL || 'https://truecheckia.com',
  },
  
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  
  cors: {
    // Parse CORS origins from comma-separated string
    origins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
      : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:8080', 'http://localhost:8081', 'http://localhost:3000'],
    credentials: true,
  },
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    orgId: process.env.OPENAI_ORG_ID,
    models: {
      primary: 'gpt-4-turbo-preview',
      secondary: 'gpt-3.5-turbo',
      embedding: 'text-embedding-3-small',
    },
  },
  
  auth: {
    jwtSecret: process.env.JWT_SECRET!,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    bcryptRounds: 10,
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback',
    },
  },
  
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
    products: {
      pro: process.env.STRIPE_PRO_PRODUCT_ID || 'prod_StALX0bj5Ayx94',
      enterprise: process.env.STRIPE_ENTERPRISE_PRODUCT_ID || 'prod_StAL9bj35CWblw',
    },
    prices: {
      pro: {
        monthly: process.env.STRIPE_PRO_PRICE_MONTHLY || 'price_1QVChiPiTRheML5kyH1Aa6N7',
        annual: process.env.STRIPE_PRO_PRICE_ANNUAL || 'price_1QVChiPiTRheML5kyH1Aa6N8',
      },
      enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise',
    },
  },
  
  email: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025'),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@truecheckia.com',
  },
  
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    fromEmail: process.env.RESEND_FROM_EMAIL || 'TrueCheckIA <noreply@truecheckia.com>',
  },
  
  // Deprecated - use frontend.url instead
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  limits: {
    freeCredits: 10,
    rateLimit: {
      max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    },
    analysis: {
      minTextLength: 50,
      maxTextLength: 10000,
    },
  },
  
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '86400'), // 24 hours in seconds
    analysisPrefix: 'analysis:',
    userPrefix: 'user:',
  },
  
  analytics: {
    posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
}

// Validation
const requiredEnvVars = [
  'DATABASE_URL',
  'OPENAI_API_KEY',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
]

// Serverless required env vars (only in production)
const serverlessEnvVars = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
]

export const validateServerlessConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    const missing = serverlessEnvVars.filter(key => !process.env[key])
    
    if (missing.length > 0) {
      throw new Error(`Missing required serverless environment variables: ${missing.join(', ')}`)
    }
  }
}

export const validateConfig = () => {
  const missing = requiredEnvVars.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

// Constants
export const PLANS = {
  FREE: {
    name: 'Free',
    credits: 10,
    features: [
      '10 análises por mês',
      'Detecção básica de IA',
      'Histórico de 30 dias',
      'Suporte por email',
    ],
  },
  PRO: {
    name: 'Pro',
    credits: -1, // unlimited
    price: 19, // $19 USD mensal
    features: [
      'Análises ilimitadas',
      'Detecção avançada de IA',
      'API para integrações',
      'Histórico completo',
      'Relatórios em PDF',
      'Suporte prioritário',
      'Análise em lote',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    credits: -1,
    features: [
      'Tudo do Pro',
      'SLA garantido',
      'Suporte dedicado',
      'Treinamento personalizado',
      'API com rate limit maior',
      'White-label opcional',
    ],
  },
}

export const ERROR_CODES = {
  // Auth errors
  INVALID_CREDENTIALS: 'AUTH001',
  TOKEN_EXPIRED: 'AUTH002',
  UNAUTHORIZED: 'AUTH003',
  EMAIL_EXISTS: 'AUTH004',
  EMAIL_NOT_VERIFIED: 'AUTH005',
  
  // Analysis errors
  TEXT_TOO_SHORT: 'ANALYSIS001',
  TEXT_TOO_LONG: 'ANALYSIS002',
  INSUFFICIENT_CREDITS: 'ANALYSIS003',
  ANALYSIS_FAILED: 'ANALYSIS004',
  
  // Subscription errors
  PAYMENT_FAILED: 'SUB001',
  SUBSCRIPTION_EXPIRED: 'SUB002',
  
  // General errors
  VALIDATION_ERROR: 'GEN001',
  NOT_FOUND: 'GEN002',
  INTERNAL_ERROR: 'GEN003',
  RATE_LIMIT: 'GEN004',
  SERVICE_UNAVAILABLE: 'GEN005',
  NETWORK_ERROR: 'GEN006',
}

export default config