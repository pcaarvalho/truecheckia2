import type { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { z } from 'zod'

// Initialize Prisma client directly
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
})

// Simple validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  password: z.string().min(1, 'Password is required')
})

interface LoginInput {
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
    const validation = loginSchema.safeParse(req.body)
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

    const { email, password } = validation.data as LoginInput

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

    const accessToken = jwt.sign(tokenPayload, jwtSecret, {
      expiresIn: '1h'
    })

    const refreshToken = jwt.sign(
      { userId: user.id },
      refreshSecret,
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
  } finally {
    await prisma.$disconnect()
  }
}