import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useApiKey } from '@/hooks/useUser'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Download, 
  Trash2, 
  Key, 
  Activity, 
  AlertTriangle, 
  Copy, 
  Eye, 
  EyeOff,
  Calendar,
  Globe,
  Smartphone,
  Monitor
} from 'lucide-react'
import { toast } from 'sonner'
import type { User } from '@/types/api'

interface AccountSectionProps {
  profile: User | undefined
}

export default function AccountSection({ profile }: AccountSectionProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { generateKey, revokeKey, isGenerating, isRevoking, generatedKey } = useApiKey()
  const [showApiKey, setShowApiKey] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Mock login history (in a real app, this would come from an API)
  const loginHistory = [
    {
      id: 1,
      date: '2024-01-20 14:30:22',
      location: 'São Paulo, Brazil',
      device: 'Chrome - Windows',
      ip: '192.168.1.100',
      current: true
    },
    {
      id: 2,
      date: '2024-01-19 09:15:45',
      location: 'São Paulo, Brazil',
      device: 'Safari - iPhone',
      ip: '192.168.1.101',
      current: false
    },
    {
      id: 3,
      date: '2024-01-18 16:22:10',
      location: 'Rio de Janeiro, Brazil',
      device: 'Chrome - Windows',
      ip: '192.168.1.102',
      current: false
    }
  ]

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      // In a real app, this would call an API endpoint
      const data = {
        profile: profile,
        preferences: JSON.parse(localStorage.getItem('userPreferences') || '{}'),
        analysisHistory: [], // Would be fetched from API
        exportDate: new Date().toISOString()
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `truecheckia-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('Data exported successfully!')
    } catch (error) {
      toast.error('Error exporting data')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE ACCOUNT') {
      toast.error('Type "DELETE ACCOUNT" to confirm')
      return
    }

    setIsDeleting(true)
    try {
      // In a real app, this would call an API endpoint
      // await axiosClient.delete('/user/account')
      
      toast.success('Account deleted successfully')
      await logout()
      navigate('/')
    } catch (error) {
      toast.error('Error deleting account')
    } finally {
      setIsDeleting(false)
    }
  }

  const copyApiKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast.success('Key copied to clipboard')
  }

  const getDeviceIcon = (device: string) => {
    if (device.includes('iPhone') || device.includes('Android')) {
      return <Smartphone className="h-4 w-4" />
    }
    return <Monitor className="h-4 w-4" />
  }

  return (
    <div className="space-y-6">
      {/* API Key Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Key
          </CardTitle>
          <CardDescription>
            Manage your API key for external integrations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user?.plan === 'FREE' ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <h4 className="font-medium text-yellow-900">Premium Feature</h4>
              </div>
              <p className="text-sm text-yellow-800 mb-3">
                API access is only available for Pro and Enterprise plans.
              </p>
              <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                Upgrade
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {profile?.apiKey ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">Ativa</Badge>
                    <span className="text-sm text-gray-600">API key configured</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex-1 font-mono text-sm bg-gray-100 px-3 py-2 rounded border">
                      {showApiKey ? profile.apiKey : '••••••••••••••••••••••••••••••••'}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyApiKey(profile.apiKey!)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateKey()}
                      disabled={isGenerating}
                    >
                      {isGenerating ? 'Generating...' : 'Generate New Key'}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          Revoke Key
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action will invalidate the current key. All integrations using this key will stop working.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => revokeKey()}
                            disabled={isRevoking}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {isRevoking ? 'Revoking...' : 'Revoke'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    No API key configured. Generate a key to access our API.
                  </p>
                  <Button
                    onClick={() => generateKey()}
                    disabled={isGenerating}
                  >
                    {isGenerating ? 'Generating...' : 'Generate API Key'}
                  </Button>
                </div>
              )}

              {generatedKey && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">New key generated</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <code className="flex-1 text-sm bg-white px-3 py-2 rounded border font-mono">
                      {generatedKey}
                    </code>
                    <Button
                      size="sm"
                      onClick={() => copyApiKey(generatedKey)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-blue-800">
                    ⚠️ Keep this key in a safe place. It will not be shown again.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Login History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Login History
          </CardTitle>
          <CardDescription>
            Recent login activities on your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loginHistory.map((login) => (
                <TableRow key={login.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">
                        {new Date(login.date).toLocaleString('en-US')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(login.device)}
                      <span className="text-sm">{login.device}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{login.location}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{login.ip}</TableCell>
                  <TableCell>
                    {login.current ? (
                      <Badge className="bg-green-100 text-green-800">Current</Badge>
                    ) : (
                      <Badge variant="outline">Ended</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Personal Data
          </CardTitle>
          <CardDescription>
            Download a copy of all your data (LGPD/GDPR)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              You can download a complete copy of your personal data stored on the platform, 
              including profile, analyses and preferences.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">The file will include:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Profile information</li>
                <li>• Analysis history</li>
                <li>• Preferences and settings</li>
                <li>• Platform usage data</li>
              </ul>
            </div>

            <Button 
              onClick={handleExportData}
              disabled={isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export Data'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Delete Account
          </CardTitle>
          <CardDescription>
            Permanently remove your account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-2">⚠️ Warning: This action is irreversible</h4>
              <ul className="text-sm text-red-800 space-y-1">
                <li>• All your data will be permanently removed</li>
                <li>• Analysis history will be deleted</li>
                <li>• Subscription will be automatically cancelled</li>
                <li>• It will not be possible to recover the account after deletion</li>
              </ul>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Confirm Account Deletion
                  </DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. To confirm, type{' '}
                    <strong>"DELETE ACCOUNT"</strong> in the field below.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <Input
                    placeholder="Type: DELETE ACCOUNT"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                  />
                </div>

                <DialogFooter className="flex gap-2">
                  <DialogTrigger asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogTrigger>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== 'DELETE ACCOUNT' || isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Account'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}