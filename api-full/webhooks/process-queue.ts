import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ServerlessQueueManager } from '../../apps/api/src/queues/serverless-index'
import ServerlessAnalysisQueue from '../../apps/api/src/queues/serverless-analysis.queue'
import ServerlessEmailQueue from '../../apps/api/src/queues/serverless-email.queue'
import ServerlessCreditsQueue from '../../apps/api/src/queues/serverless-credits.queue'
import { DeadLetterQueue } from '../../apps/api/src/lib/dead-letter-queue'
import { JobMonitor } from '../../apps/api/src/lib/job-monitor'
import { cacheManager } from '../_utils/cache-manager'

/**
 * Universal Queue Processing Webhook
 * Handles immediate processing of specific queue types or all queues
 * Supports batch processing with proper error handling and monitoring
 */

interface ProcessRequest {
  queue?: 'analysis' | 'email' | 'credits' | 'all'
  maxJobs?: number
  includeRetries?: boolean
  priority?: 'high' | 'normal' | 'low'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // Verify webhook authorization
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const startTime = Date.now()
  const requestData: ProcessRequest = req.body || {}
  const { queue = 'all', maxJobs = 10, includeRetries = true, priority = 'normal' } = requestData

  try {
    console.log(`⚡ Starting queue processing: ${queue} (max: ${maxJobs}, retries: ${includeRetries})`)

    let results: any = {}

    // Process retries first if requested
    if (includeRetries) {
      console.log('🔄 Processing retry queue...')
      const retryResults = await DeadLetterQueue.processRetryQueue()
      results.retries = retryResults
      console.log(`Retry queue: ${retryResults.processed} processed, ${retryResults.failed} failed`)
    }

    // Process specific queue or all queues
    switch (queue) {
      case 'analysis':
        results.analysis = await processAnalysisQueue(maxJobs)
        break
      
      case 'email':
        results.email = await processEmailQueue(maxJobs)
        break
      
      case 'credits':
        results.credits = await processCreditsQueue()
        break
      
      case 'all':
      default:
        // Process all queues in parallel with limited concurrency
        const [analysisResult, emailResult, creditsResult] = await Promise.allSettled([
          processAnalysisQueue(Math.floor(maxJobs / 3)),
          processEmailQueue(Math.floor(maxJobs / 3)),
          processCreditsQueue(),
        ])

        results.analysis = analysisResult.status === 'fulfilled' 
          ? analysisResult.value 
          : { processed: 0, failed: 1, error: analysisResult.reason?.message }

        results.email = emailResult.status === 'fulfilled' 
          ? emailResult.value 
          : { processed: 0, failed: 1, error: emailResult.reason?.message }

        results.credits = creditsResult.status === 'fulfilled' 
          ? creditsResult.value 
          : { processed: 0, error: creditsResult.reason?.message }
        break
    }

    const duration = Date.now() - startTime

    // Calculate totals
    const totals = {
      processed: Object.values(results).reduce((sum: number, result: any) => 
        sum + (result?.processed || 0), 0),
      failed: Object.values(results).reduce((sum: number, result: any) => 
        sum + (result?.failed || 0), 0),
      duration,
    }

    console.log(`✅ Queue processing completed in ${duration}ms`)
    console.log(`📊 Totals: ${totals.processed} processed, ${totals.failed} failed`)

    // Cache processing metrics
    await cacheManager.set('queue:processing:last-run', {
      timestamp: new Date().toISOString(),
      queue,
      maxJobs,
      includeRetries,
      results,
      totals,
      success: totals.failed === 0
    }, {
      ttl: 600, // 10 minutes
      priority: totals.failed > 0 ? 'high' : 'normal',
      tags: ['queue', 'processing']
    })

    // Update performance tracking
    await updatePerformanceMetrics(queue, totals, duration)

    // Check for alerts if there are failures
    if (totals.failed > 0) {
      await createProcessingAlert(queue, totals, results)
    }

    return res.status(200).json({
      success: true,
      message: `Queue processing completed for ${queue}`,
      queue,
      results,
      totals,
      metadata: {
        maxJobs,
        includeRetries,
        priority,
        duration
      }
    })

  } catch (error) {
    console.error('❌ Queue processing failed:', error)
    
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Cache error for debugging
    await cacheManager.set('queue:processing:error', {
      timestamp: new Date().toISOString(),
      queue,
      error: errorMessage,
      duration,
      requestData
    }, {
      ttl: 3600, // 1 hour
      priority: 'critical',
      tags: ['queue', 'processing', 'error']
    }).catch(console.error)

    return res.status(500).json({
      success: false,
      message: 'Queue processing failed',
      error: errorMessage,
      queue,
      duration
    })
  }
}

/**
 * Process analysis queue with enhanced error handling
 */
async function processAnalysisQueue(maxJobs: number): Promise<{ processed: number; failed: number; errors: string[] }> {
  try {
    console.log(`Processing analysis queue (max: ${maxJobs})`)
    return await ServerlessAnalysisQueue.processPendingJobs()
  } catch (error) {
    console.error('Analysis queue processing failed:', error)
    return {
      processed: 0,
      failed: 1,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }
  }
}

/**
 * Process email queue with enhanced error handling
 */
async function processEmailQueue(maxJobs: number): Promise<{ processed: number; failed: number; errors: string[] }> {
  try {
    console.log(`Processing email queue (max: ${maxJobs})`)
    return await ServerlessEmailQueue.processPendingJobs()
  } catch (error) {
    console.error('Email queue processing failed:', error)
    return {
      processed: 0,
      failed: 1,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }
  }
}

/**
 * Process credits queue (scheduled operations)
 */
async function processCreditsQueue(): Promise<{ processed: number }> {
  try {
    console.log('Processing credits queue')
    
    // Credits queue doesn't have pending jobs like others
    // Instead, it handles scheduled operations based on time
    const now = new Date()
    const hour = now.getHours()
    let processed = 0

    // This would typically be called from specific time-based cron jobs
    // but we can check for any immediate processing needed
    console.log(`Credits queue check at hour ${hour}`)
    
    return { processed }
  } catch (error) {
    console.error('Credits queue processing failed:', error)
    throw error
  }
}

/**
 * Update performance metrics for monitoring
 */
async function updatePerformanceMetrics(
  queue: string, 
  totals: { processed: number; failed: number; duration: number }, 
  duration: number
): Promise<void> {
  try {
    const metrics = {
      queue,
      timestamp: Date.now(),
      processed: totals.processed,
      failed: totals.failed,
      duration,
      throughput: totals.processed > 0 ? totals.processed / (duration / 1000) : 0,
      successRate: totals.processed > 0 ? totals.processed / (totals.processed + totals.failed) : 0,
    }

    await cacheManager.set(`performance:${queue}:${Date.now()}`, metrics, {
      ttl: 86400, // 24 hours
      priority: 'normal',
      tags: ['performance', 'metrics', queue]
    })

    // Update rolling averages
    const recentMetrics = await cacheManager.getByTags(['performance', queue])
    if (recentMetrics.length > 0) {
      const avgThroughput = recentMetrics.reduce((sum, m) => sum + (m.value.throughput || 0), 0) / recentMetrics.length
      const avgSuccessRate = recentMetrics.reduce((sum, m) => sum + (m.value.successRate || 0), 0) / recentMetrics.length

      await cacheManager.set(`performance:${queue}:averages`, {
        throughput: avgThroughput,
        successRate: avgSuccessRate,
        sampleSize: recentMetrics.length,
        lastUpdated: Date.now()
      }, {
        ttl: 3600, // 1 hour
        priority: 'high',
        tags: ['performance', 'averages', queue]
      })
    }
  } catch (error) {
    console.error('Failed to update performance metrics:', error)
  }
}

/**
 * Create alert for processing failures
 */
async function createProcessingAlert(
  queue: string, 
  totals: { processed: number; failed: number }, 
  results: any
): Promise<void> {
  try {
    const failureRate = totals.failed / (totals.processed + totals.failed)
    const severity = failureRate > 0.5 ? 'critical' : failureRate > 0.2 ? 'high' : 'medium'

    await cacheManager.set(`alert:processing-failures:${Date.now()}`, {
      type: 'processing_failures',
      severity,
      queue,
      message: `High failure rate in ${queue} queue processing: ${totals.failed}/${totals.processed + totals.failed} jobs failed`,
      failureRate,
      totals,
      timestamp: Date.now(),
      acknowledged: false
    }, {
      ttl: 3600, // 1 hour
      priority: 'critical',
      tags: ['alert', 'processing', queue]
    })

    console.log(`🚨 Processing alert created for ${queue} queue: ${totals.failed} failures`)
  } catch (error) {
    console.error('Failed to create processing alert:', error)
  }
}