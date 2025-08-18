import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from './_utils/vercel-adapter'

const healthCheck = async (req: any, res: any) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    region: process.env.VERCEL_REGION || 'unknown',
    services: {
      database: 'checking...',
      redis: 'checking...',
      openai: 'checking...'
    }
  }

  // Basic service checks
  try {
    // Check if environment variables are set
    health.services.database = process.env.DATABASE_URL ? 'configured' : 'not_configured'
    health.services.redis = process.env.UPSTASH_REDIS_REST_URL ? 'configured' : 'not_configured'
    health.services.openai = process.env.OPENAI_API_KEY ? 'configured' : 'not_configured'

    // If any service is not configured, mark as degraded
    const allConfigured = Object.values(health.services).every(status => status === 'configured')
    health.status = allConfigured ? 'healthy' : 'degraded'

  } catch (error) {
    health.status = 'unhealthy'
    health.services = {
      database: 'error',
      redis: 'error', 
      openai: 'error'
    }
  }

  const statusCode = health.status === 'healthy' ? 200 : 
                     health.status === 'degraded' ? 200 : 503

  res.status(statusCode).json({
    success: health.status !== 'unhealthy',
    data: health
  })
}

const handler = createVercelHandler(healthCheck)
export default handler