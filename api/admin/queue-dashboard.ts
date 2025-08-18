import type { VercelRequest, VercelResponse } from '@vercel/node'
import { JobMonitor } from '../../apps/api/src/lib/job-monitor'
import { DeadLetterQueue } from '../../apps/api/src/lib/dead-letter-queue'
import ServerlessAnalysisQueue from '../../apps/api/src/queues/serverless-analysis.queue'
import ServerlessEmailQueue from '../../apps/api/src/queues/serverless-email.queue'
import ServerlessCreditsQueue from '../../apps/api/src/queues/serverless-credits.queue'
import { cacheManager } from '../_utils/cache-manager'
import { verifyAdminAuth } from '../_utils/admin-auth'

/**
 * Queue Dashboard API
 * Provides comprehensive monitoring and management interface for serverless queues
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Verify admin authentication
    const adminAuth = await verifyAdminAuth(req)
    if (!adminAuth.isValid) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: adminAuth.error 
      })
    }

    switch (req.method) {
      case 'GET':
        return await handleGetDashboard(req, res)
      case 'POST':
        return await handleDashboardAction(req, res)
      default:
        return res.status(405).json({ message: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Queue dashboard error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Get comprehensive dashboard data
 */
async function handleGetDashboard(req: VercelRequest, res: VercelResponse) {
  const { section = 'overview', timeRange = '1h' } = req.query

  try {
    console.log(`📊 Fetching dashboard data: ${section} (${timeRange})`)

    const startTime = Date.now()

    // Fetch data based on requested section
    let dashboardData: any = {}

    switch (section) {
      case 'overview':
        dashboardData = await getDashboardOverview()
        break
      
      case 'queues':
        dashboardData = await getQueuesData()
        break
      
      case 'dlq':
        dashboardData = await getDLQData()
        break
      
      case 'performance':
        dashboardData = await getPerformanceData(timeRange as string)
        break
      
      case 'alerts':
        dashboardData = await getAlertsData()
        break
      
      case 'health':
        dashboardData = await getHealthData()
        break
      
      default:
        // Return complete dashboard
        dashboardData = await getCompleteDashboard()
        break
    }

    const fetchTime = Date.now() - startTime

    return res.status(200).json({
      success: true,
      section,
      timeRange,
      data: dashboardData,
      metadata: {
        fetchTime,
        timestamp: new Date().toISOString(),
        cached: false // TODO: Implement cache checking
      }
    })

  } catch (error) {
    console.error(`Dashboard data fetch failed for section ${section}:`, error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      section,
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Handle dashboard actions (retry jobs, acknowledge alerts, etc.)
 */
async function handleDashboardAction(req: VercelRequest, res: VercelResponse) {
  const { action, payload } = req.body

  try {
    console.log(`🎯 Executing dashboard action: ${action}`)

    let result: any = {}

    switch (action) {
      case 'retry_failed_job':
        result = await retryFailedJob(payload.jobId)
        break
      
      case 'acknowledge_alert':
        result = await acknowledgeAlert(payload.alertId)
        break
      
      case 'trigger_queue_processing':
        result = await triggerQueueProcessing(payload.queue, payload.options)
        break
      
      case 'purge_old_dlq_jobs':
        result = await purgeOldDLQJobs(payload.days || 7)
        break
      
      case 'force_health_check':
        result = await forceHealthCheck()
        break
      
      case 'clear_cache':
        result = await clearDashboardCache(payload.pattern)
        break
      
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action',
          availableActions: [
            'retry_failed_job',
            'acknowledge_alert', 
            'trigger_queue_processing',
            'purge_old_dlq_jobs',
            'force_health_check',
            'clear_cache'
          ]
        })
    }

    // Log admin action for audit
    await logAdminAction(action, payload, result)

    return res.status(200).json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(`Dashboard action failed: ${action}`, error)
    return res.status(500).json({
      success: false,
      action,
      error: 'Action failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Get dashboard overview data
 */
async function getDashboardOverview() {
  const [jobMetrics, dlqStats, healthCheck] = await Promise.all([
    JobMonitor.getJobMetrics(),
    DeadLetterQueue.getStats(),
    JobMonitor.healthCheck()
  ])

  return {
    summary: {
      totalJobs: jobMetrics.totalJobs,
      successfulJobs: jobMetrics.successfulJobs,
      failedJobs: dlqStats.totalFailed,
      processingJobs: jobMetrics.processingJobs,
      successRate: jobMetrics.successRate,
      avgProcessingTime: jobMetrics.averageProcessingTime,
    },
    health: {
      status: healthCheck.status,
      checks: healthCheck.checks,
    },
    queues: Object.keys(jobMetrics.queues).map(name => ({
      name,
      pending: jobMetrics.queues[name].pending,
      processing: jobMetrics.queues[name].processing,
      errorRate: jobMetrics.queues[name].errorRate,
    })),
    dlq: {
      totalFailed: dlqStats.totalFailed,
      retrying: dlqStats.totalRetrying,
      permanentFailures: dlqStats.totalPermanentFailures,
    }
  }
}

/**
 * Get detailed queues data
 */
async function getQueuesData() {
  const [analysisStats, emailStats, creditsStats] = await Promise.all([
    ServerlessAnalysisQueue.getQueueStats(),
    ServerlessEmailQueue.getQueueStats(),
    ServerlessCreditsQueue.getQueueStats(),
  ])

  return {
    analysis: {
      ...analysisStats,
      metrics: await ServerlessAnalysisQueue.getMetrics(),
    },
    email: {
      ...emailStats,
      metrics: await ServerlessEmailQueue.getMetrics(),
    },
    credits: {
      ...creditsStats,
      metrics: await ServerlessCreditsQueue.getMetrics(),
    }
  }
}

/**
 * Get DLQ data
 */
async function getDLQData() {
  const [stats, metrics, alerts] = await Promise.all([
    DeadLetterQueue.getStats(),
    DeadLetterQueue.getMetrics(7),
    JobMonitor.getAlerts(20)
  ])

  return {
    stats,
    metrics,
    recentFailures: alerts.filter(a => a.type === 'error_rate').slice(0, 10),
    recommendations: generateDLQRecommendations(stats)
  }
}

/**
 * Get performance data
 */
async function getPerformanceData(timeRange: string) {
  const performanceMetrics = await JobMonitor.getPerformanceMetrics()
  
  // Get cached performance data for trends
  const performanceHistory = await cacheManager.getByTags(['performance', 'metrics'])
  
  return {
    current: performanceMetrics,
    trends: analyzeTrends(performanceHistory, timeRange),
    recommendations: generatePerformanceRecommendations(performanceMetrics)
  }
}

/**
 * Get alerts data
 */
async function getAlertsData() {
  const alerts = await JobMonitor.getAlerts(50)
  
  return {
    alerts,
    summary: {
      total: alerts.length,
      unacknowledged: alerts.filter(a => !a.acknowledged).length,
      bySeverity: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length,
      },
      byType: alerts.reduce((acc, alert) => {
        acc[alert.type] = (acc[alert.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
  }
}

/**
 * Get health data
 */
async function getHealthData() {
  const healthCheck = await JobMonitor.healthCheck()
  
  return {
    ...healthCheck,
    recommendations: generateHealthRecommendations(healthCheck),
    lastChecked: new Date().toISOString()
  }
}

/**
 * Get complete dashboard data
 */
async function getCompleteDashboard() {
  const [overview, queues, dlq, performance, alerts, health] = await Promise.all([
    getDashboardOverview(),
    getQueuesData(),
    getDLQData(),
    getPerformanceData('1h'),
    getAlertsData(),
    getHealthData()
  ])

  return {
    overview,
    queues,
    dlq,
    performance,
    alerts,
    health,
    metadata: {
      lastUpdated: new Date().toISOString(),
      sections: ['overview', 'queues', 'dlq', 'performance', 'alerts', 'health']
    }
  }
}

/**
 * Action handlers
 */
async function retryFailedJob(jobId: string) {
  const success = await DeadLetterQueue.manualRetry(jobId)
  return { jobId, retried: success }
}

async function acknowledgeAlert(alertId: string) {
  const success = await JobMonitor.acknowledgeAlert(alertId)
  return { alertId, acknowledged: success }
}

async function triggerQueueProcessing(queue: string, options: any) {
  // This would trigger the webhook processing
  return { queue, triggered: true, options }
}

async function purgeOldDLQJobs(days: number) {
  const result = await DeadLetterQueue.purgeOldJobs(days)
  return { days, purged: result.purged }
}

async function forceHealthCheck() {
  const health = await JobMonitor.healthCheck()
  return { health, forced: true }
}

async function clearDashboardCache(pattern: string) {
  // Clear cache entries matching pattern
  const cleared = await cacheManager.clear(pattern || 'monitoring:*')
  return { pattern, cleared }
}

/**
 * Utility functions
 */
function generateDLQRecommendations(stats: any): string[] {
  const recommendations: string[] = []
  
  if (stats.totalFailed > 100) {
    recommendations.push('High number of failed jobs - investigate root causes')
  }
  
  if (stats.totalPermanentFailures > 50) {
    recommendations.push('Many permanent failures - review job logic and error handling')
  }
  
  if (stats.retryQueue > 20) {
    recommendations.push('Large retry queue - consider increasing processing frequency')
  }
  
  return recommendations
}

function generatePerformanceRecommendations(metrics: any): string[] {
  const recommendations: string[] = []
  
  if (metrics.latency.p95 > 30000) {
    recommendations.push('High P95 latency - optimize job processing')
  }
  
  if (metrics.errors.rate > 0.1) {
    recommendations.push('High error rate - review error handling and job logic')
  }
  
  if (metrics.throughput.last1h < 10) {
    recommendations.push('Low throughput - consider scaling processing capacity')
  }
  
  return recommendations
}

function generateHealthRecommendations(health: any): string[] {
  const recommendations: string[] = []
  
  if (health.status !== 'healthy') {
    recommendations.push('System health degraded - check individual components')
  }
  
  if (!health.checks.redis) {
    recommendations.push('Redis connection issues - check Upstash configuration')
  }
  
  if (!health.checks.queues) {
    recommendations.push('Queue system issues - verify queue processing')
  }
  
  return recommendations
}

function analyzeTrends(history: any[], timeRange: string): any {
  // Simple trend analysis
  return {
    throughputTrend: 'stable',
    latencyTrend: 'stable', 
    errorTrend: 'stable',
    dataPoints: history.length
  }
}

async function logAdminAction(action: string, payload: any, result: any) {
  await cacheManager.set(`admin-log:${Date.now()}`, {
    action,
    payload,
    result,
    timestamp: new Date().toISOString()
  }, {
    ttl: 86400 * 7, // 7 days
    priority: 'normal',
    tags: ['admin', 'audit']
  })
}