import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { PageLoader } from "@/components/LazyComponents";
import { usePerformance, useMemoryMonitoring, useBundleAnalysis } from "@/hooks/usePerformance";
import { pwaManager } from "@/lib/pwa";
import { env } from "@/config/env";

// Eagerly loaded pages (critical for initial load)
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import AuthCallback from "./pages/AuthCallback";
import TestAPI from "./pages/TestAPI";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// Lazy loaded pages (loaded on demand)
const Welcome = lazy(() => import("./pages/Welcome"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const OnboardingAnalytics = lazy(() => import("./pages/OnboardingAnalytics"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Analysis = lazy(() => import("./pages/Analysis"));
const History = lazy(() => import("./pages/History"));
const Profile = lazy(() => import("./pages/Profile"));

// Optimized QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors except 408, 429
        if (error?.status >= 400 && error?.status < 500 && ![408, 429].includes(error?.status)) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: 'always',
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

// Performance and PWA initialization component
const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  const performance = usePerformance();
  
  // Initialize performance monitoring
  useMemoryMonitoring();
  useBundleAnalysis();
  
  useEffect(() => {
    // Initialize PWA manager
    if (env.enablePWA) {
      // PWA is already initialized in the constructor
      console.log('PWA manager initialized');
    }
    
    // Log environment info in development
    if (env.isDevelopment) {
      console.log('App initialized with environment:', env.environment);
    }
    
    // Preload critical components after initial render
    const preloadTimer = setTimeout(() => {
      // Preload dashboard and analysis components for authenticated users
      import('./pages/Dashboard');
      import('./pages/Analysis');
    }, 2000);
    
    return () => clearTimeout(preloadTimer);
  }, []);
  
  return <>{children}</>;
};

// Simple placeholder for missing component
const SimpleTooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppInitializer>
          <SimpleTooltipProvider>
            <Toaster />
            <BrowserRouter>
              <Suspense fallback={<PageLoader message="Carregando aplicação..." />}>
                <Routes>
                  {/* Public routes - eagerly loaded */}
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/test-api" element={<TestAPI />} />
                  
                  {/* Onboarding routes - protected and lazy loaded */}
                  <Route path="/welcome" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoader message="Carregando boas-vindas..." />}>
                        <Welcome />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/onboarding" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoader message="Carregando onboarding..." />}>
                        <Onboarding />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/analytics" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoader message="Carregando analytics..." />}>
                        <OnboardingAnalytics />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  
                  {/* Protected routes - require authentication and lazy loaded */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoader message="Carregando dashboard..." />}>
                        <Dashboard />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/analysis" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoader message="Carregando análise..." />}>
                        <Analysis />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/history" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoader message="Carregando histórico..." />}>
                        <History />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoader message="Carregando perfil..." />}>
                        <Profile />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/subscription" element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoader message="Carregando assinatura..." />}>
                        <Dashboard />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  
                  {/* 404 Page */}
                  <Route path="*" element={
                    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
                      <div className="text-center">
                        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
                        <p className="text-purple-200 text-lg mb-6">Página não encontrada</p>
                        <a href="/" className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all">
                          Voltar ao início
                        </a>
                      </div>
                    </div>
                  } />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </SimpleTooltipProvider>
        </AppInitializer>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;