import type { VercelRequest, VercelResponse } from '@vercel/node'
import { JobMonitor } from '../../../apps/api/src/lib/job-monitor'
import { DeadLetterQueue } from '../../../apps/api/src/lib/dead-letter-queue'
import { cacheManager } from '../../_utils/cache-manager'

/**
 * Monitoring Dashboard Data Collection Cron Job
 * Runs every 10 minutes to collect and aggregate monitoring data
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // Verify cron authorization
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const startTime = Date.now()

  try {
    console.log('📊 Starting monitoring data collection...')

    // Collect comprehensive metrics
    const [
      jobMetrics,
      performanceMetrics,
      dlqStats,
      dlqMetrics,
      healthCheck,
      alerts
    ] = await Promise.all([
      JobMonitor.getJobMetrics(),
      JobMonitor.getPerformanceMetrics(),
      DeadLetterQueue.getStats(),
      DeadLetterQueue.getMetrics(7),
      JobMonitor.healthCheck(),
      JobMonitor.getAlerts(50)
    ])

    const duration = Date.now() - startTime

    // Create comprehensive dashboard data
    const dashboardData = {
      timestamp: new Date().toISOString(),
      collectionTime: duration,
      overview: {
        totalJobs: jobMetrics.totalJobs,
        successRate: jobMetrics.successRate,
        avgProcessingTime: jobMetrics.averageProcessingTime,
        processingJobs: jobMetrics.processingJobs,
        failedJobs: dlqStats.totalFailed,
        retryingJobs: dlqStats.totalRetrying,
        permanentFailures: dlqStats.totalPermanentFailures,
      },
      performance: {
        latency: performanceMetrics.latency,
        throughput: performanceMetrics.throughput,
        errorRate: performanceMetrics.errors.rate,
      },
      queues: {
        analysis: jobMetrics.queues.analysis || {},
        email: jobMetrics.queues.email || {},
        credits: jobMetrics.queues.credits || {},
      },
      dlq: {
        stats: dlqStats,
        metrics: dlqMetrics,
      },
      health: healthCheck,
      alerts: {
        total: alerts.length,
        unacknowledged: alerts.filter(a => !a.acknowledged).length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        recent: alerts.slice(0, 10),
      },
    }

    // Cache dashboard data with different TTLs based on priority
    await Promise.all([
      // High priority - overview data (5 min TTL)
      cacheManager.set('monitoring:overview', dashboardData.overview, {
        ttl: 300,
        priority: 'high',
        tags: ['monitoring', 'overview']
      }),

      // Medium priority - performance data (10 min TTL)
      cacheManager.set('monitoring:performance', dashboardData.performance, {
        ttl: 600,
        priority: 'normal',
        tags: ['monitoring', 'performance']
      }),

      // Queue-specific data (5 min TTL)
      cacheManager.set('monitoring:queues', dashboardData.queues, {
        ttl: 300,
        priority: 'high',
        tags: ['monitoring', 'queues']
      }),

      // DLQ data (15 min TTL)
      cacheManager.set('monitoring:dlq', dashboardData.dlq, {
        ttl: 900,
        priority: 'normal',
        tags: ['monitoring', 'dlq']
      }),

      // Health data (1 min TTL)
      cacheManager.set('monitoring:health', dashboardData.health, {
        ttl: 60,
        priority: 'critical',
        tags: ['monitoring', 'health']
      }),

      // Alerts data (2 min TTL)
      cacheManager.set('monitoring:alerts', dashboardData.alerts, {
        ttl: 120,
        priority: 'high',
        tags: ['monitoring', 'alerts']
      }),

      // Complete dashboard (10 min TTL)
      cacheManager.set('monitoring:dashboard', dashboardData, {
        ttl: 600,
        priority: 'normal',
        tags: ['monitoring', 'dashboard']
      }),
    ])

    // Generate summary report
    const summary = {
      healthy: healthCheck.status === 'healthy',
      totalQueues: Object.keys(dashboardData.queues).length,
      activeJobs: dashboardData.overview.processingJobs,
      pendingJobs: Object.values(dashboardData.queues).reduce((sum: number, queue: any) => sum + (queue.pending || 0), 0),
      failureRate: dashboardData.performance.errorRate,
      p95Latency: dashboardData.performance.latency.p95,
      throughputLast1h: dashboardData.performance.throughput.last1h,
      criticalAlerts: dashboardData.alerts.critical,
    }

    console.log(`✅ Monitoring data collection completed in ${duration}ms`)
    console.log(`📈 Summary:`, summary)

    // Check for system health issues
    if (!summary.healthy || summary.criticalAlerts > 0 || summary.failureRate > 0.1) {
      await cacheManager.set('monitoring:health-alert', {
        message: 'System health degraded',
        timestamp: Date.now(),
        issues: {
          unhealthy: !summary.healthy,
          criticalAlerts: summary.criticalAlerts,
          highFailureRate: summary.failureRate > 0.1,
        },
        summary
      }, {
        ttl: 1800, // 30 minutes
        priority: 'critical',
        tags: ['monitoring', 'health', 'alert']
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Monitoring data collection completed',
      summary,
      collectionTime: duration,
      dataPoints: {
        jobMetrics: Object.keys(jobMetrics.queues).length,
        alertsCollected: alerts.length,
        dlqQueues: Object.keys(dlqStats.queues).length,
      }
    })

  } catch (error) {
    console.error('❌ Monitoring data collection failed:', error)
    
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Cache error for debugging
    await cacheManager.set('monitoring:collection-error', {
      lastError: new Date().toISOString(),
      error: errorMessage,
      duration,
      timestamp: Date.now()
    }, {
      ttl: 3600, // 1 hour
      priority: 'critical',
      tags: ['monitoring', 'error']
    }).catch(console.error)

    return res.status(500).json({
      success: false,
      message: 'Monitoring data collection failed',
      error: errorMessage,
      collectionTime: duration
    })
  }
}