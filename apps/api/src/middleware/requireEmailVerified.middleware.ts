import { Request, Response, NextFunction } from 'express'
import { config, ERROR_CODES } from '@truecheckia/config'
import { prisma } from '@truecheckia/database'
import { AppError } from './error.middleware'

/**
 * Middleware to require email verification for sensitive operations
 * This should be used after the authenticate middleware
 */
export const requireEmailVerified = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) {
      throw new AppError('Unauthorized', 401, ERROR_CODES.UNAUTHORIZED)
    }

    // Fetch user's email verification status
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { 
        id: true,
        email: true,
        emailVerified: true,
      },
    })

    if (!user) {
      throw new AppError('User not found', 404, ERROR_CODES.NOT_FOUND)
    }

    if (!user.emailVerified) {
      throw new AppError(
        'Email verification required. Please verify your email to access this feature.',
        403,
        ERROR_CODES.EMAIL_NOT_VERIFIED,
        {
          email: user.email,
          requiresVerification: true,
        }
      )
    }

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Optional version that adds a warning header but doesn't block the request
 */
export const warnEmailNotVerified = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.userId) {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { emailVerified: true },
      })

      if (user && !user.emailVerified) {
        res.setHeader('X-Email-Verification-Warning', 'true')
      }
    }

    next()
  } catch (error) {
    // Don't fail the request on warning check errors
    next()
  }
}