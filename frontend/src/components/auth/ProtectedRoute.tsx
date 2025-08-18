import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requirePlan?: 'PRO' | 'ENTERPRISE'
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  requirePlan,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  // Check plan requirements
  if (requirePlan) {
    const hasRequiredPlan = 
      user?.plan === requirePlan || 
      (requirePlan === 'PRO' && user?.plan === 'ENTERPRISE')
    
    if (!hasRequiredPlan) {
      return <Navigate to="/pricing" state={{ requiredPlan }} replace />
    }
  }

  return <>{children}</>
}

export default ProtectedRoute