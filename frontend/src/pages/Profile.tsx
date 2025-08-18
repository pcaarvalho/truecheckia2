import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, LogOut } from 'lucide-react'
import { useUserProfile } from '@/hooks/useUser'
import { CreditTracker } from '@/components/credits'

// Profile components
import PersonalDataSection from '@/components/profile/PersonalDataSection'
import SecuritySection from '@/components/profile/SecuritySection'
import PlanCreditsSection from '@/components/profile/PlanCreditsSection'
import PreferencesSection from '@/components/profile/PreferencesSection'
import AccountSection from '@/components/profile/AccountSection'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { profile, isLoading } = useUserProfile()
  const [activeTab, setActiveTab] = useState('personal')

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleBack = () => {
    navigate('/dashboard')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
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
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            My Profile
          </h1>
          <p className="text-gray-600">
            Manage your personal information, security and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Profile Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full mx-auto flex items-center justify-center text-white text-2xl font-bold">
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </div>
                <CardTitle className="text-lg">{user?.name || 'User'}</CardTitle>
                <CardDescription className="text-sm">{user?.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Plan:</span>{' '}
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      user?.plan === 'PRO' ? 'bg-blue-100 text-blue-800' :
                      user?.plan === 'ENTERPRISE' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user?.plan === 'FREE' ? 'Free' : 
                       user?.plan === 'PRO' ? 'Pro' : 
                       user?.plan === 'ENTERPRISE' ? 'Enterprise' : 'Free'}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Credits:</span>{' '}
                    <span className="text-purple-600 font-semibold">
                      {user?.plan === 'FREE' ? user?.credits || 0 : 'Unlimited'}
                    </span>
                  </div>
                  {profile?.createdAt && (
                    <div className="text-sm">
                      <span className="font-medium">Member since:</span>{' '}
                      <span className="text-gray-600">
                        {new Date(profile.createdAt).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="personal">Personal Data</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="plan">Plan & Credits</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
                <TabsTrigger value="account">Account</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="mt-6">
                <PersonalDataSection profile={profile} />
              </TabsContent>

              <TabsContent value="security" className="mt-6">
                <SecuritySection />
              </TabsContent>

              <TabsContent value="plan" className="mt-6">
                <PlanCreditsSection profile={profile} />
              </TabsContent>

              <TabsContent value="preferences" className="mt-6">
                <PreferencesSection />
              </TabsContent>

              <TabsContent value="account" className="mt-6">
                <AccountSection profile={profile} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
}