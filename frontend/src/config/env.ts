// Centralização das configurações de ambiente do frontend
// Este arquivo é o ponto único de acesso às variáveis de ambiente
//
// MELHORIAS IMPLEMENTADAS:
// 1. Validação rigorosa para produção - NUNCA permite localhost
// 2. Throw de erro se variáveis críticas não estiverem definidas em produção
// 3. Logs detalhados para debug e monitoramento
// 4. Validação de HTTPS obrigatório em produção
// 5. Validação automática executada sempre (não só em desenvolvimento)
//
// CONFIGURAÇÃO POR AMBIENTE:
// - Development: Permite fallbacks para localhost
// - Staging: Validação intermediária
// - Production: Validação rigorosa, HTTPS obrigatório, sem localhost

interface EnvironmentConfig {
  // API Configuration
  apiBaseUrl: string
  
  // Application Configuration
  appUrl: string
  
  // Stripe Configuration
  stripePublishableKey: string
  
  // Analytics (optional)
  posthogKey?: string
  posthogHost?: string
  
  // Error Tracking
  sentryDsn?: string
  
  // Feature Flags
  enableAnalytics: boolean
  enableErrorTracking: boolean
  enablePWA: boolean
  
  // Environment
  environment: 'development' | 'staging' | 'production'
  isDevelopment: boolean
  isProduction: boolean
  isStaging: boolean
  
  // Build info
  version: string
  buildDate: string
}

// Função para validar e retornar a configuração
function loadEnvironmentConfig(): EnvironmentConfig {
  const env = import.meta.env
  
  // Determina o ambiente atual
  const environment = (env.VITE_ENV as 'development' | 'staging' | 'production') || 'development'
  
  // API Base URL - validação rigorosa para produção
  let apiBaseUrl: string
  if (environment === 'production') {
    if (!env.VITE_API_BASE_URL) {
      throw new Error('CRITICAL: VITE_API_BASE_URL must be set in production environment')
    }
    if (env.VITE_API_BASE_URL.includes('localhost')) {
      throw new Error('CRITICAL: Production environment cannot use localhost URLs')
    }
    apiBaseUrl = env.VITE_API_BASE_URL
  } else {
    // Fallback apenas para desenvolvimento e staging
    apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:4000/api'
  }
  
  // App URL - validação rigorosa para produção
  let appUrl: string
  if (environment === 'production') {
    if (!env.VITE_APP_URL) {
      throw new Error('CRITICAL: VITE_APP_URL must be set in production environment')
    }
    if (env.VITE_APP_URL.includes('localhost')) {
      throw new Error('CRITICAL: Production environment cannot use localhost URLs')
    }
    appUrl = env.VITE_APP_URL
  } else {
    // Fallback apenas para desenvolvimento e staging
    appUrl = env.VITE_APP_URL || 'http://localhost:5173'
  }
  
  // Stripe Publishable Key
  const stripePublishableKey = env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_'
  
  // Feature flags with defaults
  const enableAnalytics = env.VITE_ENABLE_ANALYTICS === 'true'
  const enableErrorTracking = env.VITE_ENABLE_ERROR_TRACKING === 'true'
  const enablePWA = env.VITE_ENABLE_PWA === 'true'
  
  // Build information
  const version = env.VITE_APP_VERSION || '1.0.0'
  const buildDate = env.VITE_BUILD_DATE || new Date().toISOString()
  
  // Log de configuração sempre (importante para debug em produção)
  console.log('=== TrueCheckIA Environment Configuration ===')
  console.log('Environment:', environment)
  console.log('API Base URL:', apiBaseUrl)
  console.log('App URL:', appUrl)
  console.log('Version:', version)
  console.log('Build Date:', buildDate)
  
  if (environment === 'development') {
    console.log('Analytics:', enableAnalytics)
    console.log('Error Tracking:', enableErrorTracking)
    console.log('PWA:', enablePWA)
  }
  
  // Alertas críticos para produção
  if (environment === 'production') {
    console.log('🚀 PRODUCTION MODE ACTIVE')
    if (apiBaseUrl.includes('localhost') || appUrl.includes('localhost')) {
      console.error('🚨 CRITICAL ERROR: Localhost URLs detected in production!')
      throw new Error('Production environment cannot use localhost URLs')
    }
    console.log('✅ Production URLs validated')
  }
  
  console.log('=============================================')
  
  return {
    apiBaseUrl,
    appUrl,
    stripePublishableKey,
    posthogKey: env.VITE_POSTHOG_KEY,
    posthogHost: env.VITE_POSTHOG_HOST,
    sentryDsn: env.VITE_SENTRY_DSN,
    enableAnalytics,
    enableErrorTracking,
    enablePWA,
    environment,
    isDevelopment: environment === 'development',
    isProduction: environment === 'production',
    isStaging: environment === 'staging',
    version,
    buildDate,
  }
}

// Exporta a configuração como constante
export const env = loadEnvironmentConfig()

// Valida configurações críticas
export function validateEnvironment(): void {
  const requiredVars: (keyof EnvironmentConfig)[] = ['apiBaseUrl', 'appUrl']
  
  const missing = requiredVars.filter(key => !env[key])
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing)
    console.error('Please check your .env file')
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
  
  // Validação rigorosa para produção
  if (env.isProduction) {
    const errors: string[] = []
    
    if (env.apiBaseUrl.includes('localhost')) {
      errors.push('API Base URL cannot be localhost in production')
    }
    
    if (env.appUrl.includes('localhost')) {
      errors.push('App URL cannot be localhost in production')
    }
    
    if (!env.apiBaseUrl.startsWith('https://')) {
      errors.push('API Base URL must use HTTPS in production')
    }
    
    if (!env.appUrl.startsWith('https://')) {
      errors.push('App URL must use HTTPS in production')
    }
    
    if (env.stripePublishableKey.startsWith('pk_test_')) {
      console.warn('⚠️ WARNING: Using test Stripe key in production!')
    }
    
    if (errors.length > 0) {
      console.error('🚨 PRODUCTION VALIDATION FAILED:')
      errors.forEach(error => console.error(`  - ${error}`))
      throw new Error(`Production validation failed: ${errors.join('; ')}`)
    }
    
    console.log('✅ Production environment validation passed')
  } else {
    console.log(`✅ ${env.environment} environment validation passed`)
  }
}

// Chama a validação automaticamente sempre (crítico para produção)
validateEnvironment()