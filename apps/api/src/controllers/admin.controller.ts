// @ts-nocheck
import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '@truecheckia/database'
import { config, ERROR_CODES } from '@truecheckia/config'
import { AppError } from '../middleware/error.middleware'
import type { ApiResponse } from '@truecheckia/types'

class AdminController {
  async createDevUser(req: Request, res: Response<ApiResponse>) {
    // Only allow in development environment
    if (!config.isDev) {
      throw new AppError('This endpoint is only available in development', 403, ERROR_CODES.UNAUTHORIZED)
    }

    const {
      email = 'dev@truecheckia.com',
      password = 'dev123',
      name = 'Development User',
      plan = 'ENTERPRISE',
      role = 'ADMIN',
      credits = 999999,
    } = req.body

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        // Hash password if provided
        const hashedPassword = password ? await bcrypt.hash(password, config.auth.bcryptRounds) : undefined
        
        // Update existing user with dev privileges
        const updatedUser = await prisma.user.update({
          where: { email },
          data: {
            name,
            plan,
            role,
            credits,
            emailVerified: true,
            creditsResetAt: new Date(),
            // Reset verification tokens
            emailVerificationToken: null,
            emailVerificationExpires: null,
            passwordResetToken: null,
            passwordResetExpires: null,
            ...(hashedPassword && { password: hashedPassword }),
          },
          select: {
            id: true,
            email: true,
            name: true,
            plan: true,
            role: true,
            credits: true,
            emailVerified: true,
            apiKey: true,
            createdAt: true,
          },
        })

        res.json({
          success: true,
          message: 'Development user updated successfully',
          data: {
            user: updatedUser,
            credentials: {
              email,
              password: password ? 'Updated successfully' : 'Password unchanged',
            },
            features: [
              'Unlimited AI content analysis',
              'API access and key generation',
              'All premium features',
              'Admin privileges',
              'No rate limiting restrictions',
            ],
          },
        })
      } else {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, config.auth.bcryptRounds)

        // Create new dev user
        const newUser = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
            plan,
            role,
            credits,
            emailVerified: true,
            creditsResetAt: new Date(),
          },
          select: {
            id: true,
            email: true,
            name: true,
            plan: true,
            role: true,
            credits: true,
            emailVerified: true,
            apiKey: true,
            createdAt: true,
          },
        })

        res.status(201).json({
          success: true,
          message: 'Development user created successfully',
          data: {
            user: newUser,
            credentials: {
              email,
              password,
            },
            features: [
              'Unlimited AI content analysis',
              'API access and key generation',
              'All premium features',
              'Admin privileges',
              'No rate limiting restrictions',
            ],
          },
        })
      }
    } catch (error) {
      console.error('Error creating dev user:', error)
      throw new AppError('Failed to create development user', 500, ERROR_CODES.INTERNAL_ERROR)
    }
  }

  async getDatabaseStats(req: Request, res: Response<ApiResponse>) {
    // Only allow in development environment
    if (!config.isDev) {
      throw new AppError('This endpoint is only available in development', 403, ERROR_CODES.UNAUTHORIZED)
    }

    try {
      const stats = {
        users: {
          total: await prisma.user.count(),
          byPlan: await prisma.user.groupBy({
            by: ['plan'],
            _count: {
              id: true,
            },
          }),
          byRole: await prisma.user.groupBy({
            by: ['role'],
            _count: {
              id: true,
            },
          }),
          verified: await prisma.user.count({
            where: { emailVerified: true },
          }),
        },
        analyses: {
          total: await prisma.analysis.count(),
          byLanguage: await prisma.analysis.groupBy({
            by: ['language'],
            _count: {
              id: true,
            },
          }),
          aiGenerated: await prisma.analysis.count({
            where: { isAiGenerated: true },
          }),
          humanGenerated: await prisma.analysis.count({
            where: { isAiGenerated: false },
          }),
        },
        subscriptions: {
          total: await prisma.subscription.count(),
          byStatus: await prisma.subscription.groupBy({
            by: ['status'],
            _count: {
              id: true,
            },
          }),
        },
      }

      res.json({
        success: true,
        data: stats,
      })
    } catch (error) {
      console.error('Error fetching database stats:', error)
      throw new AppError('Failed to fetch database statistics', 500, ERROR_CODES.INTERNAL_ERROR)
    }
  }

  async seedSampleData(req: Request, res: Response<ApiResponse>) {
    // Only allow in development environment
    if (!config.isDev) {
      throw new AppError('This endpoint is only available in development', 403, ERROR_CODES.UNAUTHORIZED)
    }

    try {
      // Find the dev user
      const devUser = await prisma.user.findUnique({
        where: { email: 'dev@truecheckia.com' },
      })

      if (!devUser) {
        throw new AppError('Development user not found. Create it first using /create-dev-user', 404, ERROR_CODES.NOT_FOUND)
      }

      // Check if analyses already exist
      const existingAnalyses = await prisma.analysis.count({
        where: { userId: devUser.id },
      })

      if (existingAnalyses > 0) {
        res.json({
          success: true,
          message: `Development user already has ${existingAnalyses} analyses`,
          data: { existingAnalyses },
        })
        return
      }

      // Create sample analyses
      const sampleAnalyses = [
        {
          text: 'This is a text written by a human with natural writing characteristics. It has style variations, some occasional grammatical errors, and an organic flow of thought that reflects how people actually write.',
          wordCount: 36,
          charCount: 237,
          language: 'pt',
          aiScore: 15.5,
          confidence: 'HIGH' as const,
          isAiGenerated: false,
          indicators: [
            'Natural style variation',
            'Organic structure',
            'Typical human imperfections'
          ],
          explanation: 'The text presents clear characteristics of human writing, including natural stylistic variations and an organic thought structure.',
          suspiciousParts: [],
          modelUsed: 'gpt-4',
          processingTime: 1250,
        },
        {
          text: 'Artificial intelligence represents an unprecedented technological revolution in the history of humanity. Its advanced algorithms process data with extraordinary efficiency, radically transforming various contemporary economic and social sectors.',
          wordCount: 32,
          charCount: 285,
          language: 'pt',
          aiScore: 92.3,
          confidence: 'HIGH' as const,
          isAiGenerated: true,
          indicators: [
            'Excessive technical vocabulary',
            'Very uniform structure',
            'Artificial formal language'
          ],
          explanation: 'The text demonstrates typical patterns of artificial generation, with excessive technical vocabulary and structure too uniform to be natural human writing.',
          suspiciousParts: [
            { text: 'unprecedented technological revolution', score: 85 },
            { text: 'advanced algorithms process data', score: 90 },
            { text: 'extraordinary efficiency', score: 80 }
          ],
          modelUsed: 'gpt-4',
          processingTime: 1850,
        },
        {
          text: 'Yesterday I went to the market and bought some fruit. The apple was expensive, but the bananas were on sale. I ended up taking a little of everything because I couldn\'t decide.',
          wordCount: 31,
          charCount: 181,
          language: 'pt',
          aiScore: 25.8,
          confidence: 'MEDIUM' as const,
          isAiGenerated: false,
          indicators: [
            'Personal narrative',
            'Informal language',
            'Everyday details'
          ],
          explanation: 'Text with characteristics of personal narrative and informal language, typical of everyday human writing.',
          suspiciousParts: [],
          modelUsed: 'gpt-3.5-turbo',
          processingTime: 980,
        }
      ]

      const createdAnalyses = []
      for (const analysis of sampleAnalyses) {
        const created = await prisma.analysis.create({
          data: {
            userId: devUser.id,
            ...analysis,
          },
        })
        createdAnalyses.push(created)
      }

      res.json({
        success: true,
        message: `Created ${createdAnalyses.length} sample analyses for development user`,
        data: {
          user: {
            id: devUser.id,
            email: devUser.email,
            name: devUser.name,
          },
          analyses: createdAnalyses.length,
        },
      })
    } catch (error) {
      console.error('Error seeding sample data:', error)
      throw new AppError('Failed to seed sample data', 500, ERROR_CODES.INTERNAL_ERROR)
    }
  }
}

export const adminController = new AdminController()