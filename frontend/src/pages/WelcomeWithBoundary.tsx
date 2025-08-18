import ErrorBoundary from '@/components/ui/error-boundary'
import Welcome from './Welcome'

// Wrapper component with error boundary for the Welcome page
export default function WelcomeWithBoundary() {
  return (
    <ErrorBoundary>
      <Welcome />
    </ErrorBoundary>
  )
}