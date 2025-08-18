import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Shield, Key, LogOut, Eye, EyeOff, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import axiosClient from '@/lib/axios'

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/\d/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

type PasswordForm = z.infer<typeof passwordSchema>

export default function SecuritySection() {
  const { logout } = useAuth()
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false)

  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  })

  const newPassword = form.watch('newPassword')

  // Password strength calculation
  const calculatePasswordStrength = (password: string) => {
    let score = 0
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    }

    score = Object.values(checks).filter(Boolean).length
    
    return {
      score,
      percentage: (score / 5) * 100,
      level: score <= 2 ? 'Weak' : score <= 3 ? 'Medium' : score <= 4 ? 'Strong' : 'Very Strong',
      color: score <= 2 ? 'bg-red-500' : score <= 3 ? 'bg-yellow-500' : score <= 4 ? 'bg-blue-500' : 'bg-green-500',
      checks
    }
  }

  const passwordStrength = calculatePasswordStrength(newPassword || '')

  const onSubmitPasswordChange = async (data: PasswordForm) => {
    setIsChangingPassword(true)
    try {
      await axiosClient.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      })
      
      toast.success('Password changed successfully!')
      form.reset()
    } catch (error: any) {
      toast.error(error.message || 'Error changing password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleLogoutAllDevices = async () => {
    setIsLoggingOutAll(true)
    try {
      await axiosClient.post('/auth/logout-all')
      toast.success('Logged out from all devices')
      await logout()
    } catch (error: any) {
      toast.error(error.message || 'Error logging out')
    } finally {
      setIsLoggingOutAll(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Keep your account secure with a strong password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitPasswordChange)} className="space-y-4">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          {...field} 
                          type={showCurrentPassword ? "text" : "password"}
                          placeholder="Enter your current password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          {...field} 
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Enter your new password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />

                    {/* Password Strength Indicator */}
                    {newPassword && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Password strength:</span>
                          <span className={`text-sm font-medium ${
                            passwordStrength.score <= 2 ? 'text-red-600' :
                            passwordStrength.score <= 3 ? 'text-yellow-600' :
                            passwordStrength.score <= 4 ? 'text-blue-600' : 'text-green-600'
                          }`}>
                            {passwordStrength.level}
                          </span>
                        </div>
                        <Progress 
                          value={passwordStrength.percentage} 
                          className={`h-2 ${passwordStrength.color}`}
                        />
                        
                        {/* Password Requirements */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div className={`flex items-center gap-2 ${passwordStrength.checks.length ? 'text-green-600' : 'text-gray-400'}`}>
                            {passwordStrength.checks.length ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            8+ characters
                          </div>
                          <div className={`flex items-center gap-2 ${passwordStrength.checks.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                            {passwordStrength.checks.uppercase ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            Uppercase letter
                          </div>
                          <div className={`flex items-center gap-2 ${passwordStrength.checks.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                            {passwordStrength.checks.lowercase ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            Lowercase letter
                          </div>
                          <div className={`flex items-center gap-2 ${passwordStrength.checks.number ? 'text-green-600' : 'text-gray-400'}`}>
                            {passwordStrength.checks.number ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            Number
                          </div>
                          <div className={`flex items-center gap-2 ${passwordStrength.checks.special ? 'text-green-600' : 'text-gray-400'}`}>
                            {passwordStrength.checks.special ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            Special character
                          </div>
                        </div>
                      </div>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          {...field} 
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your new password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Security Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Actions
          </CardTitle>
          <CardDescription>
            Manage your account security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <LogOut className="h-5 w-5 text-orange-500" />
              <div>
                <h4 className="font-medium">Logout from all devices</h4>
                <p className="text-sm text-gray-600">
                  End active sessions on other devices
                </p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Logout all
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Confirm logout from all devices
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will end all active sessions on other devices. 
                    You will need to log in again on all devices.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleLogoutAllDevices}
                    disabled={isLoggingOutAll}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {isLoggingOutAll ? 'Logging out...' : 'Confirm'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Security Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Security Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use a unique and strong password for your account</li>
              <li>• Don't share your credentials with others</li>
              <li>• Keep your software always updated</li>
              <li>• Log out when using public devices</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}