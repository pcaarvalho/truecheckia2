import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cacheManager } from '../../_utils/cache-manager'
import { upstash } from '../../../apps/api/src/lib/upstash'
import { prisma } from '@truecheckia/database'

/**
 * Health Check Cron Job
 * Runs every minute to monitor system health and warm critical connections
 * Provides real-time monitoring data for system status
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
  const healthData: any = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {},
    performance: {},
    warnings: []
  }

  try {
    console.log('🏥 Starting health check...')

    // 1. Check Redis/Upstash connectivity
    await checkRedisHealth(healthData)

    // 2. Check Database connectivity
    await checkDatabaseHealth(healthData)

    // 3. Check OpenAI API (optional - may be rate limited)
    await checkOpenAIHealth(healthData)

    // 4. Check system performance metrics
    await checkPerformanceMetrics(healthData)

    // 5. Check cache performance
    await checkCachePerformance(healthData)

    // 6. Warm critical connections
    await warmCriticalConnections()

    healthData.performance.totalCheckTime = Date.now() - startTime

    // Determine overall health status
    const failedServices = Object.values(healthData.services).filter(
      (service: any) => service.status === 'unhealthy'
    ).length

    if (failedServices > 0) {
      healthData.status = failedServices > 1 ? 'critical' : 'degraded'
    }

    // Cache health data
    await cacheManager.set('system:health', healthData, {
      ttl: 120, // 2 minutes
      priority: 'critical',
      tags: ['system', 'health']
    })

    console.log(`✅ Health check completed in ${healthData.performance.totalCheckTime}ms`)
    console.log(`📊 Status: ${healthData.status}`)

    return res.status(200).json({
      success: true,
      message: 'Health check completed',
      health: healthData
    })

  } catch (error) {
    console.error('❌ Health check failed:', error)
    
    healthData.status = 'critical'
    healthData.error = error instanceof Error ? error.message : 'Unknown error'
    healthData.performance.totalCheckTime = Date.now() - startTime

    return res.status(500).json({
      success: false,
      message: 'Health check failed',
      health: healthData
    })
  }
}

/**
 * Check Redis/Upstash connectivity and performance
 */
async function checkRedisHealth(healthData: any): Promise<void> {
  const startTime = Date.now()
  
  try {
    // Test basic connectivity
    const pingResult = await upstash.ping()
    
    // Test read/write performance
    const testKey = 'health_check:redis'
    await upstash.set(testKey, Date.now().toString(), { ex: 60 })
    const readResult = await upstash.get(testKey)
    
    const responseTime = Date.now() - startTime
    
    healthData.services.redis = {
      status: 'healthy',
      responseTime,
      pingResult,
      readWriteTest: !!readResult
    }

    if (responseTime > 1000) {
      healthData.warnings.push('Redis response time is high')
    }

  } catch (error) {
    healthData.services.redis = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    }
  }
}

/**
 * Check Database connectivity and performance
 */
async function checkDatabaseHealth(healthData: any): Promise<void> {
  const startTime = Date.now()
  
  try {
    // Test basic connectivity with a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`
    
    // Test connection pool
    const userCount = await prisma.user.count()
    
    const responseTime = Date.now() - startTime
    
    healthData.services.database = {
      status: 'healthy',
      responseTime,
      connectionTest: !!result,
      userCount
    }

    if (responseTime > 2000) {
      healthData.warnings.push('Database response time is high')
    }

  } catch (error) {
    healthData.services.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    }
  }
}

/**
 * Check OpenAI API availability (lightweight check)
 */
async function checkOpenAIHealth(healthData: any): Promise<void> {
  const startTime = Date.now()
  
  try {
    // Check if OpenAI API key is configured
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Simple lightweight check - just validate key format
    if (!apiKey.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format')
    }

    const responseTime = Date.now() - startTime
    
    healthData.services.openai = {
      status: 'healthy',
      responseTime,
      keyConfigured: true,
      note: 'Lightweight check - actual API not called to avoid rate limits'
    }

  } catch (error) {
    healthData.services.openai = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    }
  }
}

/**
 * Check system performance metrics
 */
async function checkPerformanceMetrics(healthData: any): Promise<void> {
  try {
    // Memory usage (if available in serverless environment)
    const memoryUsage = process.memoryUsage()
    
    // Environment info
    const nodeVersion = process.version
    const platform = process.platform
    
    healthData.performance.memory = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memoryUsage.external / 1024 / 1024) // MB
    }
    
    healthData.performance.environment = {
      nodeVersion,
      platform,
      uptime: process.uptime()
    }

    // Check for memory warnings
    if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.9) {
      healthData.warnings.push('High memory usage detected')
    }

  } catch (error) {
    healthData.performance.error = error instanceof Error ? error.message : 'Unknown error'
  }
}

/**
 * Check cache performance and hit rates
 */
async function checkCachePerformance(healthData: any): Promise<void> {
  try {
    // Get cache metrics from cache manager
    const metrics = cacheManager.getMetrics()
    
    const cacheStats = {
      patterns: metrics.size,
      totalHits: 0,
      totalMisses: 0,
      averageHitRate: 0
    }

    for (const [pattern, stats] of metrics) {
      cacheStats.totalHits += stats.hits
      cacheStats.totalMisses += stats.misses
    }

    if (cacheStats.totalHits + cacheStats.totalMisses > 0) {
      cacheStats.averageHitRate = (cacheStats.totalHits / (cacheStats.totalHits + cacheStats.totalMisses)) * 100
    }

    healthData.performance.cache = cacheStats

    // Warning for low cache hit rate
    if (cacheStats.averageHitRate < 50 && cacheStats.totalHits + cacheStats.totalMisses > 100) {
      healthData.warnings.push('Low cache hit rate detected')
    }

  } catch (error) {
    healthData.performance.cacheError = error instanceof Error ? error.message : 'Unknown error'
  }
}

/**
 * Warm critical connections to prevent cold starts
 */
async function warmCriticalConnections(): Promise<void> {
  try {
    // Keep database connection warm
    await prisma.$queryRaw`SELECT 1`
    
    // Keep Redis connection warm
    await upstash.ping()
    
    // Pre-warm critical cache keys
    await cacheManager.get('system:health')
    
    console.log('🔥 Critical connections warmed')
    
  } catch (error) {
    console.warn('Failed to warm critical connections:', error)
  }
}