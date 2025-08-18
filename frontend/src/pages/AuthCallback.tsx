import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { updateUser } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Processing authentication...')

  useEffect(() => {
    const processCallback = async () => {
      try {
        const accessToken = searchParams.get('accessToken')
        const refreshToken = searchParams.get('refreshToken')
        const error = searchParams.get('error')

        if (error) {
          // Handle OAuth error
          setStatus('error')
          let errorMessage = 'Authentication failed'
          
          switch (error) {
            case 'auth_failed':
              errorMessage = 'Google authentication failed. Please try again.'
              break
            case 'oauth_failed':
              errorMessage = 'OAuth process failed. Please try again.'
              break
            case 'internal_error':
              errorMessage = 'An internal error occurred. Please try again later.'
              break
            default:
              errorMessage = 'Authentication failed. Please try again.'
          }
          
          setMessage(errorMessage)
          
          toast({
            title: 'Authentication Failed',
            description: errorMessage,
            variant: 'destructive',
          })

          // Redirect to login after a delay
          setTimeout(() => {
            navigate('/login')
          }, 3000)
          return
        }

        if (accessToken && refreshToken) {
          // Success - store tokens
          localStorage.setItem('accessToken', accessToken)
          localStorage.setItem('refreshToken', refreshToken)

          // Get user info from token payload (basic decode)
          try {
            const payload = JSON.parse(atob(accessToken.split('.')[1]))
            const userInfo = {
              id: payload.userId,
              email: payload.email,
              role: payload.role,
              plan: payload.plan,
              emailVerified: true, // Google accounts are always verified
            }
            
            localStorage.setItem('user', JSON.stringify(userInfo))
            updateUser(userInfo)
          } catch (e) {
            console.error('Error parsing token:', e)
          }

          setStatus('success')
          setMessage('Successfully signed in with Google!')
          
          toast({
            title: 'Welcome! 🎉',
            description: 'You have been successfully signed in with Google.',
          })

          // Redirect to dashboard
          setTimeout(() => {
            navigate('/dashboard')
          }, 2000)
        } else {
          // No tokens received
          setStatus('error')
          setMessage('No authentication tokens received')
          
          toast({
            title: 'Authentication Error',
            description: 'No authentication tokens received. Please try again.',
            variant: 'destructive',
          })

          setTimeout(() => {
            navigate('/login')
          }, 3000)
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        setStatus('error')
        setMessage('An unexpected error occurred')
        
        toast({
          title: 'Error',
          description: 'An unexpected error occurred during authentication.',
          variant: 'destructive',
        })

        setTimeout(() => {
          navigate('/login')
        }, 3000)
      }
    }

    processCallback()
  }, [searchParams, navigate, toast, updateUser])

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-500" />
      case 'error':
        return <XCircle className="w-16 h-16 text-red-500" />
      default:
        return <AlertCircle className="w-16 h-16 text-gray-500" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-blue-600'
      case 'success':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 text-center max-w-md w-full mx-4"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full mb-6"
        >
          <span className="text-3xl font-bold text-white">TC</span>
        </motion.div>

        {/* Status Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="flex justify-center mb-6"
        >
          {getIcon()}
        </motion.div>

        {/* Status Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <h1 className={`text-2xl font-bold mb-4 ${getStatusColor()}`}>
            {status === 'loading' && 'Authenticating...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Authentication Failed'}
          </h1>
          
          <p className="text-white/80 mb-6">
            {message}
          </p>

          {status === 'loading' && (
            <div className="flex items-center justify-center space-x-2 text-white/60">
              <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          )}

          {status !== 'loading' && (
            <p className="text-sm text-white/60">
              Redirecting in a moment...
            </p>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}