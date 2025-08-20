import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { config, ERROR_CODES } from '../_shared/config'
import type { ApiResponse } from '../_shared/types'
import { performance } from 'perf_hooks'
import { cacheManager } from './cache-manager'

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: any

  constructor(message: string, statusCode: number, code: string, details?: any) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }
}

// Type definitions for extended request
interface ExtendedVercelRequest extends VercelRequest {
  user?: {
    userId: string
    email: string
    role: string
    plan: string
  }
  userId?: string
}

// Performance monitoring wrapper
class PerformanceMonitor {
  private static metrics = new Map<string, {
    count: number
    totalTime: number
    avgTime: number
    errors: number
  }>()

  static startTimer(): () => number {
    const start = performance.now()
    return () => performance.now() - start
  }

  static recordMetric(functionName: string, duration: number, isError = false): void {
    const current = this.metrics.get(functionName) || {
      count: 0,
      totalTime: 0,
      avgTime: 0,
      errors: 0
    }

    current.count++
    current.totalTime += duration
    current.avgTime = current.totalTime / current.count
    if (isError) current.errors++

    this.metrics.set(functionName, current)

    // Cache metrics for monitoring
    if (current.count % 10 === 0) {
      cacheManager.set(`metrics:function:${functionName}`, current, {
        ttl: 300,
        priority: 'low',
        tags: ['metrics', 'performance']
      }).catch(() => {}) // Silent fail
    }
  }

  static getMetrics(): Map<string, any> {
    return new Map(this.metrics)
  }
}

// Connection pooling for database and Redis
class ConnectionPool {
  private static instance: ConnectionPool
  private pools = new Map<string, any>()

  static getInstance(): ConnectionPool {
    if (!ConnectionPool.instance) {
      ConnectionPool.instance = new ConnectionPool()
    }
    return ConnectionPool.instance
  }

  async warmConnections(): Promise<void> {
    try {
      // Warm database connection
      const { prisma } = await import('../_shared/database')
      await prisma.$queryRaw`SELECT 1`

      // Warm Redis connection
      const { upstash } = await import('../../apps/api/src/lib/upstash')
      await upstash.ping()

      console.log('✅ Connections warmed')
    } catch (error) {
      console.warn('⚠️ Failed to warm connections:', error)
    }
  }
}

// Enhanced Vercel handler with performance monitoring and connection pooling
export function createVercelHandler(
  handler: (req: Request, res: Response) => Promise<void> | void,
  middleware: Array<(req: Request, res: Response, next: NextFunction) => Promise<void> | void> = [],
  options: {
    warmConnections?: boolean
    enableMetrics?: boolean
    timeout?: number
  } = {}
) {
  const {
    warmConnections = true,
    enableMetrics = true,
    timeout = 25000 // 25 seconds (leave 5s buffer for Vercel timeout)
  } = options

  return async (req: ExtendedVercelRequest, res: VercelResponse) => {
    const functionName = handler.name || 'anonymous'
    const timer = enableMetrics ? PerformanceMonitor.startTimer() : null
    let isError = false

    // Set timeout
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        console.error(`Function ${functionName} timed out after ${timeout}ms`)
        res.status(504).json({
          success: false,
          error: {
            code: 'TIMEOUT',
            message: 'Request timed out'
          }
        })
      }
    }, timeout)

    try {
      // Warm connections if enabled
      if (warmConnections) {
        ConnectionPool.getInstance().warmConnections().catch(() => {})
      }

      // Create Express-like request/response objects
      const expressReq = req as any as Request
      const expressRes = res as any as Response

      // Enhanced response object with performance headers
      if (!expressRes.json) {
        expressRes.json = (data: any) => {
          if (!res.headersSent) {
            res.setHeader('Content-Type', 'application/json')
            
            // Add performance headers
            if (timer) {
              const duration = timer()
              res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`)
              res.setHeader('X-Function-Name', functionName)
            }
            
            res.setHeader('X-Serverless-Optimized', 'true')
            res.setHeader('X-Cache-Enabled', 'true')
            
            res.status(res.statusCode || 200).send(JSON.stringify(data, null, config.isDev ? 2 : 0))
          }
          return expressRes
        }
      }

      if (!expressRes.status) {
        expressRes.status = (code: number) => {
          if (!res.headersSent) {
            res.statusCode = code
          }
          return expressRes
        }
      }

      // Apply CORS headers using centralized middleware
      if (!res.headersSent) {
        const { corsMiddleware } = await import('../_middleware/cors')
        const cors = corsMiddleware()
        cors(req, res)
        
        // Additional security headers
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
      }

      // Handle preflight requests (already handled by CORS middleware)
      if (req.method === 'OPTIONS') {
        clearTimeout(timeoutId)
        return // CORS middleware already sent the response
      }

      // Execute middleware chain with timeout protection
      for (const mw of middleware) {
        await Promise.race([
          new Promise<void>((resolve, reject) => {
            const next = (err?: any) => {
              if (err) reject(err)
              else resolve()
            }
            const result = mw(expressReq, expressRes, next)
            if (result instanceof Promise) {
              result.catch(reject)
            }
          }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Middleware timeout')), 5000)
          )
        ])
      }

      // Execute main handler with timeout protection
      await Promise.race([
        handler(expressReq, expressRes),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Handler timeout')), timeout - 5000)
        )
      ])

    } catch (error) {
      isError = true
      handleError(error, res, functionName)
    } finally {
      clearTimeout(timeoutId)
      
      // Record metrics
      if (enableMetrics && timer) {
        const duration = timer()
        PerformanceMonitor.recordMetric(functionName, duration, isError)
      }
    }
  }
}

// Enhanced error handler for Vercel Functions
function handleError(err: any, res: VercelResponse, functionName?: string) {
  let statusCode = 500
  let code = ERROR_CODES.INTERNAL_ERROR
  let message = 'Internal server error'
  let details = undefined
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400
    code = ERROR_CODES.VALIDATION_ERROR
    message = 'Validation error'
    details = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }))
  }
  // Handle custom app errors
  else if (err instanceof AppError) {
    statusCode = err.statusCode
    code = err.code
    message = err.message
    details = err.details
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    code = ERROR_CODES.UNAUTHORIZED
    message = 'Invalid token'
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401
    code = ERROR_CODES.TOKEN_EXPIRED
    message = 'Token expired'
  }
  // Handle Prisma errors
  else if (err.message && err.message.includes('P2002')) {
    statusCode = 409
    code = ERROR_CODES.EMAIL_EXISTS
    message = 'Email already exists'
  }
  // Handle timeout errors
  else if (err.message && err.message.includes('timeout')) {
    statusCode = 504
    code = 'TIMEOUT'
    message = 'Request timed out'
  }
  // Handle network errors
  else if (err.message && (err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED'))) {
    statusCode = 503
    code = 'SERVICE_UNAVAILABLE'
    message = 'External service unavailable'
  }

  // Enhanced error logging
  const errorInfo = {
    errorId,
    function: functionName,
    statusCode,
    code,
    message: err.message || message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    userAgent: res.req?.headers?.['user-agent'],
    ip: res.req?.headers?.['x-forwarded-for'] || res.req?.connection?.remoteAddress
  }

  if (config.isDev) {
    console.error('🚨 Vercel Function Error:', errorInfo)
  } else {
    // In production, log essential info only
    console.error(`Error ${errorId} in ${functionName}: ${code} - ${message}`)
  }

  // Cache error for monitoring (non-blocking)
  if (statusCode >= 500) {
    cacheManager.set(`error:${errorId}`, errorInfo, {
      ttl: 3600, // 1 hour
      priority: 'high',
      tags: ['error', 'monitoring']
    }).catch(() => {}) // Silent fail
  }

  // Send error response
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details,
      ...(config.isDev && { errorId, stack: err.stack })
    },
  }

  if (!res.headersSent) {
    res.setHeader('X-Error-ID', errorId)
    res.status(statusCode).json(response)
  }
}

// Export performance monitor for external access
export { PerformanceMonitor, ConnectionPool }

// Import Redis from optimized upstash instance
let redis: any = null

// Lazy load Redis to improve cold start
const getRedis = async () => {
  if (!redis) {
    const { upstash } = await import('../../apps/api/src/lib/upstash')
    redis = upstash
  }
  return redis
}

// Legacy rate limiting function - moved to separate middleware
export async function rateLimitMiddleware(
  req: VercelRequest,
  res: VercelResponse,
  maxRequests: number = 100,
  windowMs: number = 60000
) {
  console.warn('⚠️ Using legacy rateLimitMiddleware. Consider using createAdaptiveRateLimitMiddleware instead.')
  
  const { createAdaptiveRateLimitMiddleware } = await import('../_middleware/rate-limit')
  const middleware = createAdaptiveRateLimitMiddleware({
    maxRequests,
    windowMs
  })
  
  return new Promise<boolean>((resolve) => {
    middleware(req as any, res, () => resolve(true))
  })
}

export { ExtendedVercelRequest }