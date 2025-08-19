import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCcw, Home, Bug } from 'lucide-react'
import { motion } from 'framer-motion'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showErrorDetails?: boolean
  className?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

class ErrorBoundary extends Component<Props, State> {
  private retryTimeouts: NodeJS.Timeout[] = []

  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    retryCount: 0,
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      retryCount: 0,
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo,
    })

    // Call onError prop if provided
    this.props.onError?.(error, errorInfo)

    // Track error in analytics (if available)
    try {
      // You can integrate with your analytics service here
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'exception', {
          description: error.message,
          fatal: false,
        })
      }
    } catch (analyticsError) {
      console.warn('Failed to track error in analytics:', analyticsError)
    }
  }

  public componentWillUnmount() {
    // Clean up any retry timeouts
    this.retryTimeouts.forEach(clearTimeout)
  }

  private handleRetry = () => {
    const { retryCount } = this.state
    const maxRetries = 3
    
    if (retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
      }))
    }
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private handleReportBug = () => {
    const { error, errorInfo } = this.state
    
    const bugReport = {
      error: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace available',
      componentStack: errorInfo?.componentStack || 'No component stack available',
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    }

    // Create mailto link with bug report
    const subject = encodeURIComponent('Bug Report - TrueCheckIA')
    const body = encodeURIComponent(`
Bug Report Details:

Error: ${bugReport.error}

Stack Trace:
${bugReport.stack}

Component Stack:
${bugReport.componentStack}

Browser: ${bugReport.userAgent}
URL: ${bugReport.url}
Time: ${bugReport.timestamp}

Additional Information:
[Please describe what you were doing when this error occurred]
    `.trim())

    window.open(`mailto:support@truecheckia.com?subject=${subject}&body=${body}`)
  }

  public render() {
    const { hasError, error, errorInfo, retryCount } = this.state
    const { children, fallback, showErrorDetails = false, className } = this.props

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback
      }

      const isDevelopment = import.meta.env.DEV
      const canRetry = retryCount < 3

      return (
        <div className={`min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-orange-50 ${className || ''}`}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-2xl"
          >
            <Card className="border-red-200 shadow-lg">
              <CardHeader className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4"
                >
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </motion.div>
                
                <CardTitle className="text-2xl text-red-700">
                  Oops! Algo deu errado
                </CardTitle>
                <CardDescription className="text-lg">
                  Encontramos um erro inesperado. Não se preocupe, estamos trabalhando para resolver isso.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Error Message for Users */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    <strong>Erro:</strong> {error?.message || 'Erro desconhecido'}
                  </p>
                  {retryCount > 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      Tentativas de recuperação: {retryCount}/3
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {canRetry && (
                    <Button
                      onClick={this.handleRetry}
                      className="flex-1"
                      variant="default"
                    >
                      <RefreshCcw className="w-4 h-4 mr-2" />
                      Tentar Novamente
                    </Button>
                  )}
                  
                  <Button
                    onClick={this.handleReload}
                    variant="outline"
                    className="flex-1"
                  >
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Recarregar Página
                  </Button>
                  
                  <Button
                    onClick={this.handleGoHome}
                    variant="outline"
                    className="flex-1"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Ir para Início
                  </Button>
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={this.handleReportBug}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Bug className="w-4 h-4 mr-2" />
                    Reportar Bug
                  </Button>
                </div>

                {/* Developer Details */}
                {(isDevelopment || showErrorDetails) && error && (
                  <details className="bg-gray-50 border rounded-lg p-4">
                    <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                      Detalhes Técnicos (Desenvolvimento)
                    </summary>
                    
                    <div className="space-y-3 text-xs">
                      <div>
                        <strong>Error Message:</strong>
                        <pre className="bg-white p-2 rounded border mt-1 overflow-auto">
                          {error.message}
                        </pre>
                      </div>
                      
                      {error.stack && (
                        <div>
                          <strong>Stack Trace:</strong>
                          <pre className="bg-white p-2 rounded border mt-1 overflow-auto max-h-40">
                            {error.stack}
                          </pre>
                        </div>
                      )}
                      
                      {errorInfo?.componentStack && (
                        <div>
                          <strong>Component Stack:</strong>
                          <pre className="bg-white p-2 rounded border mt-1 overflow-auto max-h-40">
                            {errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                {/* Help Text */}
                <div className="text-center text-sm text-gray-600">
                  <p>
                    Se o problema persistir, entre em contato com nosso suporte em{' '}
                    <a 
                      href="mailto:support@truecheckia.com" 
                      className="text-blue-600 hover:underline"
                    >
                      support@truecheckia.com
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )
    }

    return children
  }
}

// Hook version for functional components
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const catchError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return { catchError, resetError }
}

// Higher-order component for wrapping components
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

export default ErrorBoundary