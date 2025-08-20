import type { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import * as crypto from 'crypto'
import { z } from 'zod'

// Initialize Prisma client directly
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
})

// Simple validation schema
const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase, one uppercase, and one number')
})

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
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    // Get secrets from environment
    const jwtSecret = process.env.JWT_SECRET
    const refreshSecret = process.env.JWT_REFRESH_SECRET
    
    if (!jwtSecret || !refreshSecret) {
      console.error('Missing JWT secrets')
      return res.status(500).json({
        success: false,
        error: {
          code: 'CONFIG_ERROR',
          message: 'Server configuration error'
        }
      })
    }

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

    // Create user with free plan and credits
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        plan: 'FREE',
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

    const accessToken = jwt.sign(tokenPayload, jwtSecret, {
      expiresIn: '1h'
    })

    const refreshToken = jwt.sign(
      { userId: user.id },
      refreshSecret,
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
  } finally {
    await prisma.$disconnect()
  }
}