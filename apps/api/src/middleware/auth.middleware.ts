import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config, ERROR_CODES } from '@truecheckia/config'
import { prisma } from '@truecheckia/database'
import { AppError } from './error.middleware'
import type { JWTPayload } from '@truecheckia/types'

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload
      userId?: string
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req)
    
    if (!token) {
      throw new AppError('No token provided', 401, ERROR_CODES.UNAUTHORIZED)
    }
    
    const decoded = jwt.verify(token, config.auth.jwtSecret) as JWTPayload
    
    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, plan: true },
    })
    
    if (!user) {
      throw new AppError('User not found', 401, ERROR_CODES.UNAUTHORIZED)
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
    next(error)
  }
}

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req)
    
    if (token) {
      const decoded = jwt.verify(token, config.auth.jwtSecret) as JWTPayload
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, role: true, plan: true },
      })
      
      if (user) {
        req.user = {
          userId: user.id,
          email: user.email,
          role: user.role,
          plan: user.plan,
        }
        req.userId = user.id
      }
    }
    
    next()
  } catch (error) {
    // Ignore token errors for optional auth
    next()
  }
}

export const requirePlan = (plans: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401, ERROR_CODES.UNAUTHORIZED))
    }
    
    if (!plans.includes(req.user.plan)) {
      return next(
        new AppError(
          'Insufficient plan',
          403,
          ERROR_CODES.UNAUTHORIZED,
          { requiredPlans: plans }
        )
      )
    }
    
    next()
  }
}

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401, ERROR_CODES.UNAUTHORIZED))
    }
    
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          'Insufficient permissions',
          403,
          ERROR_CODES.UNAUTHORIZED,
          { requiredRoles: roles }
        )
      )
    }
    
    next()
  }
}

function extractToken(req: Request): string | null {
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