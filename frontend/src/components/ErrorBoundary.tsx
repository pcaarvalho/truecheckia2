import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  const isDevelopment = import.meta.env.DEV;

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4">
      <Card className="w-full max-w-md mx-auto bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Oops! Algo deu errado
          </CardTitle>
          <CardDescription className="text-gray-300">
            Ocorreu um erro inesperado. Nosso time foi notificado automaticamente.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {isDevelopment && (
            <div className="p-4 bg-red-900/30 rounded-lg border border-red-500/30">
              <h4 className="text-sm font-medium text-red-300 mb-2">Erro (Desenvolvimento):</h4>
              <p className="text-xs text-red-200 font-mono break-words">
                {error.message}
              </p>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-red-300 cursor-pointer hover:text-red-200">
                    Stack trace
                  </summary>
                  <pre className="text-xs text-red-200 mt-1 overflow-auto max-h-32">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={resetErrorBoundary}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleReload}
              className="flex-1 border-white/30 text-white hover:bg-white/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Recarregar Página
            </Button>
          </div>
          
          <Button 
            variant="ghost"
            onClick={handleGoHome}
            className="w-full text-gray-300 hover:text-white hover:bg-white/10"
          >
            <Home className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

const AppErrorBoundary: React.FC<AppErrorBoundaryProps> = ({ children }) => {
  const handleError = (error: Error, errorInfo: { componentStack: string }) => {
    // Log error details
    console.error('Error caught by boundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    // In production, you could send this to an error tracking service
    if (import.meta.env.PROD) {
      // Example: Send to Sentry, LogRocket, etc.
      // captureException(error, { extra: errorInfo });
    }
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={() => {
        // Optional: Clear any error state, refresh data, etc.
        console.log('Error boundary reset');
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
};

export default AppErrorBoundary;