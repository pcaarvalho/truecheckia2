import type { VercelRequest, VercelResponse } from '@vercel/node'

export interface CorsOptions {
  origins?: string[]
  methods?: string[]
  allowedHeaders?: string[]
  credentials?: boolean
  maxAge?: number
}

/**
 * Get CORS configuration with fallbacks
 */
function getCorsConfig() {
  // Try to load config with fallbacks
  try {
    const { config } = require('../_shared/config')
    return {
      origins: config?.cors?.origins || ['https://www.truecheckia.com', 'https://truecheckia.com'],
      credentials: config?.cors?.credentials || true
    }
  } catch (error) {
    console.warn('Could not load config, using fallback CORS settings')
    return {
      origins: ['https://www.truecheckia.com', 'https://truecheckia.com'],
      credentials: true
    }
  }
}

/**
 * Set CORS headers on response
 */
export function setCorsHeaders(
  req: VercelRequest, 
  res: VercelResponse, 
  options: CorsOptions = {}
) {
  const corsConfig = getCorsConfig()
  
  const {
    origins = corsConfig.origins,
    methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders = [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With',
      'x-api-key',
      'x-client-version'
    ],
    credentials = corsConfig.credentials,
    maxAge = 86400
  } = options

  const origin = req.headers.origin
  let allowedOrigin = origins[0] || 'https://www.truecheckia.com'
  
  if (origin && origins.includes(origin)) {
    allowedOrigin = origin
  }

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', methods.join(','))
  res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(','))
  res.setHeader('Access-Control-Allow-Credentials', credentials.toString())
  res.setHeader('Access-Control-Max-Age', maxAge.toString())
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
}

/**
 * CORS middleware function
 */
export function corsMiddleware(options: CorsOptions = {}) {
  return function(req: VercelRequest, res: VercelResponse, next?: () => void) {
    setCorsHeaders(req, res, options)
    
    if (req.method === 'OPTIONS') {
      res.status(204).end()
      return
    }
    
    if (next) next()
  }
}

/**
 * Simplified CORS wrapper for Vercel functions
 */
export function withCors(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void,
  corsOptions?: CorsOptions
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      // Set CORS headers
      setCorsHeaders(req, res, corsOptions)
      
      // Handle preflight
      if (req.method === 'OPTIONS') {
        res.status(204).end()
        return
      }
      
      // Execute handler
      await handler(req, res)
    } catch (error) {
      console.error('CORS Handler error:', error)
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: (error as Error).message
          }
        })
      }
    }
  }
}

/**
 * Test CORS configuration
 */
export function testCorsConfiguration(req: VercelRequest) {
  const corsConfig = getCorsConfig()
  const origin = req.headers.origin
  const allowed = origin ? corsConfig.origins.includes(origin) : true
  
  return {
    origin,
    allowed,
    allowedOrigins: corsConfig.origins,
    userAgent: req.headers['user-agent']
  }
}