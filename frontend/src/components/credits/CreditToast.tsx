import React from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Zap, AlertTriangle, CreditCard, CheckCircle } from 'lucide-react'

interface CreditToastOptions {
  onUpgrade?: () => void
}

/**
 * Custom hook for credit-specific toast notifications
 */
export function useCreditToast() {
  const { toast } = useToast()

  const showLowCreditWarning = (credits: number, options?: CreditToastOptions) => {
    const { onUpgrade } = options || {}
    
    return toast({
      title: 'Low Credits',
      description: `You have only ${credits} credits remaining.`,
      variant: 'default',
      action: onUpgrade ? (
        <Button variant="outline" size="sm" onClick={onUpgrade}>
          <Zap className="w-3 h-3 mr-1" />
          Upgrade
        </Button>
      ) : undefined,
    })
  }

  const showLastCreditWarning = (options?: CreditToastOptions) => {
    const { onUpgrade } = options || {}
    
    return toast({
      title: 'Last Credit',
      description: 'This is your last available credit!',
      variant: 'destructive',
      action: onUpgrade ? (
        <Button variant="destructive" size="sm" onClick={onUpgrade}>
          <AlertTriangle className="w-3 h-3 mr-1" />
          Upgrade Now
        </Button>
      ) : undefined,
    })
  }

  const showNoCreditsError = (options?: CreditToastOptions) => {
    const { onUpgrade } = options || {}
    
    return toast({
      title: 'Credits Exhausted',
      description: 'You have no more credits for analyses.',
      variant: 'destructive',
      action: onUpgrade ? (
        <Button variant="destructive" size="sm" onClick={onUpgrade}>
          <CreditCard className="w-3 h-3 mr-1" />
          Upgrade
        </Button>
      ) : undefined,
    })
  }

  const showAnalysisSuccess = (creditsRemaining: number, unlimited: boolean) => {
    const description = unlimited 
      ? 'Analysis completed successfully!' 
      : `Analysis completed! ${creditsRemaining} credits remaining.`
    
    return toast({
      title: 'Success',
      description,
      variant: 'default',
    })
  }

  const showUpgradeSuccess = (plan: string) => {
    return toast({
      title: 'Upgrade Completed!',
      description: `Welcome to the ${plan} plan. You now have access to advanced features.`,
      variant: 'default',
    })
  }

  const showCreditRefill = (newCredits: number) => {
    return toast({
      title: 'Credits Renewed',
      description: `Your credits have been renewed! You now have ${newCredits} credits available.`,
      variant: 'default',
    })
  }

  return {
    showLowCreditWarning,
    showLastCreditWarning,
    showNoCreditsError,
    showAnalysisSuccess,
    showUpgradeSuccess,
    showCreditRefill,
  }
}

export default useCreditToast