// @ts-nocheck
import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from '@truecheckia/database'
import { config, ERROR_CODES } from '@truecheckia/config'
import { AppError } from '../middleware/error.middleware'
import { emailService } from '../services/email.service'
import { QueueAdapter } from '../lib/queue-adapter'
import type { ApiResponse, LoginInput, RegisterInput, JWTPayload } from '@truecheckia/types'
import { authenticate } from '../middleware/auth.middleware'
import { generateTokens } from '../lib/jwt.utils'

class AuthController {
  async register(req: Request<{}, {}, RegisterInput>, res: Response<ApiResponse>) {
    const { name, email, password } = req.body

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new AppError('This email is already registered. Please try logging in instead.', 409, ERROR_CODES.EMAIL_EXISTS)
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, config.auth.bcryptRounds)

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex')
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        credits: config.limits.freeCredits,
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
      },
    })

    // Send verification email asynchronously
    await QueueAdapter.sendEmail({
      to: email,
      subject: '🔐 Confirm your email - TrueCheckIA',
      html: await emailService.getVerificationEmailHtml(email, emailVerificationToken),
      type: config.resend.apiKey ? 'resend' : 'smtp',
    })

    // Generate tokens for immediate login (soft verification)
    const { accessToken, refreshToken } = generateTokens(user)

    res.status(201).json({
      success: true,
      message: 'Account created successfully. You can start using TrueCheckIA immediately!',
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

  async verifyEmail(req: Request<{}, {}, { token: string }>, res: Response<ApiResponse>) {
    const { token } = req.body

    if (!token) {
      throw new AppError('Verification token is required', 400, ERROR_CODES.VALIDATION_ERROR)
    }

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date(),
        },
      },
    })

    if (!user) {
      throw new AppError('Invalid or expired verification token', 400, ERROR_CODES.VALIDATION_ERROR)
    }

    // Update user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    })

    // Send welcome email
    await emailService.sendWelcomeEmail(user.email, user.name || undefined)

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user)

    res.json({
      success: true,
      message: 'Email verified successfully',
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
      throw new AppError('No account found with this email address.', 401, ERROR_CODES.INVALID_CREDENTIALS)
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      throw new AppError('Incorrect password. Please check your password and try again.', 401, ERROR_CODES.INVALID_CREDENTIALS)
    }

    // Generate tokens (email verification no longer required)
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
          role: user.role,
          emailVerified: user.emailVerified,
        },
        accessToken,
        refreshToken,
      },
    })
  }

  async forgotPassword(req: Request<{}, {}, { email: string }>, res: Response<ApiResponse>) {
    const { email } = req.body

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Don't reveal if email exists for security
      res.json({
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions.',
      })
      return
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Save token to user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetTokenExpires,
      },
    })

    // Send reset email
    await emailService.sendPasswordResetEmail(email, resetToken)

    res.json({
      success: true,
      message: 'If an account exists with this email, you will receive password reset instructions.',
    })
  }

  async resetPassword(req: Request<{}, {}, { token: string; password: string }>, res: Response<ApiResponse>) {
    const { token, password } = req.body

    if (!token || !password) {
      throw new AppError('Token and password are required', 400, ERROR_CODES.VALIDATION_ERROR)
    }

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    })

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400, ERROR_CODES.VALIDATION_ERROR)
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, config.auth.bcryptRounds)

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    })

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
    })
  }

  async resendVerification(req: Request<{}, {}, { email: string }>, res: Response<ApiResponse>) {
    const { email } = req.body

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        emailVerified: true,
        emailVerificationToken: true,
      },
    })

    if (!user) {
      // Don't reveal if email exists
      res.json({
        success: true,
        message: 'If an unverified account exists with this email, a verification link will be sent.',
      })
      return
    }

    if (user.emailVerified) {
      throw new AppError('Email is already verified', 400, ERROR_CODES.VALIDATION_ERROR)
    }

    // Generate new token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex')
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Update token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken,
        emailVerificationExpires,
      },
    })

    // Send verification email
    await emailService.sendVerificationEmail(email, emailVerificationToken)

    res.json({
      success: true,
      message: 'If an unverified account exists with this email, a verification link will be sent.',
    })
  }

  // New method for authenticated users to resend verification
  async resendVerificationAuth(req: Request, res: Response<ApiResponse>) {
    const userId = req.userId!

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
      },
    })

    if (!user) {
      throw new AppError('User not found', 404, ERROR_CODES.NOT_FOUND)
    }

    if (user.emailVerified) {
      throw new AppError('Email is already verified', 400, ERROR_CODES.VALIDATION_ERROR)
    }

    // Generate new token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex')
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Update token
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken,
        emailVerificationExpires,
      },
    })

    // Send verification email
    await QueueAdapter.sendEmail({
      to: user.email,
      subject: '🔐 Confirm your email - TrueCheckIA',
      html: await emailService.getVerificationEmailHtml(user.email, emailVerificationToken),
      type: config.resend.apiKey ? 'resend' : 'smtp',
    })

    res.json({
      success: true,
      message: 'Verification email sent successfully.',
    })
  }

  async refreshToken(req: Request<{}, {}, { refreshToken: string }>, res: Response<ApiResponse>) {
    const { refreshToken } = req.body

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400, ERROR_CODES.VALIDATION_ERROR)
    }

    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, config.auth.refreshSecret) as JWTPayload

      // Find user
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          role: true,
          plan: true,
        },
      })

      if (!user) {
        throw new AppError('User not found', 404, ERROR_CODES.NOT_FOUND)
      }

      // Generate new tokens
      const tokens = generateTokens(user)

      res.json({
        success: true,
        data: tokens,
      })
    } catch (error) {
      throw new AppError('Invalid refresh token', 401, ERROR_CODES.TOKEN_EXPIRED)
    }
  }

  async logout(req: Request, res: Response<ApiResponse>) {
    // In a production app, you might want to invalidate the refresh token here
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Logged out successfully',
    })
  }

  async changePassword(req: Request<{}, {}, { currentPassword: string; newPassword: string }>, res: Response<ApiResponse>) {
    const userId = req.userId!
    const { currentPassword, newPassword } = req.body

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    })

    if (!user) {
      throw new AppError('User not found', 404, ERROR_CODES.NOT_FOUND)
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password)

    if (!isValidPassword) {
      throw new AppError('Current password is incorrect', 400, ERROR_CODES.INVALID_CREDENTIALS)
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, config.auth.bcryptRounds)

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    })

    res.json({
      success: true,
      message: 'Password changed successfully',
    })
  }

  async logoutAll(req: Request, res: Response<ApiResponse>) {
    // In a production app with token blacklisting, you would:
    // 1. Add all user's refresh tokens to a blacklist
    // 2. Invalidate all active sessions
    // For now, we'll just return success as the frontend will handle token removal
    res.json({
      success: true,
      message: 'Logged out from all devices successfully',
    })
  }

  // Google OAuth methods
  async googleAuth(req: Request, res: Response) {
    // This will be handled by Passport middleware
    // Just a placeholder for documentation
  }

  async googleCallback(req: Request, res: Response) {
    try {
      const user = req.user as any

      if (!user) {
        // Authentication failed
        const errorUrl = `${config.frontend.url}/auth/callback?error=auth_failed`
        return res.redirect(errorUrl)
      }

      // Generate JWT tokens
      const { accessToken, refreshToken } = generateTokens(user)

      // Redirect to frontend with tokens in URL
      const successUrl = `${config.frontend.url}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`
      res.redirect(successUrl)
    } catch (error) {
      console.error('Google callback error:', error)
      const errorUrl = `${config.frontend.url}/auth/callback?error=internal_error`
      res.redirect(errorUrl)
    }
  }
}


// Add helper to email service
Object.assign(emailService, {
  async getVerificationEmailHtml(email: string, token: string): Promise<string> {
    const verificationUrl = `${config.frontendUrl}/verify-email?token=${token}`
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🤖 TrueCheckIA</h1>
              <p>Confirm your email</p>
            </div>
            <div class="content">
              <h2>Welcome to TrueCheckIA!</h2>
              <p>Thank you for signing up for our AI content detection platform.</p>
              <p>To activate your account, click the button below:</p>
              <center>
                <a href="${verificationUrl}" class="button">Confirm Email</a>
              </center>
              <p>Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 5px;">
                ${verificationUrl}
              </p>
              <p><small>This link expires in 24 hours.</small></p>
            </div>
            <div class="footer">
              <p>© 2025 TrueCheckIA. All rights reserved.</p>
              <p>This email was sent to ${email}</p>
            </div>
          </div>
        </body>
      </html>
    `
  }
})

export default new AuthController()