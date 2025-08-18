import { useEffect, useCallback, useRef } from 'react';
import { env } from '@/config/env';

interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
}

interface NavigationTiming {
  loadTime: number;
  domLoadTime: number;
  connectTime: number;
  responseTime: number;
}

// Performance monitoring class
class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private observers: PerformanceObserver[] = [];
  private navigationTiming: NavigationTiming | null = null;

  constructor() {
    this.initializePerformanceObservers();
    this.measureNavigationTiming();
  }

  private initializePerformanceObservers() {
    // First Contentful Paint (FCP)
    this.observeMetric('first-contentful-paint', (entry) => {
      this.metrics.fcp = entry.startTime;
      this.logMetric('FCP', entry.startTime);
    });

    // Largest Contentful Paint (LCP)
    this.observeMetric('largest-contentful-paint', (entry) => {
      this.metrics.lcp = entry.startTime;
      this.logMetric('LCP', entry.startTime);
    });

    // First Input Delay (FID)
    this.observeMetric('first-input', (entry) => {
      this.metrics.fid = entry.processingStart - entry.startTime;
      this.logMetric('FID', this.metrics.fid);
    });

    // Cumulative Layout Shift (CLS)
    this.observeMetric('layout-shift', (entry) => {
      if (!entry.hadRecentInput) {
        this.metrics.cls = (this.metrics.cls || 0) + entry.value;
        this.logMetric('CLS', this.metrics.cls);
      }
    });

    // Navigation timing
    this.observeMetric('navigation', (entry) => {
      this.metrics.ttfb = entry.responseStart;
      this.logMetric('TTFB', entry.responseStart);
    });
  }

  private observeMetric(entryType: string, callback: (entry: any) => void) {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(callback);
      });

      observer.observe({ entryTypes: [entryType] });
      this.observers.push(observer);
    } catch (error) {
      console.warn(`Performance observer for ${entryType} not supported:`, error);
    }
  }

  private measureNavigationTiming() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          this.navigationTiming = {
            loadTime: navigation.loadEventEnd - navigation.loadEventStart,
            domLoadTime: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            connectTime: navigation.connectEnd - navigation.connectStart,
            responseTime: navigation.responseEnd - navigation.responseStart,
          };

          this.logNavigationTiming();
        }
      }, 0);
    });
  }

  private logMetric(name: string, value: number) {
    if (env.isDevelopment) {
      console.log(`[Performance] ${name}: ${value.toFixed(2)}ms`);
    }

    // In production, send to analytics service
    if (env.isProduction && env.enableAnalytics) {
      this.sendToAnalytics(name, value);
    }
  }

  private logNavigationTiming() {
    if (!this.navigationTiming) return;

    if (env.isDevelopment) {
      console.log('[Performance] Navigation Timing:', this.navigationTiming);
    }

    // Send to analytics in production
    if (env.isProduction && env.enableAnalytics) {
      this.sendToAnalytics('navigation', this.navigationTiming);
    }
  }

  private sendToAnalytics(metricName: string, value: number | NavigationTiming) {
    // Example: Send to your analytics service
    // This could be Google Analytics, PostHog, etc.
    try {
      // Analytics implementation would go here
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'performance_metric', {
          metric_name: metricName,
          metric_value: typeof value === 'number' ? value : JSON.stringify(value),
        });
      }
    } catch (error) {
      console.warn('Failed to send performance metric to analytics:', error);
    }
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getNavigationTiming(): NavigationTiming | null {
    return this.navigationTiming;
  }

  public getResourceTiming(): PerformanceResourceTiming[] {
    return performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  }

  public disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Memory usage monitoring
export const useMemoryMonitoring = () => {
  useEffect(() => {
    const logMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryInfo = {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        };

        if (env.isDevelopment) {
          console.log('[Performance] Memory Usage:', memoryInfo);
        }

        // Warn if memory usage is high
        const memoryUsagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (memoryUsagePercent > 80) {
          console.warn('High memory usage detected:', memoryUsagePercent.toFixed(2) + '%');
        }
      }
    };

    // Log memory usage every 30 seconds in development
    const interval = env.isDevelopment ? setInterval(logMemoryUsage, 30000) : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);
};

// Bundle size monitoring
export const useBundleAnalysis = () => {
  useEffect(() => {
    if (env.isDevelopment) {
      // Log loaded scripts and their sizes
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));

      console.log('[Bundle Analysis] Loaded Scripts:', scripts.length);
      console.log('[Bundle Analysis] Loaded Stylesheets:', stylesheets.length);

      // Estimate bundle sizes from resource timing
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const jsResources = resources.filter(resource => resource.name.includes('.js'));
      const cssResources = resources.filter(resource => resource.name.includes('.css'));

      const totalJSSize = jsResources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0);
      const totalCSSSize = cssResources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0);

      console.log('[Bundle Analysis] Estimated JS Size:', (totalJSSize / 1024).toFixed(2) + ' KB');
      console.log('[Bundle Analysis] Estimated CSS Size:', (totalCSSSize / 1024).toFixed(2) + ' KB');
    }
  }, []);
};

// Main performance monitoring hook
export const usePerformance = () => {
  const monitorRef = useRef<PerformanceMonitor | null>(null);

  useEffect(() => {
    // Initialize performance monitor
    monitorRef.current = new PerformanceMonitor();

    // Cleanup on unmount
    return () => {
      if (monitorRef.current) {
        monitorRef.current.disconnect();
      }
    };
  }, []);

  const getMetrics = useCallback(() => {
    return monitorRef.current?.getMetrics() || {};
  }, []);

  const getNavigationTiming = useCallback(() => {
    return monitorRef.current?.getNavigationTiming() || null;
  }, []);

  const getResourceTiming = useCallback(() => {
    return monitorRef.current?.getResourceTiming() || [];
  }, []);

  return {
    getMetrics,
    getNavigationTiming,
    getResourceTiming,
  };
};

// Web Vitals thresholds
export const WEB_VITALS_THRESHOLDS = {
  FCP: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint
  LCP: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint
  FID: { good: 100, needsImprovement: 300 },   // First Input Delay
  CLS: { good: 0.1, needsImprovement: 0.25 },  // Cumulative Layout Shift
  TTFB: { good: 800, needsImprovement: 1800 }, // Time to First Byte
};

// Utility to assess Web Vitals score
export const assessWebVital = (metric: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
  const thresholds = WEB_VITALS_THRESHOLDS[metric as keyof typeof WEB_VITALS_THRESHOLDS];
  
  if (!thresholds) return 'good';
  
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.needsImprovement) return 'needs-improvement';
  return 'poor';
};