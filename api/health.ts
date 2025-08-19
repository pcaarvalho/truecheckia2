import { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma, checkDatabaseHealth } from './_shared/database'
import { config } from './_shared/config'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const startTime = Date.now()
    
    // Check database health
    const dbHealth = await checkDatabaseHealth()
    
    // Check basic config
    const hasRequiredEnv = !!(
      config.database.url &&
      config.openai.apiKey &&
      config.auth.jwtSecret
    )

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`,
      services: {
        database: dbHealth.status,
        config: hasRequiredEnv ? 'healthy' : 'missing_env',
        api: 'healthy'
      },
      environment: {
        node_env: process.env.NODE_ENV,
        vercel: !!process.env.VERCEL,
        region: process.env.VERCEL_REGION,
      },
      version: '1.0.0'
    }

    // Set overall status based on services
    const allHealthy = Object.values(health.services).every(status => status === 'healthy')
    health.status = allHealthy ? 'healthy' : 'degraded'

    res.status(allHealthy ? 200 : 503).json(health)

  } catch (error) {
    console.error('Health check failed:', error)
    
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
      services: {
        database: 'unknown',
        config: 'unknown',
        api: 'unhealthy'
      }
    })
  }
}