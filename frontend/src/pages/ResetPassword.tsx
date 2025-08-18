import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, Loader2, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { motion } from 'framer-motion'
import api from '@/lib/api'

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isInvalidToken, setIsInvalidToken] = useState(false)

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setIsInvalidToken(true)
      toast({
        title: 'Invalid link',
        description: 'The password reset link is invalid or missing.',
        variant: 'destructive',
      })
    }
  }, [token])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return

    setIsLoading(true)
    try {
      await api.post('/auth/reset-password', {
        token,
        password: data.password,
      })
      
      setIsSuccess(true)
      toast({
        title: 'Password reset!',
        description: 'Your password has been successfully changed.',
      })
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (error: any) {
      toast({
        title: 'Error resetting password',
        description: error.response?.data?.message || 'Invalid or expired token.',
        variant: 'destructive',
      })
      
      if (error.response?.status === 400) {
        setIsInvalidToken(true)
      }
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

            {isSuccess ? (
              <>
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-white mb-2">Password reset!</h1>
                <p className="text-purple-200">
                  You can now sign in.
                </p>
              </>
            ) : isInvalidToken ? (
              <>
                <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-white mb-2">Invalid link</h1>
                <p className="text-purple-200">
                  This reset link is invalid or has expired.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-white mb-2">Reset password</h1>
                <p className="text-purple-200">
                  Enter your new password
                </p>
              </>
            )}
          </div>

          {!isSuccess && !isInvalidToken && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">
                  New password
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white">
                  Confirm new password
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

              <div className="bg-white/5 rounded-lg p-3 text-sm text-purple-200">
                <p>💡 Tips for a strong password:</p>
                <ul className="mt-2 space-y-1 ml-4">
                  <li>• Minimum 8 characters</li>
                  <li>• Use letters, numbers and symbols</li>
                  <li>• Avoid personal information</li>
                </ul>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset password'
                )}
              </Button>
            </form>
          )}

          {isInvalidToken && (
            <div className="space-y-4">
              <p className="text-purple-200 text-center">
                The link may have expired or has already been used.
              </p>
              
              <Link to="/forgot-password">
                <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white">
                  Request new link
                </Button>
              </Link>
            </div>
          )}

          {isSuccess && (
            <div className="text-center">
              <Link to="/login">
                <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white">
                  Go to login
                </Button>
              </Link>
            </div>
          )}

          {/* Back to login link */}
          {!isSuccess && (
            <div className="mt-8 text-center">
              <Link
                to="/login"
                className="text-purple-300 hover:text-white transition-colors text-sm"
              >
                ← Back to login
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}