import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Coins, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUserCredits } from '@/hooks/useUser'
import { useAuth } from '@/contexts/AuthContext'

interface CreditTrackerProps {
  currentCredits?: number
  maxCredits?: number
  plan?: 'FREE' | 'PRO' | 'ENTERPRISE'
  className?: string
  useRealTimeData?: boolean // Whether to fetch real-time data via API
}

export function CreditTracker({ 
  currentCredits: propCredits, 
  maxCredits = 10, 
  plan: propPlan,
  className,
  useRealTimeData = false
}: CreditTrackerProps) {
  const { user, isAuthenticated } = useAuth()
  const { data: creditsData } = useUserCredits()
  
  // Don't render if user is not authenticated
  if (!isAuthenticated || !user) {
    return null
  }
  
  // Use real-time data if requested and available, otherwise fallback to props or user data
  const currentCredits = useRealTimeData && creditsData
    ? creditsData.credits
    : propCredits ?? user?.credits ?? 0
    
  const plan = propPlan ?? user?.plan ?? 'FREE'
  // Check if credits are unlimited (-1 means unlimited or specific plans)
  const isUnlimited = currentCredits === -1 || plan === 'PRO' || plan === 'ENTERPRISE' || 
    (useRealTimeData && creditsData?.unlimited)
  
  // Determine color based on credit level (only for limited plans)
  const getVariantAndColor = () => {
    if (isUnlimited) {
      return {
        variant: 'default' as const,
        color: 'text-white',
        bgColor: 'bg-gradient-to-r from-purple-500 to-blue-600 text-white border-transparent hover:from-purple-600 hover:to-blue-700'
      }
    }
    
    if (currentCredits > 5) {
      return {
        variant: 'default' as const,
        color: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200 hover:bg-green-100 text-green-700'
      }
    } else if (currentCredits >= 3) {
      return {
        variant: 'secondary' as const,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100 text-yellow-700'
      }
    } else {
      return {
        variant: 'destructive' as const,
        color: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200 hover:bg-red-100 text-red-700'
      }
    }
  }

  const { variant, color, bgColor } = getVariantAndColor()
  
  // Display text based on plan and credits
  const displayText = isUnlimited 
    ? 'Unlimited' 
    : `${currentCredits}/${maxCredits}`
    
  // Tooltip message
  const getTooltipMessage = () => {
    if (isUnlimited) {
      return 'Pro/Enterprise Plan: Unlimited analyses'
    }
    if (currentCredits === 0) {
      return 'No credits available. Consider upgrading to Pro.'
    }
    if (currentCredits < 3) {
      return `Low credits remaining (${currentCredits}/${maxCredits}). Consider upgrading.`
    }
    return `Available credits: ${currentCredits} of ${maxCredits}`
  }

  return (
    <div className={cn("flex items-center gap-2", className)} title={getTooltipMessage()}>
      <Badge 
        variant={isUnlimited ? 'default' : variant}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1 transition-all duration-200 cursor-default",
          bgColor
        )}
      >
        {!isUnlimited && currentCredits < 3 ? (
          <AlertTriangle className="h-3 w-3" />
        ) : (
          <Coins className="h-3 w-3" />
        )}
        <span className="font-medium text-xs">
          {displayText}
          {!isUnlimited && <span className="ml-1 opacity-75">credits</span>}
        </span>
      </Badge>
      
      {/* Show progress bar for free plan */}
      {!isUnlimited && (
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-300 rounded-full",
                currentCredits > 5 ? "bg-green-500" :
                currentCredits >= 3 ? "bg-yellow-500" : "bg-red-500"
              )}
              style={{ 
                width: `${Math.max(0, (currentCredits / maxCredits) * 100)}%` 
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default CreditTracker