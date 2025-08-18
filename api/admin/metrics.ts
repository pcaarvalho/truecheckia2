import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler, PerformanceMonitor } from '../_utils/vercel-adapter'
import { requireRoleMiddleware } from '../_middleware/auth'
import { cacheManager } from '../_utils/cache-manager'
import { upstash } from '../../apps/api/src/lib/upstash'

/**
 * Performance Metrics Dashboard Endpoint
 * Provides real-time metrics for serverless functions performance
 * Only accessible by admin users
 */
const getMetrics = async (req: any, res: any) => {
  const startTime = Date.now()
  
  try {
    // Collect all metrics
    const [
      functionMetrics,
      cacheMetrics,
      systemHealth,
      queueMetrics,
      errorMetrics
    ] = await Promise.allSettled([
      getFunctionMetrics(),
      getCacheMetrics(),
      getSystemHealth(),
      getQueueMetrics(),
      getErrorMetrics()
    ])

    const responseTime = Date.now() - startTime

    const metrics = {
      timestamp: new Date().toISOString(),
      responseTime,
      functions: functionMetrics.status === 'fulfilled' ? functionMetrics.value : null,
      cache: cacheMetrics.status === 'fulfilled' ? cacheMetrics.value : null,
      system: systemHealth.status === 'fulfilled' ? systemHealth.value : null,
      queues: queueMetrics.status === 'fulfilled' ? queueMetrics.value : null,
      errors: errorMetrics.status === 'fulfilled' ? errorMetrics.value : null,
      meta: {
        serverless: true,
        optimized: true,
        region: process.env.VERCEL_REGION || 'unknown',
        nodeVersion: process.version
      }
    }

    return res.json({
      success: true,
      data: metrics
    })

  } catch (error) {
    console.error('Failed to fetch metrics:', error)
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'METRICS_ERROR',
        message: 'Failed to fetch metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
}

/**
 * Get function performance metrics
 */
async function getFunctionMetrics() {
  try {
    const performanceMetrics = PerformanceMonitor.getMetrics()
    
    const functionStats = Array.from(performanceMetrics.entries()).map(([name, stats]) => ({
      name,
      totalCalls: stats.count,
      averageResponseTime: Math.round(stats.avgTime * 100) / 100,
      totalTime: Math.round(stats.totalTime * 100) / 100,
      errorRate: stats.count > 0 ? Math.round((stats.errors / stats.count) * 100) : 0,
      errors: stats.errors
    })).sort((a, b) => b.totalCalls - a.totalCalls)

    // Get cached function metrics
    const cachedMetrics = await Promise.allSettled([
      cacheManager.get('metrics:function:analyzeText'),
      cacheManager.get('metrics:function:loginHandler'),
      cacheManager.get('metrics:function:authenticateMiddleware')
    ])

    return {
      current: functionStats,
      cached: cachedMetrics
        .filter((result): result is PromiseFulfilledResult<any> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value)
    }
  } catch (error) {
    console.error('Failed to get function metrics:', error)
    return null
  }
}

/**
 * Get cache performance metrics
 */
async function getCacheMetrics() {
  try {
    const cacheManagerMetrics = cacheManager.getMetrics()
    
    const cacheStats = Array.from(cacheManagerMetrics.entries()).map(([pattern, stats]) => ({
      pattern,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: Math.round(stats.hitRate * 100) / 100,
      totalRequests: stats.totalRequests,
      averageResponseTime: Math.round(stats.avgResponseTime * 100) / 100
    })).sort((a, b) => b.totalRequests - a.totalRequests)

    // Redis memory info
    const redisInfo = await upstash.info('memory').catch(() => null)
    
    // Top cache keys by access
    const topKeys = await upstash.keys('*').then(keys => 
      keys.slice(0, 20) // Limit to top 20 keys
    ).catch(() => [])

    return {
      patterns: cacheStats,
      redis: {
        memory: redisInfo,
        topKeys: topKeys.length
      },
      summary: {
        totalPatterns: cacheStats.length,
        totalHits: cacheStats.reduce((sum, stat) => sum + stat.hits, 0),
        totalMisses: cacheStats.reduce((sum, stat) => sum + stat.misses, 0),
        overallHitRate: cacheStats.length > 0 
          ? Math.round((cacheStats.reduce((sum, stat) => sum + stat.hits, 0) / 
              cacheStats.reduce((sum, stat) => sum + stat.totalRequests, 0)) * 100) / 100
          : 0
      }
    }
  } catch (error) {
    console.error('Failed to get cache metrics:', error)
    return null
  }
}

/**
 * Get system health metrics
 */
async function getSystemHealth() {
  try {
    const healthData = await cacheManager.get('system:health')
    
    if (!healthData) {
      return {
        status: 'unknown',
        message: 'Health data not available - health check may not be running'
      }
    }

    return {
      ...healthData,
      age: Date.now() - new Date(healthData.timestamp).getTime()
    }
  } catch (error) {
    console.error('Failed to get system health:', error)
    return null
  }
}

/**
 * Get queue metrics
 */
async function getQueueMetrics() {
  try {
    const [analysisQueueMetrics, queueErrorMetrics] = await Promise.allSettled([
      cacheManager.get('queue:analysis:metrics'),
      cacheManager.get('queue:analysis:error')
    ])

    return {
      analysis: {
        metrics: analysisQueueMetrics.status === 'fulfilled' ? analysisQueueMetrics.value : null,
        lastError: queueErrorMetrics.status === 'fulfilled' ? queueErrorMetrics.value : null
      }
    }
  } catch (error) {
    console.error('Failed to get queue metrics:', error)
    return null
  }
}

/**
 * Get error metrics
 */
async function getErrorMetrics() {
  try {
    // Get recent error patterns from cache
    const errorKeys = await upstash.keys('error:*').catch(() => [])
    const recentErrors = await Promise.allSettled(
      errorKeys.slice(0, 10).map(key => upstash.get(key))
    )

    const errors = recentErrors
      .filter((result): result is PromiseFulfilledResult<any> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Error statistics
    const errorStats = {
      total: errors.length,
      byFunction: {} as Record<string, number>,
      byStatusCode: {} as Record<string, number>,
      last24h: 0
    }

    const last24h = Date.now() - 24 * 60 * 60 * 1000

    for (const error of errors) {
      // Count by function
      if (error.function) {
        errorStats.byFunction[error.function] = (errorStats.byFunction[error.function] || 0) + 1
      }

      // Count by status code
      if (error.statusCode) {
        errorStats.byStatusCode[error.statusCode] = (errorStats.byStatusCode[error.statusCode] || 0) + 1
      }

      // Count last 24h
      if (new Date(error.timestamp).getTime() > last24h) {
        errorStats.last24h++
      }
    }

    return {
      recent: errors.slice(0, 5), // Last 5 errors
      statistics: errorStats
    }
  } catch (error) {
    console.error('Failed to get error metrics:', error)
    return null
  }
}

const handler = createVercelHandler(
  getMetrics,
  [
    requireRoleMiddleware(['admin'])
  ],
  {
    enableMetrics: true,
    functionType: 'admin'
  }
)

export default handler