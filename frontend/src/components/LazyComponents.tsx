import { lazy, Suspense, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

// Loading component for suspense fallbacks
export const PageLoader = ({ message = "Carregando..." }: { message?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
    <div className="text-center">
      <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
      <p className="text-white text-lg font-medium">{message}</p>
      <p className="text-purple-200 text-sm mt-2">Aguarde um momento...</p>
    </div>
  </div>
);

// Smaller loader for components
export const ComponentLoader = ({ message = "Carregando..." }: { message?: string }) => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  </div>
);

// Higher-order component for lazy loading with suspense
export const withLazyLoading = <P extends object>(
  Component: React.ComponentType<P>,
  fallback: ReactNode = <PageLoader />
) => {
  const WrappedComponent = (props: P) => (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  );
  
  WrappedComponent.displayName = `withLazyLoading(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Lazy loaded page components
export const LazyDashboard = lazy(() => 
  import('@/pages/Dashboard').then(module => ({ default: module.default }))
);

export const LazyAnalysis = lazy(() => 
  import('@/pages/Analysis').then(module => ({ default: module.default }))
);

export const LazyHistory = lazy(() => 
  import('@/pages/History').then(module => ({ default: module.default }))
);

export const LazyProfile = lazy(() => 
  import('@/pages/Profile').then(module => ({ default: module.default }))
);

export const LazyOnboarding = lazy(() => 
  import('@/pages/Onboarding').then(module => ({ default: module.default }))
);

export const LazyOnboardingAnalytics = lazy(() => 
  import('@/pages/OnboardingAnalytics').then(module => ({ default: module.default }))
);

// Lazy loaded heavy components
export const LazyAnalysisResult = lazy(() => 
  import('@/components/analysis/AnalysisResult').then(module => ({ default: module.default }))
);

// Preload components for better UX
export const preloadComponent = (importFunction: () => Promise<any>) => {
  // Preload on mouse enter or focus
  return {
    onMouseEnter: () => importFunction(),
    onFocus: () => importFunction(),
  };
};

// Preload functions for critical routes
export const preloadCriticalComponents = () => {
  // Preload dashboard and analysis components after initial load
  setTimeout(() => {
    import('@/pages/Dashboard');
    import('@/pages/Analysis');
  }, 2000);
};

// Route-based code splitting configuration
export const LAZY_ROUTES = {
  dashboard: {
    component: LazyDashboard,
    preload: () => import('@/pages/Dashboard'),
  },
  analysis: {
    component: LazyAnalysis,
    preload: () => import('@/pages/Analysis'),
  },
  history: {
    component: LazyHistory,
    preload: () => import('@/pages/History'),
  },
  profile: {
    component: LazyProfile,
    preload: () => import('@/pages/Profile'),
  },
  onboarding: {
    component: LazyOnboarding,
    preload: () => import('@/pages/Onboarding'),
  },
  analytics: {
    component: LazyOnboardingAnalytics,
    preload: () => import('@/pages/OnboardingAnalytics'),
  },
} as const;