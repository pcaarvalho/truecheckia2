// Validador de ambiente para garantir configurações corretas
// Este arquivo pode ser usado para validar o ambiente em tempo de execução

import { env } from '@/config/env'
import { debug } from '@/lib/debug'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  info: Record<string, any>
}

export class EnvironmentValidator {
  static validate(): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: {
        environment: env.environment,
        apiBaseUrl: env.apiBaseUrl,
        appUrl: env.appUrl,
        version: env.version,
        buildDate: env.buildDate
      }
    }

    // Validações críticas para produção
    if (env.isProduction) {
      // URLs não podem conter localhost
      if (env.apiBaseUrl.includes('localhost') || env.apiBaseUrl.includes('127.0.0.1')) {
        result.errors.push('API Base URL cannot contain localhost in production')
        result.isValid = false
      }

      if (env.appUrl.includes('localhost') || env.appUrl.includes('127.0.0.1')) {
        result.errors.push('App URL cannot contain localhost in production')
        result.isValid = false
      }

      // URLs devem usar HTTPS
      if (!env.apiBaseUrl.startsWith('https://')) {
        result.errors.push('API Base URL must use HTTPS in production')
        result.isValid = false
      }

      if (!env.appUrl.startsWith('https://')) {
        result.errors.push('App URL must use HTTPS in production')
        result.isValid = false
      }

      // Avisos para configurações suspeitas
      if (env.stripePublishableKey.startsWith('pk_test_')) {
        result.warnings.push('Using Stripe test key in production')
      }

      if (!env.enableErrorTracking) {
        result.warnings.push('Error tracking is disabled in production')
      }
    }

    // Validações para desenvolvimento
    if (env.isDevelopment) {
      if (!env.apiBaseUrl.includes('localhost') && !env.apiBaseUrl.includes('127.0.0.1')) {
        result.warnings.push('Development environment using remote API')
      }

      if (env.apiBaseUrl.startsWith('https://') && env.apiBaseUrl.includes('localhost')) {
        result.warnings.push('Using HTTPS with localhost (may cause certificate issues)')
      }
    }

    // Validações gerais
    if (!env.apiBaseUrl || !env.appUrl) {
      result.errors.push('API Base URL and App URL are required')
      result.isValid = false
    }

    // Log dos resultados
    if (result.errors.length > 0) {
      debug.environmentError('Environment validation failed', result.errors)
    }

    if (result.warnings.length > 0) {
      debug.environmentWarn('Environment validation warnings', result.warnings)
    }

    if (result.isValid) {
      debug.environment('Environment validation passed', result.info)
    }

    return result
  }

  static validateAndThrow(): void {
    const result = this.validate()
    
    if (!result.isValid) {
      throw new Error(`Environment validation failed: ${result.errors.join('; ')}`)
    }
  }

  static logEnvironmentInfo(): void {
    console.log('🔧 Environment Information:')
    console.log(`  Environment: ${env.environment}`)
    console.log(`  API Base URL: ${env.apiBaseUrl}`)
    console.log(`  App URL: ${env.appUrl}`)
    console.log(`  Version: ${env.version}`)
    console.log(`  Build Date: ${env.buildDate}`)
    console.log(`  Analytics: ${env.enableAnalytics ? 'Enabled' : 'Disabled'}`)
    console.log(`  Error Tracking: ${env.enableErrorTracking ? 'Enabled' : 'Disabled'}`)
    console.log(`  PWA: ${env.enablePWA ? 'Enabled' : 'Disabled'}`)
  }

  static testAPIConnection(): Promise<boolean> {
    return new Promise(async (resolve) => {
      try {
        // Tenta uma requisição simples para testar a conectividade
        const healthUrl = env.apiBaseUrl.replace('/api', '/health')
        const response = await fetch(healthUrl, {
          method: 'GET',
          timeout: 5000
        } as any)
        
        const isHealthy = response.ok
        
        debug.environment('API connection test', {
          healthUrl,
          status: response.status,
          statusText: response.statusText,
          isHealthy
        })
        
        resolve(isHealthy)
      } catch (error) {
        debug.environmentError('API connection test failed', error)
        resolve(false)
      }
    })
  }
}

// Executa validação automática na inicialização
const validationResult = EnvironmentValidator.validate()

if (env.isDevelopment) {
  EnvironmentValidator.logEnvironmentInfo()
  
  // Torna disponível globalmente em desenvolvimento
  ;(window as any).validateEnvironment = EnvironmentValidator.validate
  ;(window as any).testAPIConnection = EnvironmentValidator.testAPIConnection
  console.log('🔧 Environment validator available at window.validateEnvironment() and window.testAPIConnection()')
}

export default EnvironmentValidator