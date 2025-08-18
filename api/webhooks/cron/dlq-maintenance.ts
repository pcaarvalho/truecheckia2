import type { VercelRequest, VercelResponse } from '@vercel/node'
import { DeadLetterQueue } from '../../../apps/api/src/lib/dead-letter-queue'
import { cacheManager } from '../../_utils/cache-manager'

/**
 * DLQ Maintenance Cron Job
 * Runs daily at 4 AM to clean up old failed jobs and maintain DLQ health
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
    console.log('🧹 Starting DLQ maintenance...')

    // Get initial DLQ stats
    const initialStats = await DeadLetterQueue.getStats()

    // Purge old failed jobs (older than 7 days)
    const purgeResult = await DeadLetterQueue.purgeOldJobs(7)

    // Get post-cleanup stats
    const finalStats = await DeadLetterQueue.getStats()

    const duration = Date.now() - startTime

    // Calculate cleanup impact
    const cleanupSummary = {
      purgedJobs: purgeResult.purged,
      beforeCleanup: {
        totalFailed: initialStats.totalFailed,
        totalPermanentFailures: initialStats.totalPermanentFailures,
        retryQueue: initialStats.retryQueue,
      },
      afterCleanup: {
        totalFailed: finalStats.totalFailed,
        totalPermanentFailures: finalStats.totalPermanentFailures,
        retryQueue: finalStats.retryQueue,
      },
      reduction: {
        failed: initialStats.totalFailed - finalStats.totalFailed,
        permanentFailures: initialStats.totalPermanentFailures - finalStats.totalPermanentFailures,
      }
    }

    console.log(`✅ DLQ maintenance completed in ${duration}ms`)
    console.log(`🗑️ Purged ${purgeResult.purged} old jobs`)
    console.log(`📊 Cleanup summary:`, cleanupSummary)

    // Cache maintenance results
    await cacheManager.set('dlq:maintenance:last-run', {
      timestamp: new Date().toISOString(),
      duration,
      results: cleanupSummary,
      success: true
    }, {
      ttl: 86400, // 24 hours
      priority: 'normal',
      tags: ['dlq', 'maintenance']
    })

    // Generate health report
    const healthReport = {
      dlqSize: finalStats.totalFailed,
      retryQueueSize: finalStats.retryQueue,
      permanentFailures: finalStats.totalPermanentFailures,
      health: 'good' as 'good' | 'warning' | 'critical',
      recommendations: [] as string[],
    }

    // Assess DLQ health and provide recommendations
    if (finalStats.totalFailed > 100) {
      healthReport.health = 'warning'
      healthReport.recommendations.push('High number of failed jobs - investigate root causes')
    }

    if (finalStats.totalPermanentFailures > 50) {
      healthReport.health = 'critical'
      healthReport.recommendations.push('Many jobs have exceeded retry limits - manual intervention may be needed')
    }

    if (finalStats.retryQueue > 50) {
      healthReport.health = 'warning'
      healthReport.recommendations.push('Large retry queue - consider increasing processing frequency')
    }

    // Cache health report
    await cacheManager.set('dlq:health-report', healthReport, {
      ttl: 86400, // 24 hours
      priority: 'high',
      tags: ['dlq', 'health']
    })

    // Log performance metrics for analysis
    const performanceMetrics = {
      maintenanceDuration: duration,
      jobsPerSecond: purgeResult.purged > 0 ? purgeResult.purged / (duration / 1000) : 0,
      efficiency: purgeResult.purged > 0 ? (purgeResult.purged / initialStats.totalFailed) * 100 : 0,
    }

    await cacheManager.set('dlq:performance-metrics', performanceMetrics, {
      ttl: 86400, // 24 hours
      priority: 'normal',
      tags: ['dlq', 'performance']
    })

    return res.status(200).json({
      success: true,
      message: 'DLQ maintenance completed successfully',
      results: cleanupSummary,
      healthReport,
      performance: performanceMetrics,
      duration
    })

  } catch (error) {
    console.error('❌ DLQ maintenance failed:', error)
    
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Cache error for monitoring
    await cacheManager.set('dlq:maintenance:error', {
      timestamp: new Date().toISOString(),
      error: errorMessage,
      duration,
      success: false
    }, {
      ttl: 86400, // 24 hours
      priority: 'critical',
      tags: ['dlq', 'maintenance', 'error']
    }).catch(console.error)

    return res.status(500).json({
      success: false,
      message: 'DLQ maintenance failed',
      error: errorMessage,
      duration
    })
  }
}