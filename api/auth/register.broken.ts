import type { VercelRequest, VercelResponse } from '@vercel/node'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from '../_shared/database'
import { config } from '../_shared/config'
import { registerSchema } from '../_shared/types'

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    // Validate input
    const validation = registerSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: validation.error.flatten()
        }
      })
    }

    const { name, email, password } = validation.data as RegisterInput

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