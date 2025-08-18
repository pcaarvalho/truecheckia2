import { useEffect, useState } from 'react'
import { useUserCredits } from '@/hooks/useUser'
import { useCreditToast } from '@/components/credits/CreditToast'

interface CreditNotificationConfig {
  showLowCreditWarnings: boolean
  showUpgradeModal: boolean
  lastWarningCredits: number | null
}

export function useCredits() {
  const { data: credits, refetch: refetchCredits } = useUserCredits()
  const { 
    showLowCreditWarning, 
    showLastCreditWarning, 
    showNoCreditsError,
    showAnalysisSuccess 
  } = useCreditToast()
  const [notifications, setNotifications] = useState<CreditNotificationConfig>({
    showLowCreditWarnings: true,
    showUpgradeModal: false,
    lastWarningCredits: null
  })

  const currentCredits = credits?.credits ?? 0
  const isUnlimited = credits?.unlimited ?? false

  // Check if user has sufficient credits for analysis
  const hasCreditsForAnalysis = isUnlimited || currentCredits > 0

  // Check if credits are low (3 or fewer)
  const areCreditsLow = !isUnlimited && currentCredits <= 3 && currentCredits > 0

  // Check if credits are depleted
  const areCreditsEmpty = !isUnlimited && currentCredits === 0

  // Show toast notifications for credit changes
  useEffect(() => {
    if (isUnlimited) return

    const { lastWarningCredits, showLowCreditWarnings } = notifications

    // Show warning when credits reach critical levels
    if (showLowCreditWarnings && lastWarningCredits !== currentCredits) {
      if (currentCredits === 0) {
        showNoCreditsError({
          onUpgrade: () => showUpgradeModal('no_credits')
        })
      } else if (currentCredits === 1) {
        showLastCreditWarning({
          onUpgrade: () => showUpgradeModal('low_credits')
        })
      } else if (currentCredits === 3) {
        showLowCreditWarning(currentCredits, {
          onUpgrade: () => showUpgradeModal('low_credits')
        })
      }

      setNotifications(prev => ({
        ...prev,
        lastWarningCredits: currentCredits
      }))
    }
  }, [currentCredits, isUnlimited, notifications, showLowCreditWarning, showLastCreditWarning, showNoCreditsError])

  // Function to consume a credit (call this after successful analysis)
  const consumeCredit = async () => {
    if (!isUnlimited && currentCredits > 0) {
      // Optimistically update the cache
      const result = await refetchCredits()
      
      // Show success notification with remaining credits
      if (result.data) {
        showAnalysisSuccess(result.data.credits, result.data.unlimited)
      }
    }
  }

  // Function to check if user can perform analysis
  const canPerformAnalysis = (): { canAnalyze: boolean; reason?: string } => {
    if (isUnlimited) {
      return { canAnalyze: true }
    }

    if (currentCredits > 0) {
      return { canAnalyze: true }
    }

    return { 
      canAnalyze: false, 
      reason: 'You do not have enough credits for this analysis.' 
    }
  }

  // Function to show upgrade modal
  const showUpgradeModal = (reason: 'no_credits' | 'low_credits' | 'manual' = 'manual') => {
    setNotifications(prev => ({
      ...prev,
      showUpgradeModal: true
    }))
  }

  // Function to hide upgrade modal
  const hideUpgradeModal = () => {
    setNotifications(prev => ({
      ...prev,
      showUpgradeModal: false
    }))
  }

  // Function to disable warnings temporarily
  const disableWarnings = () => {
    setNotifications(prev => ({
      ...prev,
      showLowCreditWarnings: false
    }))
  }

  return {
    // Credit information
    credits: currentCredits,
    isUnlimited,
    hasCreditsForAnalysis,
    areCreditsLow,
    areCreditsEmpty,
    
    // Functions
    consumeCredit,
    canPerformAnalysis,
    refetchCredits,
    
    // Modal state
    showUpgradeModal: notifications.showUpgradeModal,
    openUpgradeModal: showUpgradeModal,
    closeUpgradeModal: hideUpgradeModal,
    
    // Notification controls
    disableWarnings,
    
    // Format helpers
    formatCredits: (credits: number, unlimited: boolean): string => {
      if (unlimited || credits === -1) {
        return 'Unlimited'
      }
      return `${credits} ${credits === 1 ? 'credit' : 'credits'}`
    }
  }
}

export default useCredits