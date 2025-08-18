import { useState, useEffect } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Loader2, Mail, CheckCircle, XCircle, RefreshCw, Clock, AlertCircle, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { motion, AnimatePresence } from 'framer-motion'
import { useEmailVerification } from '@/hooks/useEmailVerification'
import EmailVerificationTips from '@/components/email-verification/EmailVerificationTips'
import VerificationProgress from '@/components/email-verification/VerificationProgress'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const [isEditingEmail, setIsEditingEmail] = useState(false)
  const [tempEmail, setTempEmail] = useState('')

  const token = searchParams.get('token')
  const stateEmail = location.state?.email
  
  const {
    status,
    email,
    isResending,
    cooldownTime,
    redirectCountdown,
    errorDetails,
    verifyEmail,
    resendVerification,
    updateEmail,
    skipToWelcome
  } = useEmailVerification(stateEmail, token)

  const handleEmailEdit = () => {
    setTempEmail(email)
    setIsEditingEmail(true)
  }

  const handleEmailSave = () => {
    if (tempEmail.trim() && tempEmail !== email) {
      updateEmail(tempEmail.trim())
    }
    setIsEditingEmail(false)
  }

  const handleEmailCancel = () => {
    setTempEmail('')
    setIsEditingEmail(false)
  }

  const handleResendWithEmail = () => {
    if (isEditingEmail && tempEmail.trim()) {
      updateEmail(tempEmail.trim())
      setIsEditingEmail(false)
      resendVerification(tempEmail.trim())
    } else {
      resendVerification()
    }
  }



  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md px-4"
      >
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full mb-4"
            >
              <span className="text-3xl font-bold text-white">TC</span>
            </motion.div>

            {/* Status-based content */}
            {status === 'idle' && !token && (
              <>
                <Mail className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-white mb-2">Verify your email</h1>
                <div className="text-center">
                  <p className="text-purple-200 mb-2">
                    We sent a verification link to:
                  </p>
                  {email ? (
                    <div className="flex items-center justify-center space-x-2">
                      <span className="font-semibold text-white bg-white/10 px-3 py-1 rounded-lg">
                        {email}
                      </span>
                      {!isEditingEmail && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleEmailEdit}
                          className="text-purple-300 hover:text-white p-1 h-8 w-8"
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-purple-300 text-sm">
                      No email specified
                    </div>
                  )}
                </div>
              </>
            )}

            {status === 'loading' && (
              <>
                <h1 className="text-3xl font-bold text-white mb-2">Verifying email...</h1>
                <p className="text-purple-200 mb-6">We are confirming your identity</p>
                <VerificationProgress isActive={status === 'loading'} />
              </>
            )}

            {status === 'success' && (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                >
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                </motion.div>
                <h1 className="text-3xl font-bold text-white mb-2">Email verified!</h1>
                <p className="text-purple-200">Your account has been successfully activated</p>
                {redirectCountdown > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex items-center justify-center space-x-2 text-purple-300"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Redirecting in {redirectCountdown}s...</span>
                  </motion.div>
                )}
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-white mb-2">Verification error</h1>
                <p className="text-purple-200">
                  The verification link is invalid or has expired
                </p>
                {errorDetails && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 max-w-xs mx-auto"
                  >
                    <Alert className="bg-red-500/20 border-red-400/50 text-white">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {errorDetails}
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </>
            )}
          </div>

          {/* Instructions or actions */}
          {status === 'idle' && !token && (
            <div className="space-y-4">
              {/* Email editing section */}
              {isEditingEmail && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white/5 rounded-lg p-4 space-y-3"
                >
                  <Label htmlFor="email-edit" className="text-white text-sm">
                    Confirm your email:
                  </Label>
                  <Input
                    id="email-edit"
                    type="email"
                    value={tempEmail}
                    onChange={(e) => setTempEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="bg-white/10 border-white/20 text-white placeholder:text-purple-300 focus:border-purple-400 focus:ring-purple-400"
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={handleEmailSave}
                      className="bg-purple-600 hover:bg-purple-700 text-white flex-1"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEmailCancel}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}

              <EmailVerificationTips />

              <div className="text-center">
                <p className="text-purple-200 mb-3">Didn't receive the email?</p>
                
                {!email && !isEditingEmail ? (
                  <Button
                    onClick={handleEmailEdit}
                    variant="outline"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 mb-3"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Enter email
                  </Button>
                ) : (
                  <Button
                    onClick={handleResendWithEmail}
                    disabled={isResending || cooldownTime > 0}
                    variant="outline"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resending...
                      </>
                    ) : cooldownTime > 0 ? (
                      <>
                        <Clock className="mr-2 h-4 w-4" />
                        Wait {cooldownTime}s
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Resend email
                      </>
                    )}
                  </Button>
                )}
                
                {cooldownTime > 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-purple-300 mt-2"
                  >
                    To avoid spam, wait {cooldownTime}s to resend
                  </motion.p>
                )}
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              {/* Email editing for error state */}
              {isEditingEmail && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-white/5 rounded-lg p-4 space-y-3"
                >
                  <Label htmlFor="email-edit-error" className="text-white text-sm">
                    Confirm your email:
                  </Label>
                  <Input
                    id="email-edit-error"
                    type="email"
                    value={tempEmail}
                    onChange={(e) => setTempEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="bg-white/10 border-white/20 text-white placeholder:text-purple-300 focus:border-purple-400 focus:ring-purple-400"
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={handleEmailSave}
                      className="bg-purple-600 hover:bg-purple-700 text-white flex-1"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEmailCancel}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}

              {!email && !isEditingEmail ? (
                <Button
                  onClick={handleEmailEdit}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Enter email for resend
                </Button>
              ) : (
                <Button
                  onClick={handleResendWithEmail}
                  disabled={isResending || cooldownTime > 0}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white disabled:opacity-50"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reenviando...
                    </>
                  ) : cooldownTime > 0 ? (
                    <>
                      <Clock className="mr-2 h-4 w-4" />
                      Aguarde {cooldownTime}s
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Request new link
                    </>
                  )}
                </Button>
              )}

              {cooldownTime > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-center"
                >
                  <p className="text-xs text-purple-300">
                    To avoid spam, wait {cooldownTime}s to request a new link
                  </p>
                </motion.div>
              )}

              <div className="text-center space-y-2">
                {email && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleEmailEdit}
                    className="text-purple-300 hover:text-white text-sm"
                  >
                    <Edit3 className="w-3 h-3 mr-1" />
                    Change email
                  </Button>
                )}
                <div>
                  <Link
                    to="/login"
                    className="text-purple-300 hover:text-white transition-colors text-sm"
                  >
                    Back to login
                  </Link>
                </div>
              </div>
            </div>
          )}

          <AnimatePresence>
            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center space-y-4"
              >
                {redirectCountdown > 0 ? (
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-purple-200 text-sm mb-2">
                      Automatic redirect in {redirectCountdown} seconds
                    </p>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <motion.div
                        className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full"
                        initial={{ width: '100%' }}
                        animate={{ width: '0%' }}
                        transition={{ duration: 3, ease: 'linear' }}
                      />
                    </div>
                  </div>
                ) : null}
                
                <Button
                  onClick={skipToWelcome}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                >
                  Continue now
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-purple-300 text-sm">
            Need help?{' '}
            <a
              href="mailto:support@truecheckia.com"
              className="text-white hover:text-purple-300 transition-colors"
            >
              support@truecheckia.com
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  )
}