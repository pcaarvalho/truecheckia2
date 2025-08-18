import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { createAuthRateLimitMiddleware } from '../_middleware/rate-limit'
import { validateRequestMiddleware } from '../_middleware/validation'
import { loginSchema } from '@truecheckia/types'
import { cacheManager, cacheKey } from '../_utils/cache-manager'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '@truecheckia/config'
import { prisma } from '@truecheckia/database'

// Optimized login handler with caching and security enhancements
const loginHandler = async (req: any, res: any) => {
  const startTime = Date.now()
  const { email, password } = req.body
  
  try {
    // Check for recent failed attempts (prevent brute force)
    const failedAttemptsKey = `auth:failed:${email}`
    const failedAttempts = await cacheManager.get<number>(failedAttemptsKey) || 0
    
    if (failedAttempts >= 5) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'TOO_MANY_ATTEMPTS',
          message: 'Too many failed login attempts. Please try again later.'
        }
      })
    }
    
    // Check cache for user data first
    const userCacheKey = `auth:user:${email.toLowerCase()}`
    let user = await cacheManager.get<any>(userCacheKey)
    
    if (!user) {
      // Cache miss - fetch from database
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          email: true,
          password: true,
          role: true,
          plan: true,
          isActive: true,
          emailVerified: true,
          lastLoginAt: true
        }
      })
      
      if (user) {
        // Cache user data for 5 minutes (excluding password for security)
        const userToCache = { ...user }
        delete userToCache.password
        
        await cacheManager.set(userCacheKey, userToCache, {
          ttl: 300, // 5 minutes
          priority: 'high',
          tags: ['user', 'auth']
        })
      }
    }
    
    // If user was cached, we need to fetch password separately
    let hashedPassword = user?.password
    if (!hashedPassword && user) {
      const userWithPassword = await prisma.user.findUnique({
        where: { id: user.id },
        select: { password: true }
      })
      hashedPassword = userWithPassword?.password
    }
    
    // Validate user and password
    if (!user || !hashedPassword || !user.isActive) {
      await this.recordFailedAttempt(email)
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      })
    }
    
    const passwordValid = await bcrypt.compare(password, hashedPassword)
    if (!passwordValid) {
      await this.recordFailedAttempt(email)
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      })
    }
    
    // Clear failed attempts on successful login
    await cacheManager.del(failedAttemptsKey)
    
    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan
    }
    
    const accessToken = jwt.sign(tokenPayload, config.auth.jwtSecret, {
      expiresIn: '1h'
    })
    
    const refreshToken = jwt.sign(
      { userId: user.id },
      config.auth.refreshSecret,
      { expiresIn: '7d' }
    )
    
    // Update last login timestamp (fire and forget)
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    }).catch(console.error)
    
    // Invalidate user cache to reflect new lastLoginAt
    cacheManager.del(userCacheKey).catch(console.error)
    
    const processingTime = Date.now() - startTime
    
    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          plan: user.plan,
          emailVerified: user.emailVerified
        },
        accessToken,
        refreshToken
      },
      meta: {
        processingTime,
        serverless: true,
        cached: !!user
      }
    })
    
  } catch (error) {
    console.error('Login error:', error)
    
    // Fallback to original controller
    const authController = await import('../../apps/api/src/controllers/auth.controller')
    return authController.default.login(req, res)
  }
}

// Helper methods
const recordFailedAttempt = async (email: string): Promise<void> => {
  const failedAttemptsKey = `auth:failed:${email}`
  const current = await cacheManager.get<number>(failedAttemptsKey) || 0
  
  await cacheManager.set(failedAttemptsKey, current + 1, {
    ttl: 900, // 15 minutes
    priority: 'high',
    tags: ['auth', 'security']
  })
}

loginHandler.recordFailedAttempt = recordFailedAttempt

const handler = createVercelHandler(
  loginHandler,
  [
    createAuthRateLimitMiddleware(),
    validateRequestMiddleware(loginSchema),
  ]
)

export default handler