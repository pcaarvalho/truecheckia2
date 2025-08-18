import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useUserCredits } from '@/hooks/useUser'
import { useCredits } from '@/hooks/useCredits'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CreditCard, Calendar, Star, Zap, Crown, ArrowUpRight, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import type { User } from '@/types/api'
import userService from '@/services/user.service'

interface PlanCreditsSectionProps {
  profile: User | undefined
}

export default function PlanCreditsSection({ profile }: PlanCreditsSectionProps) {
  const { user } = useAuth()
  const { data: credits, refetch: refetchCredits } = useUserCredits()
  const { openUpgradeModal } = useCredits()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const currentPlan = user?.plan || 'FREE'
  const planDetails = userService.getPlanDetails(currentPlan)

  // Mock subscription history (in a real app, this would come from an API)
  const subscriptionHistory = [
    {
      id: 1,
      date: '2024-01-15',
      plan: 'PRO',
      amount: 'R$ 29,90',
      status: 'Active',
      nextRenewal: '2024-02-15'
    },
    {
      id: 2,
      date: '2023-12-15',
      plan: 'PRO',
      amount: 'R$ 29,90',
      status: 'Completed',
      nextRenewal: null
    }
  ]

  const handleRefreshCredits = async () => {
    setIsRefreshing(true)
    try {
      await refetchCredits()
      toast.success('Credits updated!')
    } catch (error) {
      toast.error('Error updating credits')
    } finally {
      setIsRefreshing(false)
    }
  }

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'PRO':
        return <Star className="h-5 w-5" />
      case 'ENTERPRISE':
        return <Crown className="h-5 w-5" />
      default:
        return <Zap className="h-5 w-5" />
    }
  }

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'PRO':
        return 'border-blue-200 bg-blue-50'
      case 'ENTERPRISE':
        return 'border-purple-200 bg-purple-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
          <CardDescription>
            Information about your plan and benefits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`border-2 rounded-lg p-6 ${getPlanColor(currentPlan)}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {getPlanIcon(currentPlan)}
                <div>
                  <h3 className="text-xl font-bold">{planDetails.name}</h3>
                  <p className="text-sm text-gray-600">
                    {currentPlan === 'FREE' ? 'Free' : 
                     currentPlan === 'PRO' ? 'R$ 29,90/month' : 
                     'Contact sales'}
                  </p>
                </div>
              </div>
              <Badge className={planDetails.color}>
                {currentPlan === 'FREE' ? 'Free' : 
                 currentPlan === 'PRO' ? 'Pro' : 'Enterprise'}
              </Badge>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Included features:</h4>
              <ul className="space-y-2">
                {planDetails.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-current rounded-full" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {currentPlan === 'FREE' && (
              <div className="mt-6">
                <Button 
                  onClick={() => openUpgradeModal('manual')}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Credits Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Credits
              </CardTitle>
              <CardDescription>
                Status of your available credits
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshCredits}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {credits ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Available Credits</span>
                <span className="text-2xl font-bold text-purple-600">
                  {credits.unlimited ? '∞' : credits.credits}
                </span>
              </div>

              {!credits.unlimited && (
                <>
                  <Progress 
                    value={(credits.credits / 10) * 100} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{credits.credits} of 10 credits</span>
                    {credits.daysUntilReset && (
                      <span>Renewal in {credits.daysUntilReset} days</span>
                    )}
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    {profile?.totalAnalyses || 0}
                  </div>
                  <div className="text-sm text-gray-600">
                    Analyses Completed
                  </div>
                </div>
                
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">
                    {credits.unlimited ? 'Unlimited' : `${10 - credits.credits} used`}
                  </div>
                  <div className="text-sm text-gray-600">
                    This Period
                  </div>
                </div>
              </div>

              {currentPlan === 'FREE' && credits.credits <= 2 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-orange-800 mb-2">
                    <strong>Low credits remaining!</strong>
                  </p>
                  <p className="text-sm text-orange-700 mb-3">
                    You have only {credits.credits} credits remaining. 
                    Consider upgrading for unlimited access.
                  </p>
                  <Button 
                    size="sm" 
                    onClick={() => openUpgradeModal('low_credits')}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Upgrade
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading credits...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription History */}
      {currentPlan !== 'FREE' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Subscription History
            </CardTitle>
            <CardDescription>
              Payment and renewal history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next Renewal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptionHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {new Date(item.date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.plan}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.amount}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'Active' ? 'default' : 'secondary'}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.nextRenewal ? 
                        new Date(item.nextRenewal).toLocaleDateString('pt-BR') : 
                        '-'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Compare Plans</CardTitle>
          <CardDescription>
            See all available plans and their features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['FREE', 'PRO', 'ENTERPRISE'] as const).map((plan) => {
              const details = userService.getPlanDetails(plan)
              const isCurrent = plan === currentPlan
              
              return (
                <div 
                  key={plan}
                  className={`border-2 rounded-lg p-4 ${
                    isCurrent ? 'border-purple-300 bg-purple-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{details.name}</h3>
                    {isCurrent && (
                      <Badge className="bg-purple-600">Current</Badge>
                    )}
                  </div>
                  
                  <div className="text-2xl font-bold mb-2">
                    {plan === 'FREE' ? 'Free' : 
                     plan === 'PRO' ? 'R$ 29,90' : 
                     'Contact us'}
                  </div>
                  
                  <ul className="text-sm space-y-1 mb-4">
                    {details.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-current rounded-full" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  {!isCurrent && (
                    <Button 
                      size="sm" 
                      variant={plan === 'PRO' ? 'default' : 'outline'}
                      className="w-full"
                      onClick={() => openUpgradeModal('manual')}
                    >
                      {plan === 'PRO' ? 'Choose Pro' : 'Contact'}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}