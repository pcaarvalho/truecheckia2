import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { useUserProfile } from '@/hooks/useUser'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Mail, User as UserIcon, Edit3, Check, X } from 'lucide-react'
import { useState } from 'react'
import type { User } from '@/types/api'

const personalDataSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').max(100, 'Name too long'),
  avatar: z.string().url('Invalid URL').optional().or(z.literal(''))
})

type PersonalDataForm = z.infer<typeof personalDataSchema>

interface PersonalDataSectionProps {
  profile: User | undefined
}

export default function PersonalDataSection({ profile }: PersonalDataSectionProps) {
  const { updateUser } = useAuth()
  const { updateProfile, isUpdating } = useUserProfile()
  const [isEditing, setIsEditing] = useState(false)

  const form = useForm<PersonalDataForm>({
    resolver: zodResolver(personalDataSchema),
    defaultValues: {
      name: profile?.name || '',
      avatar: profile?.avatar || ''
    }
  })

  const onSubmit = async (data: PersonalDataForm) => {
    try {
      const updatedData = {
        name: data.name,
        ...(data.avatar && { avatar: data.avatar })
      }
      
      await updateProfile(updatedData)
      
      // Update auth context
      if (profile) {
        updateUser({
          ...profile,
          ...updatedData
        })
      }
      
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  const handleCancel = () => {
    form.reset({
      name: profile?.name || '',
      avatar: profile?.avatar || ''
    })
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Manage your basic profile information
              </CardDescription>
            </div>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex items-start gap-6">
                  <div className="flex flex-col items-center gap-4">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={form.watch('avatar')} alt="Avatar" />
                      <AvatarFallback className="text-lg">
                        {form.watch('name')?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm text-gray-500 text-center">
                      Enter an image URL to change your avatar
                    </p>
                  </div>

                  <div className="flex-1 space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Your full name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="avatar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Avatar URL (optional)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="https://example.com/avatar.jpg" 
                              type="url"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={isUpdating}>
                    <Check className="h-4 w-4 mr-2" />
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile?.avatar} alt="Avatar" />
                <AvatarFallback className="text-lg">
                  {profile?.name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-lg font-medium">
                    {profile?.name || 'Name not provided'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <p className="text-lg">{profile?.email}</p>
                    <Badge variant="secondary" className="text-xs">
                      Verified
                    </Badge>
                  </div>
                </div>

                {profile?.createdAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Registration Date</label>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-gray-400" />
                      <p className="text-lg">
                        {new Date(profile.createdAt).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Account Statistics</CardTitle>
          <CardDescription>
            Summary of your platform activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {profile?.totalAnalyses || 0}
              </div>
              <div className="text-sm text-gray-600">
                Analyses Performed
              </div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {profile?.plan === 'FREE' ? profile?.credits || 0 : '∞'}
              </div>
              <div className="text-sm text-gray-600">
                Available Credits
              </div>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {profile?.createdAt 
                  ? Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                  : 0
                }
              </div>
              <div className="text-sm text-gray-600">
                Days as Member
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}