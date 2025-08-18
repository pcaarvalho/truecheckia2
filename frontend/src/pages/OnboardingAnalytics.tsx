import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3, 
  Users, 
  Clock, 
  TrendingUp,
  RefreshCw,
  Download,
  Target
} from 'lucide-react'
import { getOnboardingStats, OnboardingAnalytics } from '@/components/onboarding/SuccessMetrics'

export default function OnboardingAnalyticsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  
  useEffect(() => {
    loadData()
  }, [])
  
  const loadData = () => {
    const allEvents = JSON.parse(localStorage.getItem('onboarding_events') || '[]')
    setEvents(allEvents)
    setStats(getOnboardingStats())
  }
  
  const clearData = () => {
    if (confirm('Clear all onboarding analytics data?')) {
      localStorage.removeItem('onboarding_events')
      localStorage.removeItem('user_activated')
      localStorage.removeItem('activation_time')
      localStorage.removeItem('onboarding_start_time')
      loadData()
    }
  }
  
  const exportData = () => {
    const data = {
      events,
      stats,
      exportTime: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `onboarding-analytics-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  // Calculate funnel metrics
  const funnelMetrics = {
    started: events.filter(e => e.event === 'onboarding_started').length,
    step1: events.filter(e => e.event === 'onboarding_step_completed' && e.properties.step_number === 1).length,
    step2: events.filter(e => e.event === 'onboarding_step_completed' && e.properties.step_number === 2).length,
    step3: events.filter(e => e.event === 'onboarding_step_completed' && e.properties.step_number === 3).length,
    completed: events.filter(e => e.event === 'onboarding_completed').length,
    skipped: events.filter(e => e.event === 'onboarding_skipped').length,
    firstAnalysis: events.filter(e => e.event === 'first_analysis_completed').length
  }
  
  // Calculate skip reasons
  const skipReasons = events
    .filter(e => e.event === 'onboarding_skipped')
    .reduce((acc: any, e) => {
      const step = e.properties.skipped_at_step
      acc[step] = (acc[step] || 0) + 1
      return acc
    }, {})
  
  // Calculate conversion rates
  const conversions = {
    step1Rate: funnelMetrics.started > 0 ? (funnelMetrics.step1 / funnelMetrics.started * 100) : 0,
    step2Rate: funnelMetrics.step1 > 0 ? (funnelMetrics.step2 / funnelMetrics.step1 * 100) : 0,
    step3Rate: funnelMetrics.step2 > 0 ? (funnelMetrics.step3 / funnelMetrics.step2 * 100) : 0,
    completionRate: funnelMetrics.started > 0 ? (funnelMetrics.completed / funnelMetrics.started * 100) : 0,
    activationRate: funnelMetrics.started > 0 ? (funnelMetrics.firstAnalysis / funnelMetrics.started * 100) : 0
  }
  
  // Get average time to value
  const timeToValueEvents = events.filter(e => e.event === 'first_analysis_completed' && e.properties.time_to_value_ms)
  const avgTimeToValue = timeToValueEvents.length > 0 
    ? timeToValueEvents.reduce((sum, e) => sum + e.properties.time_to_value_ms, 0) / timeToValueEvents.length / 1000
    : 0
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Onboarding Analytics</h1>
            <p className="text-gray-600">Real-time insights into user onboarding performance</p>
          </div>
          
          <div className="flex space-x-3">
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={exportData}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="destructive" onClick={clearData}>
              Clear Data
            </Button>
          </div>
        </div>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{funnelMetrics.started}</div>
              <p className="text-xs text-muted-foreground">
                Users who started onboarding
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conversions.completionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {funnelMetrics.completed} of {funnelMetrics.started} completed
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activation Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conversions.activationRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {funnelMetrics.firstAnalysis} completed first analysis
              </p>
              <Badge variant={conversions.activationRate >= 70 ? "default" : "destructive"} className="mt-2">
                Target: 70%
              </Badge>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Time to Value</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {avgTimeToValue > 0 ? `${Math.round(avgTimeToValue)}s` : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                From start to first analysis
              </p>
              <Badge variant={avgTimeToValue <= 900 ? "default" : "destructive"} className="mt-2">
                Target: under 15min
              </Badge>
            </CardContent>
          </Card>
        </div>
        
        {/* Funnel Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Onboarding Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Started Onboarding</span>
                    <span className="text-sm font-medium">{funnelMetrics.started}</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Completed Step 1</span>
                    <span className="text-sm font-medium">
                      {funnelMetrics.step1} ({conversions.step1Rate.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={conversions.step1Rate} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Completed Step 2</span>
                    <span className="text-sm font-medium">
                      {funnelMetrics.step2} ({conversions.step2Rate.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={conversions.step2Rate} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Completed Step 3</span>
                    <span className="text-sm font-medium">
                      {funnelMetrics.step3} ({conversions.step3Rate.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={conversions.step3Rate} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-semibold">Finished Tutorial</span>
                    <span className="text-sm font-semibold">
                      {funnelMetrics.completed} ({conversions.completionRate.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={conversions.completionRate} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-semibold text-green-700">First Analysis</span>
                    <span className="text-sm font-semibold text-green-700">
                      {funnelMetrics.firstAnalysis} ({conversions.activationRate.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={conversions.activationRate} className="h-2 bg-green-100" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Skip Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{funnelMetrics.skipped}</div>
                  <div className="text-sm text-gray-600">Users who skipped onboarding</div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Skip Reasons:</div>
                  {Object.entries(skipReasons).map(([step, count]: [string, any]) => (
                    <div key={step} className="flex justify-between">
                      <span className="text-sm">Step {step}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Detailed Analytics Component */}
        <Card>
          <CardHeader>
            <CardTitle>Event Stream</CardTitle>
          </CardHeader>
          <CardContent>
            <OnboardingAnalytics />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}