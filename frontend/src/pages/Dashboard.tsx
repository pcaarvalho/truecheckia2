import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BarChart3, 
  FileText, 
  CreditCard, 
  Settings, 
  LogOut, 
  Search,
  History,
  User,
  Sparkles
} from 'lucide-react'
import axiosClient from '@/lib/axios'
import { CreditAlert, CreditStatus, CreditGuard, UpgradeModal, CreditTracker } from '@/components/credits'
import { useUserCredits } from '@/hooks/useUser'
import { useCredits } from '@/hooks/useCredits'
import { usePostLogin } from '@/hooks/usePostLogin'
import EmailVerificationBanner from '@/components/email-verification/EmailVerificationBanner'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data: credits } = useUserCredits()
  const { openUpgradeModal } = useCredits()
  
  // Handle post-login actions like checkout redirect
  usePostLogin();
  const [stats, setStats] = useState({
    totalAnalysis: 0,
    creditsRemaining: user?.credits || 10,
    plan: user?.plan || 'FREE',
    lastAnalysis: null
  })

  useEffect(() => {
    // Update stats from user data (no API call needed)
    if (user) {
      setStats(prev => ({
        ...prev,
        creditsRemaining: user.credits || 0,
        plan: user.plan || 'FREE'
      }))
    }
    
    // Handle checkout success/cancellation
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')
    
    if (success === 'true') {
      // Show success modal or toast
      setTimeout(() => {
        // Remove the URL parameter to avoid showing again
        window.history.replaceState({}, '', '/dashboard')
      }, 100)
    } else if (canceled === 'true') {
      // Show cancellation feedback
      setTimeout(() => {
        window.history.replaceState({}, '', '/dashboard')
      }, 100)
    }
  }, [searchParams, user])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const navigateToAnalysis = () => {
    navigate('/analysis')
  }

  const navigateToHistory = () => {
    navigate('/history')
  }

  const navigateToProfile = () => {
    navigate('/profile')
  }

  const navigateToSubscription = () => {
    navigate('/subscription')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg">
                <span className="text-xl font-bold text-white">TC</span>
              </div>
              <span className="ml-3 text-xl font-semibold text-gray-900">TrueCheckIA</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <CreditTracker useRealTimeData={true} className="mr-2" />
              <span className="text-sm text-gray-600">
                Hello, <span className="font-medium">{user?.name || user?.email}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to TrueCheckIA
          </h1>
          <p className="text-gray-600">
            Detect AI-generated content with precision and confidence
          </p>
        </div>

        {/* Email Verification Banner */}
        {user && (
          <div className="mb-6">
            <EmailVerificationBanner user={user} />
          </div>
        )}

        {/* Credit Alert */}
        {credits && (
          <div className="mb-6">
            <CreditAlert
              credits={credits.credits}
              unlimited={credits.unlimited}
              onUpgrade={() => openUpgradeModal('low_credits')}
            />
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {credits && (
            <CreditStatus
              credits={credits.credits}
              unlimited={credits.unlimited}
              plan={user?.plan || 'FREE'}
              daysUntilReset={credits.daysUntilReset}
              onUpgrade={() => openUpgradeModal('manual')}
            />
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Analyses Completed
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAnalysis}</div>
              <p className="text-xs text-muted-foreground">
                Total history
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Account Status
              </CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Active</div>
              <p className="text-xs text-muted-foreground">
                Account verified
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CreditGuard action="analysis">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={navigateToAnalysis}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Search className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle className="text-lg">New Analysis</CardTitle>
                <CardDescription>
                  Check if text was generated by AI
                </CardDescription>
              </CardHeader>
            </Card>
          </CreditGuard>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={navigateToHistory}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <History className="h-8 w-8 text-indigo-600" />
              </div>
              <CardTitle className="text-lg">History</CardTitle>
              <CardDescription>
                View previous analyses
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={navigateToProfile}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-lg">My Profile</CardTitle>
              <CardDescription>
                Manage personal data
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={navigateToSubscription}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CreditCard className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-lg">Subscription</CardTitle>
              <CardDescription>
                Manage plan and payments
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Recent Activity */}
        {stats.lastAnalysis && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Last Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Performed on: {new Date(stats.lastAnalysis).toLocaleString('en-US')}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}