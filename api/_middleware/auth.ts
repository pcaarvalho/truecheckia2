import type { VercelRequest, VercelResponse } from '@vercel/node'
import jwt from 'jsonwebtoken'
import { config, ERROR_CODES } from '@truecheckia/config'
import { prisma } from '@truecheckia/database'
import { AppError, ExtendedVercelRequest } from '../_utils/vercel-adapter'
import type { JWTPayload } from '@truecheckia/types'
import { cacheManager, cacheKey } from '../_utils/cache-manager'

export async function authenticateMiddleware(
  req: ExtendedVercelRequest,
  res: VercelResponse,
  next: () => void
) {
  try {
    const token = extractToken(req)
    
    if (!token) {
      throw new AppError('No token provided', 401, ERROR_CODES.UNAUTHORIZED)
    }
    
    const decoded = jwt.verify(token, config.auth.jwtSecret) as JWTPayload
    
    // Check cache first for user data
    const userCacheKey = cacheKey.userProfile(decoded.userId)
    const cachedUser = await cacheManager.get<any>(userCacheKey)
    
    let user = cachedUser
    if (!user) {
      // Cache miss - fetch from database
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, role: true, plan: true, isActive: true },
      })
      
      if (user) {
        // Cache user data for 5 minutes
        await cacheManager.set(userCacheKey, user, {
          ttl: 300,
          priority: 'high',
          tags: ['user', 'auth']
        })
      }
    }
    
    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401, ERROR_CODES.UNAUTHORIZED)
    }
    
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
    }
    req.userId = user.id
    
    next()
  } catch (error) {
    throw error
  }
}

export async function optionalAuthMiddleware(
  req: ExtendedVercelRequest,
  res: VercelResponse,
  next: () => void
) {
  try {
    const token = extractToken(req)
    
    if (token) {
      try {
        const decoded = jwt.verify(token, config.auth.jwtSecret) as JWTPayload
        
        // Use cached user data
        const userCacheKey = cacheKey.userProfile(decoded.userId)
        let user = await cacheManager.get<any>(userCacheKey)
        
        if (!user) {
          user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, role: true, plan: true, isActive: true },
          })
          
          if (user) {
            await cacheManager.set(userCacheKey, user, {
              ttl: 300,
              priority: 'high',
              tags: ['user', 'auth']
            })
          }
        }
        
        if (user && user.isActive) {
          req.user = {
            userId: user.id,
            email: user.email,
            role: user.role,
            plan: user.plan,
          }
          req.userId = user.id
        }
      } catch (error) {
        // Ignore token errors for optional auth
      }
    }
    
    next()
  } catch (error) {
    // Ignore token errors for optional auth
    next()
  }
}

export function requirePlanMiddleware(plans: string[]) {
  return async (req: ExtendedVercelRequest, res: VercelResponse, next: () => void) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, ERROR_CODES.UNAUTHORIZED)
    }
    
    // Check cached subscription status for real-time plan validation
    const subCacheKey = cacheKey.subscription(req.user.userId)
    const subscription = await cacheManager.get<any>(subCacheKey)
    
    let currentPlan = req.user.plan
    if (subscription && subscription.status === 'active') {
      currentPlan = subscription.plan
    }
    
    if (!plans.includes(currentPlan)) {
      throw new AppError(
        'Insufficient plan',
        403,
        ERROR_CODES.PLAN_REQUIRED,
        { 
          requiredPlans: plans,
          currentPlan,
          upgrade: {
            url: '/subscription/checkout',
            message: 'Upgrade your plan to access this feature'
          }
        }
      )
    }
    
    next()
  }
}

export function requireRoleMiddleware(roles: string[]) {
  return (req: ExtendedVercelRequest, res: VercelResponse, next: () => void) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, ERROR_CODES.UNAUTHORIZED)
    }
    
    if (!roles.includes(req.user.role)) {
      throw new AppError(
        'Insufficient permissions',
        403,
        ERROR_CODES.UNAUTHORIZED,
        { requiredRoles: roles }
      )
    }
    
    next()
  }
}

function extractToken(req: VercelRequest): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  // Check x-api-key header for API access
  const apiKey = req.headers['x-api-key'] as string
  if (apiKey) {
    return apiKey
  }
  
  return null
}

/**
 * API Key authentication middleware with caching
 */
export async function apiKeyAuthMiddleware(
  req: ExtendedVercelRequest,
  res: VercelResponse,
  next: () => void
) {
  try {
    const apiKey = req.headers['x-api-key'] as string
    
    if (!apiKey) {
      throw new AppError('API key required', 401, ERROR_CODES.UNAUTHORIZED)
    }
    
    // Check cache for API key
    const apiKeyCacheKey = cacheKey.apiKey(apiKey)
    let keyData = await cacheManager.get<any>(apiKeyCacheKey)
    
    if (!keyData) {
      // Cache miss - validate API key
      keyData = await prisma.apiKey.findUnique({
        where: { key: apiKey, isActive: true },
        include: {
          user: {
            select: { id: true, email: true, role: true, plan: true, isActive: true }
          }
        }
      })
      
      if (keyData) {
        // Cache API key data for 10 minutes
        await cacheManager.set(apiKeyCacheKey, keyData, {
          ttl: 600,
          priority: 'high',
          tags: ['api-key', 'auth']
        })
      }
    }
    
    if (!keyData || !keyData.user?.isActive) {
      throw new AppError('Invalid or inactive API key', 401, ERROR_CODES.UNAUTHORIZED)
    }
    
    // Update last used timestamp (fire and forget)
    prisma.apiKey.update({
      where: { id: keyData.id },
      data: { lastUsedAt: new Date() }
    }).catch(console.error)
    
    req.user = {
      userId: keyData.user.id,
      email: keyData.user.email,
      role: keyData.user.role,
      plan: keyData.user.plan,
    }
    req.userId = keyData.user.id
    
    next()
  } catch (error) {
    throw error
  }
}