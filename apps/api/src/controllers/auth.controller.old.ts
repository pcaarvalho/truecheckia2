import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@truecheckia/database'
import { config, ERROR_CODES } from '@truecheckia/config'
import { AppError } from '../middleware/error.middleware'
import type { ApiResponse, LoginInput, RegisterInput, JWTPayload } from '@truecheckia/types'

class AuthController {
  async register(req: Request<{}, {}, RegisterInput>, res: Response<ApiResponse>) {
    const { name, email, password } = req.body

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new AppError('Email already registered', 409, ERROR_CODES.EMAIL_EXISTS)
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, config.auth.bcryptRounds)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        credits: config.limits.freeCredits,
        creditsResetAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        credits: true,
      },
    })

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user)

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          credits: user.credits,
        },
        accessToken,
        refreshToken,
      },
    })
  }

  async login(req: Request<{}, {}, LoginInput>, res: Response<ApiResponse>) {
    const { email, password } = req.body

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        plan: true,
        role: true,
        credits: true,
        emailVerified: true,
      },
    })

    if (!user) {
      throw new AppError('Invalid credentials', 401, ERROR_CODES.INVALID_CREDENTIALS)
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401, ERROR_CODES.INVALID_CREDENTIALS)
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user)

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          credits: user.credits,
          emailVerified: user.emailVerified,
        },
        accessToken,
        refreshToken,
      },
    })
  }

  async refreshToken(req: Request, res: Response<ApiResponse>) {
    const { refreshToken } = req.body

    if (!refreshToken) {
      throw new AppError('Refresh token required', 400, ERROR_CODES.UNAUTHORIZED)
    }

    try {
      const decoded = jwt.verify(
        refreshToken,
        config.auth.refreshSecret
      ) as JWTPayload

      // Get fresh user data
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          plan: true,
        },
      })

      if (!user) {
        throw new AppError('User not found', 401, ERROR_CODES.UNAUTHORIZED)
      }

      // Generate new access token
      const accessToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          plan: user.plan,
        },
        config.auth.jwtSecret,
        { expiresIn: config.auth.jwtExpiresIn }
      )

      res.json({
        success: true,
        data: {
          accessToken,
        },
      })
    } catch (error) {
      throw new AppError('Invalid refresh token', 401, ERROR_CODES.TOKEN_EXPIRED)
    }
  }

  async logout(req: Request, res: Response<ApiResponse>) {
    // In a production app, you might want to blacklist the token here
    // For now, we'll just return success
    res.json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    })
  }
}

function generateTokens(user: any) {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role || 'USER',
    plan: user.plan,
  }

  const accessToken = jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn,
  })

  const refreshToken = jwt.sign(payload, config.auth.refreshSecret, {
    expiresIn: config.auth.refreshExpiresIn,
  })

  return { accessToken, refreshToken }
}

export const authController = new AuthController()