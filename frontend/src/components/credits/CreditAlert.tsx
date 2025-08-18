import React from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Zap, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CreditAlertProps {
  credits: number
  unlimited: boolean
  onUpgrade?: () => void
  className?: string
}

export function CreditAlert({ credits, unlimited, onUpgrade, className }: CreditAlertProps) {
  // Don't show alert for unlimited plans
  if (unlimited || credits === -1) {
    return null
  }

  // Don't show alert if credits are above warning threshold
  if (credits > 3) {
    return null
  }

  const getAlertConfig = (credits: number) => {
    if (credits === 0) {
      return {
        variant: 'destructive' as const,
        icon: <CreditCard className="h-4 w-4" />,
        title: 'Credits Exhausted',
        description: 'You have no more credits for analyses. Upgrade to continue.',
        urgency: 'critical' as const,
        bgClass: 'border-red-200 bg-red-50',
        buttonText: 'Upgrade Now',
        buttonClass: 'bg-red-600 hover:bg-red-700 text-white'
      }
    } else if (credits === 1) {
      return {
        variant: 'destructive' as const,
        icon: <AlertTriangle className="h-4 w-4" />,
        title: 'Last Credit',
        description: 'This is your last available credit. Consider upgrading.',
        urgency: 'high' as const,
        bgClass: 'border-red-200 bg-red-50',
        buttonText: 'Upgrade',
        buttonClass: 'bg-red-600 hover:bg-red-700 text-white'
      }
    } else {
      return {
        variant: 'default' as const,
        icon: <Zap className="h-4 w-4" />,
        title: 'Low Credits',
        description: `You have only ${credits} credits remaining. Consider upgrading.`,
        urgency: 'medium' as const,
        bgClass: 'border-yellow-200 bg-yellow-50',
        buttonText: 'View Plans',
        buttonClass: 'bg-yellow-600 hover:bg-yellow-700 text-white'
      }
    }
  }

  const config = getAlertConfig(credits)

  return (
    <Alert 
      variant={config.variant} 
      className={cn(config.bgClass, className)}
    >
      {config.icon}
      <AlertTitle className="mb-2">{config.title}</AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <span>{config.description}</span>
        {onUpgrade && (
          <Button
            onClick={onUpgrade}
            size="sm"
            className={config.buttonClass}
          >
            {config.buttonText}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

export default CreditAlert