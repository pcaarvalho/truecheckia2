import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, X, Download } from 'lucide-react';
import { pwaManager } from '@/lib/pwa';
import { env } from '@/config/env';

interface PWAUpdateProps {
  onClose?: () => void;
  className?: string;
}

const PWAUpdate: React.FC<PWAUpdateProps> = ({ onClose, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!env.enablePWA) return;

    const handleUpdateAvailable = () => {
      setIsVisible(true);
    };

    window.addEventListener('pwa-update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
    };
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    try {
      await pwaManager.updatePWA();
      // The page will reload automatically after update
    } catch (error) {
      console.error('Failed to update PWA:', error);
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const handleLater = () => {
    setIsVisible(false);
    // Show again after 1 hour
    setTimeout(() => {
      setIsVisible(true);
    }, 60 * 60 * 1000);
  };

  if (!env.enablePWA || !isVisible) {
    return null;
  }

  return (
    <Card className={`fixed top-4 left-4 right-4 md:left-auto md:w-80 z-50 border-blue-200 bg-white/95 backdrop-blur-sm shadow-2xl ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-blue-600" />
            </div>
            <CardTitle className="text-lg">Atualização Disponível</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Uma nova versão do TrueCheckIA está disponível com melhorias e correções
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Update Benefits */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              O que há de novo:
            </h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Melhorias de performance</li>
              <li>• Correções de bugs</li>
              <li>• Novos recursos de análise</li>
              <li>• Interface aprimorada</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-2">
            <Button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isUpdating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Atualizando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Atualizar Agora
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleLater}
              disabled={isUpdating}
              className="w-full"
            >
              Lembrar Depois
            </Button>
          </div>

          {/* Info Text */}
          <p className="text-xs text-gray-500 text-center">
            A atualização será aplicada após o reinício da aplicação
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PWAUpdate;