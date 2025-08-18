import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ServerlessAnalysisQueue } from '../../../apps/api/src/queues/serverless-analysis.queue'
import { cacheManager } from '../../_utils/cache-manager'

/**
 * Analysis Queue Processing Cron Job
 * Runs every 2 minutes to process pending analysis jobs
 * Replaces Bull queue worker in serverless environment
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
  let processed = 0
  let failed = 0
  let errors: string[] = []

  try {
    console.log('⚡ Starting analysis queue processing...')

    // Process pending analysis jobs
    const results = await ServerlessAnalysisQueue.processPendingJobs()
    processed = results.processed
    failed = results.failed

    // Get queue statistics
    const queueStats = await ServerlessAnalysisQueue.getQueueStats()

    const duration = Date.now() - startTime

    console.log(`✅ Analysis queue processing completed in ${duration}ms`)
    console.log(`📊 Processed: ${processed}, Failed: ${failed}`)
    console.log(`📈 Queue stats:`, queueStats)

    // Cache queue metrics for monitoring
    await cacheManager.set('queue:analysis:metrics', {
      lastRun: new Date().toISOString(),
      processed,
      failed,
      duration,
      queueStats,
      timestamp: Date.now()
    }, {
      ttl: 300, // 5 minutes
      priority: 'normal',
      tags: ['queue', 'metrics']
    })

    return res.status(200).json({
      success: true,
      message: 'Analysis queue processing completed',
      results: {
        processed,
        failed,
        duration,
        queueStats
      }
    })

  } catch (error) {
    console.error('❌ Analysis queue processing failed:', error)
    
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    errors.push(errorMessage)

    // Cache error metrics
    await cacheManager.set('queue:analysis:error', {
      lastError: new Date().toISOString(),
      error: errorMessage,
      duration,
      timestamp: Date.now()
    }, {
      ttl: 3600, // 1 hour
      priority: 'high',
      tags: ['queue', 'error']
    }).catch(console.error)

    return res.status(500).json({
      success: false,
      message: 'Analysis queue processing failed',
      error: errorMessage,
      results: {
        processed,
        failed,
        duration,
        errors
      }
    })
  }
}