import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Download, Smartphone, Monitor, Share } from 'lucide-react';
import { pwaManager, PWAUtils } from '@/lib/pwa';
import { env } from '@/config/env';

interface PWAInstallProps {
  onClose?: () => void;
  className?: string;
}

const PWAInstall: React.FC<PWAInstallProps> = ({ onClose, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installationStatus, setInstallationStatus] = useState<'not-supported' | 'available' | 'installed'>('not-supported');

  useEffect(() => {
    if (!env.enablePWA) return;

    const updateInstallationStatus = () => {
      setInstallationStatus(pwaManager.getInstallationStatus());
    };

    // Initial check
    updateInstallationStatus();

    // Listen for PWA events
    const handleInstallAvailable = () => {
      setIsVisible(true);
      updateInstallationStatus();
    };

    const handleInstallCompleted = () => {
      setIsVisible(false);
      updateInstallationStatus();
    };

    const handleIOSPrompt = () => {
      setIsVisible(true);
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-install-completed', handleInstallCompleted);
    window.addEventListener('pwa-ios-install-prompt', handleIOSPrompt);

    // Show iOS prompt if applicable
    if (PWAUtils.isMobile() && installationStatus === 'available') {
      PWAUtils.showIOSInstallPrompt();
    }

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-install-completed', handleInstallCompleted);
      window.removeEventListener('pwa-ios-install-prompt', handleIOSPrompt);
    };
  }, [installationStatus]);

  const handleInstall = async () => {
    setIsInstalling(true);
    
    try {
      const success = await pwaManager.installPWA();
      if (success) {
        setIsVisible(false);
        setInstallationStatus('installed');
      }
    } catch (error) {
      console.error('Failed to install PWA:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!env.enablePWA || !isVisible || installationStatus === 'installed' || installationStatus === 'not-supported') {
    return null;
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <Card className={`fixed bottom-4 left-4 right-4 md:left-auto md:w-80 z-50 border-purple-200 bg-white/95 backdrop-blur-sm shadow-2xl ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Download className="w-4 h-4 text-purple-600" />
            </div>
            <CardTitle className="text-lg">Instalar TrueCheckIA</CardTitle>
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
          Instale nosso app para acesso mais rápido e recursos offline
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Benefits */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center space-x-2 text-gray-600">
              <Smartphone className="w-4 h-4 text-purple-500" />
              <span>Acesso rápido</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Monitor className="w-4 h-4 text-purple-500" />
              <span>Funciona offline</span>
            </div>
          </div>

          {/* Install Instructions */}
          {isIOS ? (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 font-medium mb-2">
                Para instalar no iOS:
              </p>
              <ol className="text-xs text-blue-700 space-y-1">
                <li>1. Toque no ícone <Share className="w-3 h-3 inline mx-1" /> (Compartilhar)</li>
                <li>2. Role para baixo e toque em "Adicionar à Tela de Início"</li>
                <li>3. Toque em "Adicionar" no canto superior direito</li>
              </ol>
            </div>
          ) : isAndroid ? (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800 font-medium mb-2">
                Para instalar no Android:
              </p>
              <p className="text-xs text-green-700">
                Um banner de instalação deve aparecer automaticamente, ou use o menu "Adicionar à tela inicial"
              </p>
            </div>
          ) : null}

          {/* Install Button */}
          {pwaManager.canInstall() && (
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isInstalling ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Instalando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Instalar App
                </>
              )}
            </Button>
          )}

          {/* Alternative for browsers that don't support install prompt */}
          {!pwaManager.canInstall() && !isIOS && (
            <p className="text-xs text-gray-500 text-center">
              Use o menu do seu navegador para "Adicionar à tela inicial"
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PWAInstall;