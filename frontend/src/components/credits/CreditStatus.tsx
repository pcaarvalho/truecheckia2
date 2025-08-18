import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  CreditCard, 
  Zap, 
  TrendingUp, 
  Clock,
  ArrowUpRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CreditStatusProps {
  credits: number
  unlimited: boolean
  plan: 'FREE' | 'PRO' | 'ENTERPRISE'
  daysUntilReset?: number | null
  onUpgrade?: () => void
  className?: string
}

export function CreditStatus({ 
  credits, 
  unlimited, 
  plan, 
  daysUntilReset,
  onUpgrade,
  className 
}: CreditStatusProps) {
  
  const getPlanConfig = (plan: string) => {
    switch (plan) {
      case 'PRO':
        return {
          name: 'Pro',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <Zap className="w-4 h-4" />
        }
      case 'ENTERPRISE':
        return {
          name: 'Enterprise',
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: <TrendingUp className="w-4 h-4" />
        }
      default:
        return {
          name: 'Free',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <CreditCard className="w-4 h-4" />
        }
    }
  }

  const planConfig = getPlanConfig(plan)

  const getCreditProgress = () => {
    if (unlimited) return 100
    
    // For free plan, max is 10
    const maxCredits = plan === 'FREE' ? 10 : 100
    return Math.min((credits / maxCredits) * 100, 100)
  }

  const getCreditColor = () => {
    if (unlimited) return 'text-green-600'
    if (credits === 0) return 'text-red-600'
    if (credits <= 3) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getProgressColor = () => {
    if (unlimited) return 'bg-green-500'
    if (credits === 0) return 'bg-red-500'
    if (credits <= 3) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          Available Credits
        </CardTitle>
        <Badge 
          variant="outline" 
          className={cn('text-xs', planConfig.color)}
        >
          <span className="flex items-center gap-1">
            {planConfig.icon}
            {planConfig.name}
          </span>
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Credit Display */}
        <div className="flex items-center justify-between">
          <div>
            <div className={cn('text-2xl font-bold', getCreditColor())}>
              {unlimited ? (
                <span className="flex items-center gap-2">
                  <Zap className="w-6 h-6" />
                  Unlimited
                </span>
              ) : (
                credits
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {unlimited 
                ? 'Unlimited analyses' 
                : `${credits === 1 ? 'credit' : 'credits'} remaining`
              }
            </p>
          </div>
          
          {!unlimited && plan === 'FREE' && onUpgrade && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUpgrade}
              className="text-xs h-8"
            >
              <ArrowUpRight className="w-3 h-3 mr-1" />
              Upgrade
            </Button>
          )}
        </div>

        {/* Progress Bar (only for non-unlimited plans) */}
        {!unlimited && (
          <div className="space-y-2">
            <Progress 
              value={getCreditProgress()} 
              className="h-2"
              // Custom color for the progress bar
              style={{
                background: 'rgb(229, 231, 235)', // gray-200
              }}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>{plan === 'FREE' ? '10' : '∞'}</span>
            </div>
          </div>
        )}

        {/* Reset Information for Free Plan */}
        {plan === 'FREE' && daysUntilReset !== null && daysUntilReset !== undefined && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-gray-50 rounded-md">
            <Clock className="w-3 h-3" />
            <span>
              {daysUntilReset > 0 
                ? `Next renewal in ${daysUntilReset} ${daysUntilReset === 1 ? 'day' : 'days'}`
                : 'Renewal today'
              }
            </span>
          </div>
        )}

        {/* Warning for Low Credits */}
        {!unlimited && credits <= 3 && credits > 0 && (
          <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md p-2">
            ⚠️ Low credits! Consider upgrading for unlimited analyses.
          </div>
        )}

        {/* No Credits Warning */}
        {!unlimited && credits === 0 && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md p-2">
            🚫 No credits available. Upgrade to continue.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CreditStatus