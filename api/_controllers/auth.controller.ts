import type { VercelRequest, VercelResponse } from '@vercel/node'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from '../_shared/database'
import { config } from '../_shared/config'

interface LoginInput {
  email: string
  password: string
}

interface RegisterInput {
  name: string
  email: string
  password: string
}

interface JWTPayload {
  userId: string
  email: string
  role: string
  plan: string
}

export class AuthController {
  static async register(req: VercelRequest, res: VercelResponse) {
    try {
      const { name, email, password } = req.body as RegisterInput

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      })

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'This email is already registered. Please try logging in instead.'
          }
        })
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12)

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex')
      const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      // Create user
      const user = await prisma.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          credits: 10, // Free credits
          creditsResetAt: new Date(),
          emailVerified: false,
          emailVerificationToken,
          emailVerificationExpires,
        },
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          credits: true,
          emailVerified: true,
          createdAt: true,
        },
      })

      // Generate tokens
      const tokenPayload: JWTPayload = {
        userId: user.id,
        email: user.email,
        role: 'USER',
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

      return res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            plan: user.plan,
            credits: user.credits,
            emailVerified: user.emailVerified
          },
          accessToken,
          refreshToken
        },
        message: 'Account created successfully'
      })

    } catch (error) {
      console.error('Register error:', error)
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create account'
        }
      })
    }
  }

  static async login(req: VercelRequest, res: VercelResponse) {
    try {
      const { email, password } = req.body as LoginInput

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          email: true,
          name: true,
          password: true,
          role: true,
          plan: true,
          credits: true,
          emailVerified: true,
        }
      })

      if (!user || !user.password) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        })
      }

      // Validate password
      const passwordValid = await bcrypt.compare(password, user.password)
      if (!passwordValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        })
      }

      // Generate tokens
      const tokenPayload: JWTPayload = {
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

      // Update last login (fire and forget)
      prisma.user.update({
        where: { id: user.id },
        data: { updatedAt: new Date() }
      }).catch(console.error)

      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            plan: user.plan,
            credits: user.credits,
            emailVerified: user.emailVerified
          },
          accessToken,
          refreshToken
        }
      })

    } catch (error) {
      console.error('Login error:', error)
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Login failed'
        }
      })
    }
  }

  static async logout(req: VercelRequest, res: VercelResponse) {
    try {
      // In a stateless JWT system, logout is primarily client-side
      // But we can blacklist the token if needed (future enhancement)
      
      return res.json({
        success: true,
        message: 'Logged out successfully'
      })

    } catch (error) {
      console.error('Logout error:', error)
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Logout failed'
        }
      })
    }
  }

  static async refresh(req: VercelRequest, res: VercelResponse) {
    try {
      const { refreshToken } = req.body

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Refresh token is required'
          }
        })
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.auth.refreshSecret) as { userId: string }

      // Get fresh user data
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          plan: true,
          credits: true,
          emailVerified: true,
        }
      })

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        })
      }

      // Generate new access token
      const tokenPayload: JWTPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        plan: user.plan
      }

      const accessToken = jwt.sign(tokenPayload, config.auth.jwtSecret, {
        expiresIn: '1h'
      })

      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            plan: user.plan,
            credits: user.credits,
            emailVerified: user.emailVerified
          },
          accessToken
        }
      })

    } catch (error) {
      console.error('Refresh error:', error)
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'REFRESH_TOKEN_EXPIRED',
            message: 'Refresh token has expired'
          }
        })
      }

      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid refresh token'
        }
      })
    }
  }
}

export default AuthController