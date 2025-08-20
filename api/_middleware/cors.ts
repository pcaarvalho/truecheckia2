import type { VercelRequest, VercelResponse } from '@vercel/node'
import { config } from '../_shared/config'

export interface CorsOptions {
  origins?: string[]
  methods?: string[]
  allowedHeaders?: string[]
  credentials?: boolean
  maxAge?: number
}

/**
 * Enhanced CORS middleware for Vercel serverless functions
 * Provides consistent CORS handling across all API endpoints
 */
export function corsMiddleware(options: CorsOptions = {}) {
  const {
    origins = config.cors.origins,
    methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders = [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With',
      'x-api-key',
      'x-client-version',
      'Accept',
      'Origin',
      'Cache-Control'
    ],
    credentials = config.cors.credentials,
    maxAge = 86400 // 24 hours
  } = options

  return function cors(req: VercelRequest, res: VercelResponse, next?: () => void) {
    const origin = req.headers.origin
    
    // Determine allowed origin
    let allowedOrigin = origins[0] || 'https://www.truecheckia.com'
    
    if (origin) {
      if (origins.includes(origin)) {
        allowedOrigin = origin
      } else {
        // Log rejected origins in development for debugging
        if (config.isDev) {
          console.warn(`🚫 CORS: Rejected origin: ${origin}`)
          console.log('✅ Allowed origins:', origins)
        }
      }
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
    res.setHeader('Access-Control-Allow-Methods', methods.join(','))
    res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(','))
    
    if (credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true')
    }
    
    res.setHeader('Access-Control-Max-Age', maxAge.toString())

    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

    // Add performance headers
    res.setHeader('X-Powered-By', 'TrueCheckIA')
    res.setHeader('X-API-Version', '1.0.0')

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(204).end()
      return
    }

    // Continue to next middleware or handler
    if (next) {
      next()
    }
  }
}

/**
 * Wrapper function to apply CORS to any Vercel function handler
 */
export function withCors<T extends VercelRequest, U extends VercelResponse>(
  handler: (req: T, res: U) => Promise<void> | void,
  corsOptions?: CorsOptions
) {
  const cors = corsMiddleware(corsOptions)
  
  return async (req: T, res: U) => {
    // Apply CORS
    cors(req, res)
    
    // If it's a preflight request, CORS middleware already handled it
    if (req.method === 'OPTIONS') {
      return
    }
    
    // Execute the actual handler
    try {
      await handler(req, res)
    } catch (error) {
      console.error('Handler error:', error)
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: config.isDev ? (error as Error).message : 'Internal server error'
          }
        })
      }
    }
  }
}

/**
 * Health check function to test CORS configuration
 */
export function testCorsConfiguration(req: VercelRequest): {
  origin: string | undefined
  allowed: boolean
  allowedOrigins: string[]
  userAgent: string | undefined
} {
  const origin = req.headers.origin
  const allowed = origin ? config.cors.origins.includes(origin) : true
  
  return {
    origin,
    allowed,
    allowedOrigins: config.cors.origins,
    userAgent: req.headers['user-agent']
  }
}