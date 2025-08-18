import rateLimit from 'express-rate-limit'
import { config, ERROR_CODES } from '@truecheckia/config'
import type { ApiResponse } from '@truecheckia/types'

export const createRateLimiter = (max?: number, windowMs?: number) => {
  // In development, significantly relax rate limits
  const isDev = config.env === 'development'
  
  return rateLimit({
    max: isDev ? (max || 1000) : (max || config.limits.rateLimit.max),
    windowMs: isDev ? (windowMs || 60 * 1000) : (windowMs || config.limits.rateLimit.windowMs), // 1 minute in dev
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for localhost in development
    skip: (req) => {
      if (isDev) {
        const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress
        return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip?.startsWith('::ffff:127.0.0.1')
      }
      return false
    },
    handler: (req, res) => {
      const response: ApiResponse = {
        success: false,
        error: {
          code: ERROR_CODES.RATE_LIMIT,
          message: 'Too many requests, please try again later',
        },
      }
      res.status(429).json(response)
    },
  })
}

// Different rate limiters for different endpoints
export const generalLimiter = createRateLimiter()
// In development: 100 requests per minute, in production: 5 requests per 15 minutes
export const authLimiter = createRateLimiter(
  config.env === 'development' ? 100 : 5,
  config.env === 'development' ? 60 * 1000 : 15 * 60 * 1000
)
export const analysisLimiter = createRateLimiter(30, 60 * 1000) // 30 requests per minute
export const apiLimiter = createRateLimiter(100, 60 * 1000) // 100 requests per minute for API users