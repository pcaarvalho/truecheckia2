import { env } from '@/config/env';

// PWA installation and updates management
export class PWAManager {
  private deferredPrompt: any = null;
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    if (!env.enablePWA || !('serviceWorker' in navigator)) {
      return;
    }

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA install prompt available');
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPromotion();
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.hideInstallPromotion();
      this.deferredPrompt = null;
    });

    // Check if app is running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('PWA is running in standalone mode');
    }

    // Register service worker for updates
    this.registerSW();
  }

  private async registerSW() {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        
        this.swRegistration = registration;
        console.log('Service Worker registered successfully:', registration);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.showUpdateAvailable();
              }
            });
          }
        });

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  // Show install promotion UI
  private showInstallPromotion() {
    // You can implement a custom install banner here
    console.log('Show install promotion');
    
    // Example: Create a toast or banner
    const event = new CustomEvent('pwa-install-available');
    window.dispatchEvent(event);
  }

  private hideInstallPromotion() {
    const event = new CustomEvent('pwa-install-completed');
    window.dispatchEvent(event);
  }

  // Show update available notification
  private showUpdateAvailable() {
    console.log('Update available');
    
    const event = new CustomEvent('pwa-update-available');
    window.dispatchEvent(event);
  }

  // Install PWA
  public async installPWA(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      console.log(`User response to install prompt: ${outcome}`);
      
      this.deferredPrompt = null;
      return outcome === 'accepted';
    } catch (error) {
      console.error('Error installing PWA:', error);
      return false;
    }
  }

  // Update PWA
  public async updatePWA(): Promise<void> {
    if (!this.swRegistration) {
      return;
    }

    try {
      if (this.swRegistration.waiting) {
        // Tell the waiting service worker to skip waiting
        this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Reload the page to activate the new service worker
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating PWA:', error);
    }
  }

  // Check if PWA can be installed
  public canInstall(): boolean {
    return this.deferredPrompt !== null;
  }

  // Check if running as PWA
  public isPWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  // Get PWA installation status
  public getInstallationStatus(): 'not-supported' | 'available' | 'installed' {
    if (!('serviceWorker' in navigator)) {
      return 'not-supported';
    }
    
    if (this.isPWA()) {
      return 'installed';
    }
    
    return 'available';
  }
}

// Global PWA manager instance
export const pwaManager = new PWAManager();

// PWA utility functions
export const PWAUtils = {
  // Check if device supports PWA
  isSupported: (): boolean => {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  },

  // Check if user is on mobile
  isMobile: (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  },

  // Get PWA display mode
  getDisplayMode: (): string => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
    const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
    
    if (isFullscreen) return 'fullscreen';
    if (isStandalone) return 'standalone';
    if (isMinimalUI) return 'minimal-ui';
    return 'browser';
  },

  // Add to home screen prompt for iOS
  showIOSInstallPrompt: (): void => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = (window.navigator as any).standalone;
    
    if (isIOS && !isInStandaloneMode) {
      // Show iOS specific install instructions
      const event = new CustomEvent('pwa-ios-install-prompt');
      window.dispatchEvent(event);
    }
  },
};