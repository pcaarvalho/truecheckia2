import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { motion } from 'framer-motion'
import api from '@/lib/api'
import GoogleSignInButton from '@/components/auth/GoogleSignInButton'
import { PasswordStrengthIndicator } from '@/components/ui/PasswordStrengthIndicator'
import { usePostLogin } from '@/hooks/usePostLogin'
import { debug } from '@/lib/debug'

const registerSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(254, 'Email is too long'),
  password: z.string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function Register() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()

  // Handle plan and message parameters
  useEffect(() => {
    const plan = searchParams.get('plan')
    const message = searchParams.get('message')
    const source = searchParams.get('source')
    
    if (message) {
      toast({
        title: plan ? `${plan.toUpperCase()} Plan Selected` : 'Welcome to TrueCheckIA!',
        description: decodeURIComponent(message),
        duration: 5000,
      })
    }
  }, [searchParams, toast])
  const { storeSignupEmail } = usePostLogin()

  // Pre-fill email from signup flow
  useState(() => {
    const savedEmail = localStorage.getItem('signup_email');
    if (savedEmail) {
      // Pre-fill the form with saved email
      // Note: This would require useEffect to properly set form values
    }
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const watchedPassword = watch('password', '')

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    
    try {
      debug.registration('Starting registration process', {
        email: data.email,
        name: data.name,
        hasPassword: !!data.password
      })
      
      const response = await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
      })
      
      debug.registration('Full response received', response)
      
      // Handle different response formats
      let accessToken, refreshToken, user
      
      // Check if response has nested data structure (backend format)
      if (response.data && response.data.data) {
        debug.registration('Using nested data format (backend structure)')
        accessToken = response.data.data.accessToken
        refreshToken = response.data.data.refreshToken
        user = response.data.data.user
      } 
      // Check if response has direct data structure (axios processed format)
      else if (response.data) {
        debug.registration('Using direct data format (axios processed)')
        accessToken = response.data.accessToken || response.accessToken
        refreshToken = response.data.refreshToken || response.refreshToken
        user = response.data.user || response.user
      }
      // Fallback - try response directly
      else {
        debug.registration('Using response direct format (fallback)')
        accessToken = response.accessToken
        refreshToken = response.refreshToken
        user = response.user
      }
      
      debug.registration('Extracted tokens and user data', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasUser: !!user,
        userEmail: user?.email,
        userPlan: user?.plan,
        userCredits: user?.credits
      })
      
      // Auto-login with returned tokens
      if (accessToken && refreshToken && user) {
        debug.registration('Storing tokens and user data in localStorage')
        
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        localStorage.setItem('user', JSON.stringify(user))
        
        debug.registration('Tokens stored successfully, preparing for redirect')
        
        toast({
          title: 'Welcome to TrueCheckIA! 🎉',
          description: 'Your account has been created and you can start using the platform immediately!',
        })
        
        debug.registration('Redirecting to dashboard - registration complete!')
        // Redirect to dashboard immediately
        navigate('/dashboard')
      } else {
        debug.registration('No tokens received, using email verification flow')
        
        // Fallback to old behavior if tokens not returned
        toast({
          title: 'Account created successfully!',
          description: 'Please check your email to activate your account.',
        })
        
        navigate('/verify-email', { 
          state: { email: data.email } 
        })
      }
    } catch (error: any) {
      debug.registrationError('Registration failed', error)
      
      let errorMessage = 'An error occurred while creating your account.'
      let title = 'Registration failed'
      
      // Handle ApiError (from axios interceptor)
      if (error.code) {
        if (error.code === 'EMAIL_EXISTS') {
          errorMessage = 'This email is already registered. Please try logging in instead.'
          title = 'Email already exists'
        } else if (error.code === 'NETWORK_ERROR') {
          errorMessage = 'Connection error. Please check your internet and try again.'
          title = 'Connection error'
        } else {
          errorMessage = error.message || errorMessage
        }
      }
      // Handle standard HTTP errors
      else if (error.response) {
        const status = error.response.status
        const responseData = error.response.data
        
        if (status === 409 && responseData?.error?.message) {
          errorMessage = responseData.error.message
          title = 'Email already exists'
        } else if (responseData?.error?.message) {
          errorMessage = responseData.error.message
        } else if (responseData?.message) {
          errorMessage = responseData.message
        } else if (status >= 500) {
          errorMessage = 'Server error. Please try again later.'
          title = 'Server error'
        } else if (status === 429) {
          errorMessage = 'Too many requests. Please wait a moment and try again.'
          title = 'Rate limit exceeded'
        }
      }
      // Handle network errors
      else if (!error.response) {
        errorMessage = 'Connection error. Please check your internet and try again.'
        title = 'Connection error'
      }
      
      debug.registration('Showing error toast to user', { title, errorMessage })
      
      toast({
        title,
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full mb-4"
            >
              <span className="text-3xl font-bold text-white">TC</span>
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">Create your account</h1>
            <p className="text-purple-200">Start detecting AI content for free</p>
          </div>

          {/* Register Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">
                Full name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300 w-5 h-5" />
                <Input
                  {...register('name')}
                  id="name"
                  type="text"
                  placeholder="John Smith"
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-purple-300 focus:border-purple-400 focus:ring-purple-400"
                  disabled={isLoading}
                />
              </div>
              {errors.name && (
                <p className="text-red-400 text-sm">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300 w-5 h-5" />
                <Input
                  {...register('email')}
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-purple-300 focus:border-purple-400 focus:ring-purple-400"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-sm">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300 w-5 h-5" />
                <Input
                  {...register('password')}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-purple-300 focus:border-purple-400 focus:ring-purple-400"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-sm">{errors.password.message}</p>
              )}
              
              {/* Password strength indicator */}
              <PasswordStrengthIndicator password={watchedPassword} className="mt-3" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">
                Confirm password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300 w-5 h-5" />
                <Input
                  {...register('confirmPassword')}
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-purple-300 focus:border-purple-400 focus:ring-purple-400"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-400 text-sm">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="text-xs text-purple-200">
              By creating an account, you agree to our{' '}
              <Link to="/terms" className="text-white hover:text-purple-300">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-white hover:text-purple-300">
                Privacy Policy
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create free account'
              )}
            </Button>
          </form>

          {/* Benefits */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center text-sm text-purple-200">
              <span className="mr-2">✨</span> 10 free analyses per month
            </div>
            <div className="flex items-center text-sm text-purple-200">
              <span className="mr-2">🤖</span> 95% accuracy detection
            </div>
            <div className="flex items-center text-sm text-purple-200">
              <span className="mr-2">📊</span> Complete dashboard
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-transparent px-2 text-purple-300">Or</span>
            </div>
          </div>

          {/* Google Sign In */}
          <div className="mb-6">
            <GoogleSignInButton 
              text="Sign up with Google"
              disabled={isLoading}
            />
          </div>

          {/* Sign in link */}
          <div className="text-center">
            <p className="text-purple-200">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-white font-semibold hover:text-purple-300 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            to="/"
            className="text-purple-300 hover:text-white transition-colors text-sm"
          >
            ← Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  )
}