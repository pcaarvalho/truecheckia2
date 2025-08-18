import { useState } from 'react'
import { AlertCircle, Mail, X, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import api from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'

interface EmailVerificationBannerProps {
  user: {
    email: string
    emailVerified?: boolean
  }
  onDismiss?: () => void
}

export function EmailVerificationBanner({ user, onDismiss }: EmailVerificationBannerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const { toast } = useToast()

  // Don't show if email is already verified or banner is dismissed
  if (user.emailVerified || isDismissed) {
    return null
  }

  const handleResendEmail = async () => {
    setIsLoading(true)
    try {
      await api.post('/auth/resend-verification-auth')
      
      toast({
        title: 'Verification email sent! 📧',
        description: 'Please check your inbox and spam folder.',
      })
    } catch (error: unknown) {
      const errorMessage = (error as any)?.response?.data?.message || 'Failed to send verification email'
      
      toast({
        title: 'Error sending email',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <Alert className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-l-amber-400 shadow-sm">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2 flex-1">
              <Mail className="h-4 w-4 text-amber-600" />
              <div>
                <span className="font-medium text-amber-800">
                  Please verify your email to unlock all features
                </span>
                <p className="text-sm text-amber-700 mt-1">
                  We sent a verification link to <strong>{user.email}</strong>. 
                  Verify your email to access premium features like subscriptions and API keys.
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendEmail}
                disabled={isLoading}
                className="bg-white border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-3 w-3 mr-1" />
                    Resend Email
                  </>
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-6 w-6 p-0 text-amber-600 hover:text-amber-800 hover:bg-amber-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </motion.div>
    </AnimatePresence>
  )
}

export default EmailVerificationBanner