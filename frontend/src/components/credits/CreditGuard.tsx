import React, { ReactNode } from 'react'
import { useCredits } from '@/hooks/useCredits'
import UpgradeModal from './UpgradeModal'
import { useAuth } from '@/contexts/AuthContext'

interface CreditGuardProps {
  children: ReactNode
  action?: 'analysis' | 'api_usage' | 'general'
  onInsufficientCredits?: () => void
}

/**
 * CreditGuard is a wrapper component that intercepts actions requiring credits
 * and shows appropriate modals when credits are insufficient
 */
export function CreditGuard({ 
  children, 
  action = 'general',
  onInsufficientCredits 
}: CreditGuardProps) {
  const { user } = useAuth()
  const {
    hasCreditsForAnalysis,
    areCreditsEmpty,
    showUpgradeModal,
    openUpgradeModal,
    closeUpgradeModal
  } = useCredits()

  // Determine the reason for showing upgrade modal
  const getTriggerReason = () => {
    if (areCreditsEmpty) return 'no_credits'
    if (!hasCreditsForAnalysis) return 'low_credits'
    return 'manual'
  }

  // Wrap children to intercept click events when credits are insufficient
  const wrappedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      const originalOnClick = child.props.onClick

      const handleClick = (event: React.MouseEvent) => {
        // Check if action requires credits
        if (action === 'analysis' && !hasCreditsForAnalysis) {
          event.preventDefault()
          event.stopPropagation()
          
          // Show upgrade modal with appropriate reason
          openUpgradeModal(getTriggerReason())
          
          // Call custom handler if provided
          if (onInsufficientCredits) {
            onInsufficientCredits()
          }
          
          return
        }

        // If credits are sufficient or action doesn't require credits, proceed normally
        if (originalOnClick) {
          originalOnClick(event)
        }
      }

      return React.cloneElement(child as React.ReactElement<unknown>, {
        onClick: handleClick,
        disabled: action === 'analysis' && !hasCreditsForAnalysis ? true : child.props.disabled
      })
    }
    return child
  })

  return (
    <>
      {wrappedChildren}
      
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={closeUpgradeModal}
        currentPlan={user?.plan}
        triggerReason={getTriggerReason()}
      />
    </>
  )
}

export default CreditGuard