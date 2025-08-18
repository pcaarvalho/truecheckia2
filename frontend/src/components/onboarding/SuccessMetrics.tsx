import { useEffect } from 'react'

// Success metrics tracking for onboarding flow
export const useOnboardingMetrics = () => {
  
  const trackEvent = (event: string, properties?: Record<string, any>) => {
    // In a real app, this would send to analytics service like Mixpanel, Amplitude, etc.
    const timestamp = new Date().toISOString()
    const userId = localStorage.getItem('userId') || 'anonymous'
    
    const eventData = {
      event,
      properties: {
        ...properties,
        timestamp,
        userId,
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    }
    
    console.log('📊 Onboarding Event:', eventData)
    
    // Store in localStorage for demo purposes
    const events = JSON.parse(localStorage.getItem('onboarding_events') || '[]')
    events.push(eventData)
    localStorage.setItem('onboarding_events', JSON.stringify(events))
  }

  const trackOnboardingStart = () => {
    trackEvent('onboarding_started', {
      entry_point: 'welcome_page'
    })
  }

  const trackOnboardingStep = (step: number, stepName: string) => {
    trackEvent('onboarding_step_completed', {
      step_number: step,
      step_name: stepName
    })
  }

  const trackOnboardingComplete = () => {
    const startTime = localStorage.getItem('onboarding_start_time')
    const duration = startTime ? Date.now() - parseInt(startTime) : null
    
    trackEvent('onboarding_completed', {
      duration_ms: duration,
      completion_rate: 100
    })
  }

  const trackOnboardingSkipped = (currentStep: number) => {
    trackEvent('onboarding_skipped', {
      skipped_at_step: currentStep,
      completion_rate: (currentStep / 3) * 100
    })
  }

  const trackFirstAnalysisStart = () => {
    trackEvent('first_analysis_started', {
      source: 'onboarding_guided'
    })
  }

  const trackFirstAnalysisComplete = (analysisData: any) => {
    const onboardingStart = localStorage.getItem('onboarding_start_time')
    const timeToValue = onboardingStart ? Date.now() - parseInt(onboardingStart) : null
    
    trackEvent('first_analysis_completed', {
      time_to_value_ms: timeToValue,
      ai_probability: analysisData.aiProbability,
      text_length: analysisData.textLength
    })
    
    // Mark user as activated
    localStorage.setItem('user_activated', 'true')
    localStorage.setItem('activation_time', Date.now().toString())
  }

  const trackErrorEncountered = (error: string, context: string) => {
    trackEvent('onboarding_error', {
      error_message: error,
      error_context: context
    })
  }

  return {
    trackOnboardingStart,
    trackOnboardingStep,
    trackOnboardingComplete,
    trackOnboardingSkipped,
    trackFirstAnalysisStart,
    trackFirstAnalysisComplete,
    trackErrorEncountered
  }
}

// Helper to get current onboarding analytics
export const getOnboardingStats = () => {
  const events = JSON.parse(localStorage.getItem('onboarding_events') || '[]')
  
  const stats = {
    totalEvents: events.length,
    completedOnboarding: events.some((e: any) => e.event === 'onboarding_completed'),
    skippedOnboarding: events.some((e: any) => e.event === 'onboarding_skipped'),
    completedFirstAnalysis: events.some((e: any) => e.event === 'first_analysis_completed'),
    userActivated: localStorage.getItem('user_activated') === 'true',
    timeToActivation: null as number | null
  }
  
  const onboardingStart = events.find((e: any) => e.event === 'onboarding_started')
  const firstAnalysis = events.find((e: any) => e.event === 'first_analysis_completed')
  
  if (onboardingStart && firstAnalysis) {
    stats.timeToActivation = new Date(firstAnalysis.properties.timestamp).getTime() - 
                            new Date(onboardingStart.properties.timestamp).getTime()
  }
  
  return stats
}

// Component to display analytics (for development/admin use)
export const OnboardingAnalytics = () => {
  const stats = getOnboardingStats()
  const events = JSON.parse(localStorage.getItem('onboarding_events') || '[]')
  
  return (
    <div className="bg-gray-100 p-4 rounded-lg text-sm">
      <h3 className="font-semibold mb-2">Onboarding Analytics</h3>
      <div className="space-y-1">
        <p>Total Events: {stats.totalEvents}</p>
        <p>Completed Onboarding: {stats.completedOnboarding ? '✅' : '❌'}</p>
        <p>Skipped Onboarding: {stats.skippedOnboarding ? '⏭️' : '❌'}</p>
        <p>First Analysis Done: {stats.completedFirstAnalysis ? '✅' : '❌'}</p>
        <p>User Activated: {stats.userActivated ? '🎉' : '⏳'}</p>
        {stats.timeToActivation && (
          <p>Time to Activation: {Math.round(stats.timeToActivation / 1000)}s</p>
        )}
      </div>
      
      {events.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer">Recent Events</summary>
          <div className="mt-2 max-h-40 overflow-y-auto">
            {events.slice(-5).map((event: any, index: number) => (
              <div key={index} className="text-xs bg-white p-2 mb-1 rounded">
                <strong>{event.event}</strong>
                <div className="text-gray-600">
                  {new Date(event.properties.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}