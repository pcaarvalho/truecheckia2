import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'
import GoogleSignInButton from '@/components/auth/GoogleSignInButton'

const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z.string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const { login } = useAuth()

  // Handle intended plan after login
  useEffect(() => {
    const intendedPlan = searchParams.get('plan')
    const message = searchParams.get('message')
    
    if (message) {
      toast({
        title: 'Welcome!',
        description: decodeURIComponent(message),
        duration: 4000,
      })
    }
  }, [searchParams, toast])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      await login(data.email, data.password)
      const intendedPlan = searchParams.get('plan')
      
      if (intendedPlan) {
        toast({
          title: 'Login successful!',
          description: `Redirecting to ${intendedPlan} plan...`,
        })
        // Redirect to pricing with the intended plan
        navigate(`/?plan=${intendedPlan}#pricing`)
      } else {
        toast({
          title: 'Login successful!',
          description: 'Redirecting to dashboard...',
        })
        navigate('/dashboard')
      }
    } catch (error: any) {
      let errorMessage = 'Please check your credentials and try again.'
      let title = 'Login failed'
      
      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message === 'NETWORK_ERROR') {
        errorMessage = 'Connection error. Please check your internet and try again.'
        title = 'Connection error'
      } else if (error.code === 'INVALID_CREDENTIALS') {
        errorMessage = 'Invalid email or password. Please check your credentials.'
        title = 'Invalid credentials'
      }
      
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
            <h1 className="text-3xl font-bold text-white mb-2">Welcome back!</h1>
            <p className="text-purple-200">Sign in to your TrueCheckIA account</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            </div>

            <div className="flex items-center justify-between">
              <Link
                to="/forgot-password"
                className="text-sm text-purple-300 hover:text-white transition-colors"
              >
                Forgot password?
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
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-transparent px-2 text-purple-300">Or</span>
            </div>
          </div>

          {/* Google Sign In */}
          <div className="mb-8">
            <GoogleSignInButton 
              text="Sign in with Google"
              disabled={isLoading}
            />
          </div>

          {/* Sign up link */}
          <div className="text-center">
            <p className="text-purple-200">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-white font-semibold hover:text-purple-300 transition-colors"
              >
                Sign up free
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