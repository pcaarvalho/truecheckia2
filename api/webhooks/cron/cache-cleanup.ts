import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cacheManager } from '../../_utils/cache-manager'

/**
 * Cache Cleanup Cron Job
 * Runs every 6 hours to clean expired entries and optimize cache
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
    console.log('🧹 Starting cache cleanup...')

    // Get cache stats before cleanup
    const statsBefore = await cacheManager.getStats()

    // Perform cleanup
    const cleanupResults = await cacheManager.cleanup()

    // Get cache stats after cleanup
    const statsAfter = await cacheManager.getStats()

    const duration = Date.now() - startTime

    const summary = {
      duration,
      cleanupResults,
      before: {
        totalEntries: Object.values(statsBefore.size).reduce((sum, count) => sum + count, 0),
        hitRate: statsBefore.hitRate,
        memoryUsage: statsBefore.memoryUsage?.estimatedTotalSize || 0,
      },
      after: {
        totalEntries: Object.values(statsAfter.size).reduce((sum, count) => sum + count, 0),
        hitRate: statsAfter.hitRate,
        memoryUsage: statsAfter.memoryUsage?.estimatedTotalSize || 0,
      },
      improvement: {
        entriesReduced: Object.values(statsBefore.size).reduce((sum, count) => sum + count, 0) - 
                        Object.values(statsAfter.size).reduce((sum, count) => sum + count, 0),
        memoryFreed: (statsBefore.memoryUsage?.estimatedTotalSize || 0) - 
                     (statsAfter.memoryUsage?.estimatedTotalSize || 0),
      }
    }

    console.log(`✅ Cache cleanup completed in ${duration}ms`)
    console.log(`🗑️ Expired: ${cleanupResults.expired}, Optimized: ${cleanupResults.optimized}, Errors: ${cleanupResults.errors}`)
    console.log(`📊 Memory freed: ${summary.improvement.memoryFreed} bytes`)

    return res.status(200).json({
      success: true,
      message: 'Cache cleanup completed successfully',
      summary
    })

  } catch (error) {
    console.error('❌ Cache cleanup failed:', error)
    
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return res.status(500).json({
      success: false,
      message: 'Cache cleanup failed',
      error: errorMessage,
      duration
    })
  }
}