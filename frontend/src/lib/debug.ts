// Utilidade de debug para desenvolvimento
// Centraliza logs de debug e oferece controle granular

interface DebugConfig {
  api: boolean
  auth: boolean
  registration: boolean
  general: boolean
  environment: boolean
}

class DebugLogger {
  private config: DebugConfig = {
    api: true,
    auth: true,
    registration: true,
    general: true,
    environment: true,
  }

  private isDev = import.meta.env.DEV

  // Enable/disable debug categories
  setConfig(newConfig: Partial<DebugConfig>) {
    this.config = { ...this.config, ...newConfig }
  }

  // Main logging method
  private log(category: keyof DebugConfig, level: 'log' | 'warn' | 'error', message: string, data?: any) {
    if (!this.isDev || !this.config[category]) return

    const timestamp = new Date().toISOString().split('T')[1].slice(0, 12)
    const prefix = `[${category.toUpperCase()}] ${timestamp}`

    switch (level) {
      case 'log':
        console.log(`${prefix} ${message}`, data || '')
        break
      case 'warn':
        console.warn(`${prefix} ${message}`, data || '')
        break
      case 'error':
        console.error(`${prefix} ${message}`, data || '')
        break
    }
  }

  // Category-specific methods
  api(message: string, data?: any) {
    this.log('api', 'log', message, data)
  }

  apiError(message: string, error?: any) {
    this.log('api', 'error', message, error)
  }

  auth(message: string, data?: any) {
    this.log('auth', 'log', message, data)
  }

  authError(message: string, error?: any) {
    this.log('auth', 'error', message, error)
  }

  registration(message: string, data?: any) {
    this.log('registration', 'log', message, data)
  }

  registrationError(message: string, error?: any) {
    this.log('registration', 'error', message, error)
  }

  general(message: string, data?: any) {
    this.log('general', 'log', message, data)
  }

  generalError(message: string, error?: any) {
    this.log('general', 'error', message, error)
  }

  environment(message: string, data?: any) {
    this.log('environment', 'log', message, data)
  }

  environmentError(message: string, error?: any) {
    this.log('environment', 'error', message, error)
  }

  environmentWarn(message: string, data?: any) {
    this.log('environment', 'warn', message, data)
  }

  // Utility methods
  logResponse(category: keyof DebugConfig, response: any) {
    this.log(category, 'log', 'Response received:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers
    })
  }

  logError(category: keyof DebugConfig, error: any) {
    this.log(category, 'error', 'Error occurred:', {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.statusCode,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : null,
      stack: error.stack
    })
  }

  // Enable debug in console for production testing
  enableAll() {
    this.config = {
      api: true,
      auth: true,
      registration: true,
      general: true,
      environment: true,
    }
    console.log('[DEBUG] All debug categories enabled')
  }

  disableAll() {
    this.config = {
      api: false,
      auth: false,
      registration: false,
      general: false,
      environment: false,
    }
    console.log('[DEBUG] All debug categories disabled')
  }

  // Show current config
  showConfig() {
    console.log('[DEBUG] Current configuration:', this.config)
  }
}

// Export singleton instance
export const debug = new DebugLogger()

// Make it globally available in development
if (import.meta.env.DEV) {
  (window as any).debug = debug
  console.log('🐛 Debug utilities available at window.debug')
  console.log('Usage: debug.enableAll(), debug.registration("message", data), etc.')
}

export default debug