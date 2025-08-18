import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Settings, Globe, Bell, Moon, Sun, Monitor, Save } from 'lucide-react'
import { toast } from 'sonner'

const preferencesSchema = z.object({
  language: z.enum(['pt-BR', 'en-US', 'es-ES']),
  analysisLanguage: z.enum(['auto', 'pt-BR', 'en-US', 'es-ES']),
  theme: z.enum(['light', 'dark', 'system']),
  emailNotifications: z.object({
    analysisComplete: z.boolean(),
    creditsLow: z.boolean(),
    planExpiring: z.boolean(),
    newFeatures: z.boolean(),
    security: z.boolean()
  }),
  analysisSettings: z.object({
    autoSave: z.boolean(),
    detailedReports: z.boolean(),
    confidenceThreshold: z.number().min(0).max(100)
  })
})

type PreferencesForm = z.infer<typeof preferencesSchema>

const defaultPreferences: PreferencesForm = {
  language: 'pt-BR',
  analysisLanguage: 'auto',
  theme: 'system',
  emailNotifications: {
    analysisComplete: true,
    creditsLow: true,
    planExpiring: true,
    newFeatures: false,
    security: true
  },
  analysisSettings: {
    autoSave: true,
    detailedReports: false,
    confidenceThreshold: 70
  }
}

export default function PreferencesSection() {
  const [isSaving, setIsSaving] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark' | 'system'>('system')

  const form = useForm<PreferencesForm>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: defaultPreferences
  })

  // Load preferences from localStorage on component mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('userPreferences')
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences)
        form.reset(parsed)
        setCurrentTheme(parsed.theme)
      } catch (error) {
        console.error('Error loading preferences:', error)
      }
    }
  }, [form])

  const onSubmit = async (data: PreferencesForm) => {
    setIsSaving(true)
    try {
      // Save to localStorage (in a real app, this would be saved to the backend)
      localStorage.setItem('userPreferences', JSON.stringify(data))
      
      // Apply theme changes immediately
      if (data.theme !== currentTheme) {
        setCurrentTheme(data.theme)
        // In a real app, you would apply the theme to the document
        // document.documentElement.classList.toggle('dark', data.theme === 'dark')
      }
      
      toast.success('Preferences saved successfully!')
    } catch (error) {
      toast.error('Error saving preferences')
    } finally {
      setIsSaving(false)
    }
  }

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />
      case 'dark':
        return <Moon className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  const languageOptions = [
    { value: 'pt-BR', label: 'Portuguese (Brazil)' },
    { value: 'en-US', label: 'English (United States)' },
    { value: 'es-ES', label: 'Español (España)' }
  ]

  const analysisLanguageOptions = [
    { value: 'auto', label: 'Automatic Detection' },
    ...languageOptions
  ]

  const themeOptions = [
    { value: 'light', label: 'Claro', icon: <Sun className="h-4 w-4" /> },
    { value: 'dark', label: 'Escuro', icon: <Moon className="h-4 w-4" /> },
    { value: 'system', label: 'Sistema', icon: <Monitor className="h-4 w-4" /> }
  ]

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Interface Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Interface Settings
              </CardTitle>
              <CardDescription>
                Customize the appearance and language of the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Idioma da Interface</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o idioma" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {languageOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tema</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tema" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {themeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              {option.icon}
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Analysis Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Analysis Settings
              </CardTitle>
              <CardDescription>
                Configure how analyses are processed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="analysisLanguage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Language for Analysis</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o idioma" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {analysisLanguageOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="analysisSettings.autoSave"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Auto-save analyses
                        </FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Automatically saves your analyses to history
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="analysisSettings.detailedReports"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Detailed reports
                        </FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Includes technical information in results
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="analysisSettings.confidenceThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Confidence Threshold: {field.value}%
                    </FormLabel>
                    <FormControl>
                      <div className="px-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>0%</span>
                          <span>50%</span>
                          <span>100%</span>
                        </div>
                      </div>
                    </FormControl>
                    <div className="text-sm text-muted-foreground">
                      Only results above this threshold will be considered reliable
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Configure when you want to receive emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="emailNotifications.analysisComplete"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Analysis completed
                      </FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Receive email when an analysis is completed
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emailNotifications.creditsLow"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Low credits
                      </FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Alerts when your credits are running low
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emailNotifications.planExpiring"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Plano expirando
                      </FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Reminders about plan renewal
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emailNotifications.newFeatures"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Novos recursos
                      </FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Updates about platform features
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emailNotifications.security"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Security alerts
                      </FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Important notifications about account security
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <p className="text-xs text-muted-foreground">
                * Security alerts cannot be disabled for protection reasons
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}