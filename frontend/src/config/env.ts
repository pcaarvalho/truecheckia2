// Centralização das configurações de ambiente do frontend
// Este arquivo é o ponto único de acesso às variáveis de ambiente

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
  
  // API Base URL - com fallback para desenvolvimento
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:4000/api'
  
  // App URL - com fallback para desenvolvimento
  const appUrl = env.VITE_APP_URL || 'http://localhost:5173'
  
  // Stripe Publishable Key
  const stripePublishableKey = env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_'
  
  // Feature flags with defaults
  const enableAnalytics = env.VITE_ENABLE_ANALYTICS === 'true'
  const enableErrorTracking = env.VITE_ENABLE_ERROR_TRACKING === 'true'
  const enablePWA = env.VITE_ENABLE_PWA === 'true'
  
  // Build information
  const version = env.VITE_APP_VERSION || '1.0.0'
  const buildDate = env.VITE_BUILD_DATE || new Date().toISOString()
  
  // Log de configuração em desenvolvimento
  if (environment === 'development') {
    console.log('=== Environment Configuration ===')
    console.log('Environment:', environment)
    console.log('API Base URL:', apiBaseUrl)
    console.log('App URL:', appUrl)
    console.log('Version:', version)
    console.log('Analytics:', enableAnalytics)
    console.log('Error Tracking:', enableErrorTracking)
    console.log('PWA:', enablePWA)
    console.log('================================')
  }
  
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
    console.error('Missing required environment variables:', missing)
    console.error('Please check your .env file')
  }
  
  // Aviso se usando valores padrão em produção
  if (env.isProduction) {
    if (env.apiBaseUrl.includes('localhost')) {
      console.warn('WARNING: Using localhost API URL in production!')
    }
    if (env.appUrl.includes('localhost')) {
      console.warn('WARNING: Using localhost App URL in production!')
    }
    if (env.stripePublishableKey.startsWith('pk_test_')) {
      console.warn('WARNING: Using test Stripe key in production!')
    }
  }
  
  // Log important configurations
  if (env.isDevelopment) {
    console.log('Environment validation passed for development')
  }
}

// Chama a validação automaticamente
if (import.meta.env.DEV) {
  validateEnvironment()
}