import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { motion } from 'framer-motion'
import api from '@/lib/api'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)
    try {
      await api.post('/auth/forgot-password', data)
      setIsSuccess(true)
      toast({
        title: 'Email sent!',
        description: 'If an account exists with this email, you will receive instructions to reset your password.',
      })
    } catch (error: any) {
      let errorMessage = 'An error occurred while processing your request. Please try again.'
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message === 'NETWORK_ERROR') {
        errorMessage = 'Connection error. Please check your internet and try again.'
      }
      
      toast({
        title: 'Error sending email',
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

            {!isSuccess ? (
              <>
                <h1 className="text-3xl font-bold text-white mb-2">Forgot your password?</h1>
                <p className="text-purple-200">
                  Enter your email and we'll send you a link to reset your password.
                </p>
              </>
            ) : (
              <>
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-white mb-2">Email sent!</h1>
                <p className="text-purple-200">
                  Check your inbox and follow the instructions.
                </p>
              </>
            )}
          </div>

          {!isSuccess ? (
            <>
              {/* Form */}
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

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send recovery link'
                  )}
                </Button>
              </form>

              {/* Info box */}
              <div className="mt-6 bg-white/5 rounded-lg p-4 text-sm text-purple-200">
                <p>📧 You will receive an email with a link to reset your password</p>
                <p className="mt-2">⏰ The link expires in 1 hour for security</p>
                <p className="mt-2">📁 Please also check your spam folder</p>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              {/* Success info */}
              <div className="bg-white/5 rounded-lg p-4 text-sm text-purple-200 space-y-2">
                <p>✅ Email sent successfully</p>
                <p>📧 Check your inbox</p>
                <p>🔗 Click the link to create a new password</p>
                <p>⏰ The link is valid for 1 hour</p>
              </div>

              {/* Resend option */}
              <div className="text-center">
                <p className="text-purple-200 mb-3">Didn't receive the email?</p>
                <Button
                  onClick={() => setIsSuccess(false)}
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Try again
                </Button>
              </div>
            </div>
          )}

          {/* Back to login */}
          <div className="mt-8 text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-purple-300 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}