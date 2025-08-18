import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui/use-toast'
import api from '@/lib/api'

interface EmailVerificationState {
  status: 'idle' | 'loading' | 'success' | 'error'
  email: string
  isResending: boolean
  cooldownTime: number
  redirectCountdown: number
  errorDetails: string
}

export function useEmailVerification(email?: string, token?: string) {
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [state, setState] = useState<EmailVerificationState>({
    status: 'idle',
    email: email || '',
    isResending: false,
    cooldownTime: 0,
    redirectCountdown: 0,
    errorDetails: ''
  })

  // Initialize cooldown from localStorage
  useEffect(() => {
    const lastResend = localStorage.getItem('email_resend_cooldown')
    if (lastResend) {
      const timeSinceLastResend = Date.now() - parseInt(lastResend)
      const remainingCooldown = Math.max(0, 60000 - timeSinceLastResend) // 60 seconds cooldown
      if (remainingCooldown > 0) {
        setState(prev => ({
          ...prev,
          cooldownTime: Math.ceil(remainingCooldown / 1000)
        }))
      }
    }
  }, [])

  // Auto-verify if token is present
  useEffect(() => {
    if (token) {
      verifyEmail(token)
    }
  }, [token])

  // Cooldown timer
  useEffect(() => {
    if (state.cooldownTime > 0) {
      const timer = setTimeout(() => {
        setState(prev => ({
          ...prev,
          cooldownTime: prev.cooldownTime - 1
        }))
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [state.cooldownTime])

  // Redirect countdown
  useEffect(() => {
    if (state.redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setState(prev => ({
          ...prev,
          redirectCountdown: prev.redirectCountdown - 1
        }))
      }, 1000)
      return () => clearTimeout(timer)
    } else if (state.redirectCountdown === 0 && state.status === 'success') {
      navigate('/welcome')
    }
  }, [state.redirectCountdown, state.status, navigate])

  const verifyEmail = useCallback(async (verificationToken: string) => {
    setState(prev => ({
      ...prev,
      status: 'loading',
      errorDetails: ''
    }))
    
    try {
      const response = await api.post('/auth/verify-email', {
        token: verificationToken,
      })

      setState(prev => ({
        ...prev,
        status: 'success'
      }))

      toast({
        title: 'Email verified successfully!',
        description: 'Your account has been activated. Redirecting...',
      })

      // Store tokens if returned
      if (response.data.data?.accessToken) {
        localStorage.setItem('accessToken', response.data.data.accessToken)
        localStorage.setItem('refreshToken', response.data.data.refreshToken)
        
        // Start countdown for redirect
        setState(prev => ({
          ...prev,
          redirectCountdown: 3
        }))
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Invalid or expired token'
      
      setState(prev => ({
        ...prev,
        status: 'error',
        errorDetails: errorMessage
      }))
      
      toast({
        title: 'Verification error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }, [toast])

  const resendVerification = useCallback(async (emailToResend?: string) => {
    const targetEmail = emailToResend || state.email
    
    if (!targetEmail) {
      toast({
        title: 'Email required',
        description: 'Please provide your email to resend the link.',
        variant: 'destructive',
      })
      return false
    }

    if (state.cooldownTime > 0) {
      toast({
        title: 'Please wait',
        description: `You can request a new email in ${state.cooldownTime} seconds.`,
        variant: 'destructive',
      })
      return false
    }

    setState(prev => ({
      ...prev,
      isResending: true
    }))

    try {
      await api.post('/auth/resend-verification', { email: targetEmail })
      
      toast({
        title: 'Email resent successfully!',
        description: 'Check your inbox and spam folder.',
      })
      
      // Set cooldown
      localStorage.setItem('email_resend_cooldown', Date.now().toString())
      setState(prev => ({
        ...prev,
        cooldownTime: 60,
        email: targetEmail
      }))
      
      return true
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error resending email'
      toast({
        title: 'Error resending',
        description: errorMessage,
        variant: 'destructive',
      })
      return false
    } finally {
      setState(prev => ({
        ...prev,
        isResending: false
      }))
    }
  }, [state.email, state.cooldownTime, toast])

  const updateEmail = useCallback((newEmail: string) => {
    setState(prev => ({
      ...prev,
      email: newEmail
    }))
  }, [])

  const skipToWelcome = useCallback(() => {
    navigate('/welcome')
  }, [navigate])

  return {
    ...state,
    verifyEmail,
    resendVerification,
    updateEmail,
    skipToWelcome
  }
}