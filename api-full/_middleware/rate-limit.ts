import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { config, ERROR_CODES } from '@truecheckia/config'
import { ExtendedVercelRequest } from '../_utils/vercel-adapter'
import type { ApiResponse } from '@truecheckia/types'
import { cacheManager, cacheKey } from '../_utils/cache-manager'
import { upstash } from '../../apps/api/src/lib/upstash'

// Use optimized Upstash instance
const redis = upstash

export function createRateLimitMiddleware(maxRequests?: number, windowMs?: number) {
  return async (req: ExtendedVercelRequest, res: VercelResponse, next: () => void) => {
    const max = maxRequests || config.limits.rateLimit.max
    const window = windowMs || config.limits.rateLimit.windowMs
    
    // Get client identifier
    const identifier = getClientIdentifier(req)
    const key = `rate_limit:${identifier}`
    
    try {
      const current = await redis.incr(key)
      
      if (current === 1) {
        await redis.expire(key, Math.ceil(window / 1000))
      }
      
      if (current > max) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: ERROR_CODES.RATE_LIMIT,
            message: 'Too many requests, please try again later',
          },
        }
        res.status(429).json(response)
        return
      }
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max)
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current))
      res.setHeader('X-RateLimit-Reset', Date.now() + window)
      
      next()
    } catch (error) {
      // If Redis fails, allow the request to proceed
      console.warn('Rate limiting failed:', error)
      next()
    }
  }
}

export function createAuthRateLimitMiddleware() {
  return createAdaptiveRateLimitMiddleware({
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDuration: 30 * 60, // 30 minutes block for auth abuse
    userTierMultipliers: {
      free: 1,
      pro: 2,
      enterprise: 5
    }
  })
}

export function createAnalysisRateLimitMiddleware() {
  return createAdaptiveRateLimitMiddleware({
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    burstAllowance: 5, // Allow 5 extra requests for burst
    blockDuration: 5 * 60, // 5 minutes block
    userTierMultipliers: {
      free: 1, // 10 per minute
      pro: 5, // 50 per minute
      enterprise: 10 // 100 per minute
    }
  })
}

export function createApiRateLimitMiddleware() {
  return createAdaptiveRateLimitMiddleware({
    maxRequests: 50,
    windowMs: 60 * 1000, // 1 minute
    burstAllowance: 20,
    blockDuration: 2 * 60, // 2 minutes block
    userTierMultipliers: {
      free: 1, // 50 per minute
      pro: 4, // 200 per minute
      enterprise: 10 // 500 per minute
    }
  })
}

export function createGeneralRateLimitMiddleware() {
  return createAdaptiveRateLimitMiddleware({
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    burstAllowance: 10,
    userTierMultipliers: {
      free: 1,
      pro: 3,
      enterprise: 5
    }
  })
}

function getClientIdentifier(req: VercelRequest): string {
  const extReq = req as ExtendedVercelRequest
  
  // Priority order: User ID > API Key > IP Address
  if (extReq.userId) {
    return `user:${extReq.userId}`
  }
  
  // Check for API key
  const apiKey = req.headers['x-api-key'] as string
  if (apiKey) {
    // Use last 8 characters of API key for identification
    return `apikey:${apiKey.slice(-8)}`
  }
  
  // Use IP address with additional fingerprinting
  const forwarded = req.headers['x-forwarded-for']
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded || req.connection?.remoteAddress || 'unknown'
  
  // Add user agent hash for additional uniqueness
  const userAgent = req.headers['user-agent'] || ''
  const fingerprint = userAgent ? `:${hashString(userAgent).slice(0, 8)}` : ''
  
  return `ip:${ip}${fingerprint}`
}

// Simple hash function for user agent fingerprinting
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16)
}

/**
 * Enhanced rate limiting with adaptive limits
 */
export interface RateLimitConfig {
  maxRequests?: number
  windowMs?: number
  blockDuration?: number
  burstAllowance?: number
  userTierMultipliers?: {
    free: number
    pro: number
    enterprise: number
  }
}

export function createAdaptiveRateLimitMiddleware(config: RateLimitConfig = {}) {
  return async (req: ExtendedVercelRequest, res: VercelResponse, next: () => void) => {
    const identifier = getClientIdentifier(req)
    const userPlan = req.user?.plan || 'free'
    
    // Calculate adaptive limits based on user plan
    const baseLimits = getBaseLimits(config)
    const userMultiplier = config.userTierMultipliers?.[userPlan as keyof typeof config.userTierMultipliers] || 1
    const maxRequests = Math.floor(baseLimits.max * userMultiplier)
    const windowMs = baseLimits.window
    
    const key = `rate_limit:${identifier}`
    const burstKey = `burst_limit:${identifier}`
    const blockKey = `blocked:${identifier}`
    
    try {
      // Check if user is blocked
      const isBlocked = await redis.exists(blockKey)
      if (isBlocked) {
        const ttl = await redis.ttl(blockKey)
        const response: ApiResponse = {
          success: false,
          error: {
            code: ERROR_CODES.RATE_LIMIT,
            message: 'Rate limit exceeded. Access temporarily blocked.',
            details: { blockedUntil: Date.now() + (ttl * 1000) }
          },
        }
        res.status(429).json(response)
        return
      }
      
      // Implement sliding window with burst capacity
      const current = await redis.incr(key)
      
      if (current === 1) {
        await redis.expire(key, Math.ceil(windowMs / 1000))
      }
      
      // Check burst allowance for authenticated users
      let burstUsed = 0
      if (req.user && config.burstAllowance) {
        burstUsed = await redis.get(burstKey) || 0
      }
      
      const totalAllowed = maxRequests + (config.burstAllowance || 0)
      const totalUsed = current + burstUsed
      
      if (totalUsed > totalAllowed) {
        // Apply temporary block for severe violations
        if (current > maxRequests * 2) {
          const blockDuration = config.blockDuration || 300 // 5 minutes
          await redis.set(blockKey, '1', { ex: blockDuration })
        }
        
        const response: ApiResponse = {
          success: false,
          error: {
            code: ERROR_CODES.RATE_LIMIT,
            message: 'Rate limit exceeded',
            details: {
              limit: maxRequests,
              used: current,
              resetAt: Date.now() + windowMs,
              upgradeHint: userPlan === 'free' ? 'Upgrade for higher limits' : undefined
            }
          },
        }
        res.status(429).json(response)
        return
      }
      
      // Use burst capacity if needed
      if (current > maxRequests && req.user && config.burstAllowance) {
        const burstUsage = current - maxRequests
        await redis.incr(burstKey)
        await redis.expire(burstKey, Math.ceil(windowMs / 1000))
      }
      
      // Set enhanced rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests)
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current))
      res.setHeader('X-RateLimit-Reset', Date.now() + windowMs)
      res.setHeader('X-RateLimit-Burst-Limit', config.burstAllowance || 0)
      res.setHeader('X-RateLimit-Burst-Remaining', Math.max(0, (config.burstAllowance || 0) - burstUsed))
      
      next()
    } catch (error) {
      console.warn('Rate limiting failed:', error)
      next()
    }
  }
}

function getBaseLimits(config: RateLimitConfig) {
  return {
    max: config.maxRequests || 100,
    window: config.windowMs || 60000
  }
}