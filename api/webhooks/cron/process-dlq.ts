import type { VercelRequest, VercelResponse } from '@vercel/node'
import { DeadLetterQueue } from '../../../apps/api/src/lib/dead-letter-queue'
import { cacheManager } from '../../_utils/cache-manager'

/**
 * Dead Letter Queue Processing Cron Job
 * Runs every 5 minutes to process failed jobs that are ready for retry
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
    console.log('⚡ Starting DLQ processing...')

    // Process retry queue
    const results = await DeadLetterQueue.processRetryQueue()
    processed = results.processed
    failed = results.failed
    errors = results.errors

    // Get DLQ statistics for monitoring
    const dlqStats = await DeadLetterQueue.getStats()

    const duration = Date.now() - startTime

    console.log(`✅ DLQ processing completed in ${duration}ms`)
    console.log(`📊 Processed: ${processed}, Failed: ${failed}`)
    console.log(`📈 DLQ stats:`, dlqStats)

    // Cache DLQ metrics for monitoring
    await cacheManager.set('dlq:metrics', {
      lastRun: new Date().toISOString(),
      processed,
      failed,
      duration,
      dlqStats,
      errors: errors.slice(0, 10), // Keep only first 10 errors
      timestamp: Date.now()
    }, {
      ttl: 300, // 5 minutes
      priority: 'high',
      tags: ['dlq', 'metrics']
    })

    // Create alerts if there are many failures
    if (failed > 5) {
      await cacheManager.set('dlq:alert:high-failures', {
        message: `High number of DLQ failures: ${failed}`,
        timestamp: Date.now(),
        failed,
        errors: errors.slice(0, 5)
      }, {
        ttl: 3600, // 1 hour
        priority: 'critical',
        tags: ['dlq', 'alert']
      })
    }

    return res.status(200).json({
      success: true,
      message: 'DLQ processing completed',
      results: {
        processed,
        failed,
        duration,
        dlqStats,
        errorCount: errors.length
      }
    })

  } catch (error) {
    console.error('❌ DLQ processing failed:', error)
    
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    errors.push(errorMessage)

    // Cache error metrics
    await cacheManager.set('dlq:error', {
      lastError: new Date().toISOString(),
      error: errorMessage,
      duration,
      timestamp: Date.now()
    }, {
      ttl: 3600, // 1 hour
      priority: 'critical',
      tags: ['dlq', 'error']
    }).catch(console.error)

    return res.status(500).json({
      success: false,
      message: 'DLQ processing failed',
      error: errorMessage,
      results: {
        processed,
        failed,
        duration,
        errorCount: errors.length
      }
    })
  }
}