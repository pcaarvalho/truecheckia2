// @ts-nocheck
import { Router, Request, Response } from 'express'
import { prisma } from '@truecheckia/database'
import { performance } from 'perf_hooks'

const router = Router()

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  checks: {
    database: DatabaseCheck
    memory: MemoryCheck
    environment: EnvironmentCheck
  }
  responseTime: number
}

interface DatabaseCheck {
  status: 'healthy' | 'unhealthy'
  responseTime: number | null
  connectionPool?: {
    active: number
    idle: number
    total: number
  }
  error?: string
}

interface MemoryCheck {
  status: 'healthy' | 'warning' | 'critical'
  usage: {
    rss: number
    heapUsed: number
    heapTotal: number
    external: number
  }
  percentUsed: number
}

interface EnvironmentCheck {
  status: 'healthy' | 'degraded'
  nodeEnv: string
  databaseUrl: boolean
  requiredEnvVars: {
    [key: string]: boolean
  }
}

/**
 * Comprehensive health check endpoint
 * Tests database connectivity, memory usage, and system health
 */
router.get('/health', async (req: Request, res: Response) => {
  const start = performance.now()
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
  
  try {
    // Database health check
    const dbCheck = await checkDatabaseHealth()
    if (dbCheck.status === 'unhealthy') {
      overallStatus = 'unhealthy'
    }
    
    // Memory health check
    const memCheck = checkMemoryHealth()
    if (memCheck.status === 'critical') {
      overallStatus = 'unhealthy'
    } else if (memCheck.status === 'warning' && overallStatus === 'healthy') {
      overallStatus = 'degraded'
    }
    
    // Environment health check
    const envCheck = checkEnvironmentHealth()
    if (envCheck.status === 'degraded' && overallStatus === 'healthy') {
      overallStatus = 'degraded'
    }
    
    const responseTime = Math.round(performance.now() - start)
    
    const healthResponse: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: dbCheck,
        memory: memCheck,
        environment: envCheck
      },
      responseTime
    }
    
    // Set appropriate HTTP status code
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503
    
    res.status(statusCode).json(healthResponse)
    
  } catch (error) {
    const responseTime = Math.round(performance.now() - start)
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
      checks: {
        database: { status: 'unhealthy', responseTime: null, error: 'Health check failed' },
        memory: checkMemoryHealth(),
        environment: checkEnvironmentHealth()
      }
    } as HealthCheckResponse & { error: string })
  }
})

export { router as healthRoutes }