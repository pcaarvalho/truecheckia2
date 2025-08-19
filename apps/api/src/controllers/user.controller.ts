// @ts-nocheck
import { Request, Response } from 'express'
import { prisma } from '@truecheckia/database'
import { config, ERROR_CODES } from '@truecheckia/config'
import { AppError } from '../middleware/error.middleware'
import { randomBytes } from 'crypto'
import type { ApiResponse, UpdateProfileInput } from '@truecheckia/types'

class UserController {
  async getProfile(req: Request, res: Response<ApiResponse>) {
    const userId = req.userId!

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        plan: true,
        credits: true,
        apiKey: true,
        createdAt: true,
        _count: {
          select: {
            analyses: true,
          },
        },
      },
    })

    if (!user) {
      throw new AppError('User not found', 404, ERROR_CODES.NOT_FOUND)
    }

    res.json({
      success: true,
      data: {
        ...user,
        totalAnalyses: user._count.analyses,
      },
    })
  }

  async updateProfile(req: Request<{}, {}, UpdateProfileInput>, res: Response<ApiResponse>) {
    const userId = req.userId!
    const { name, avatar } = req.body

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(avatar && { avatar }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        plan: true,
      },
    })

    res.json({
      success: true,
      data: user,
    })
  }

  async getCredits(req: Request, res: Response<ApiResponse>) {
    const userId = req.userId!

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        credits: true,
        plan: true,
        creditsResetAt: true,
      },
    })

    if (!user) {
      throw new AppError('User not found', 404, ERROR_CODES.NOT_FOUND)
    }

    // Calculate days until reset for free users
    let daysUntilReset = null
    if (user.plan === 'FREE') {
      const resetDate = new Date(user.creditsResetAt)
      resetDate.setDate(resetDate.getDate() + 30)
      const now = new Date()
      daysUntilReset = Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }

    res.json({
      success: true,
      data: {
        credits: user.credits,
        unlimited: user.plan !== 'FREE',
        daysUntilReset,
      },
    })
  }

  async generateApiKey(req: Request, res: Response<ApiResponse>) {
    const userId = req.userId!

    // Check if user has PRO or ENTERPRISE plan
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    })

    if (!user || user.plan === 'FREE') {
      throw new AppError(
        'API access requires PRO or ENTERPRISE plan',
        403,
        ERROR_CODES.UNAUTHORIZED
      )
    }

    // Generate new API key
    const apiKey = `tcia_${randomBytes(32).toString('hex')}`

    await prisma.user.update({
      where: { id: userId },
      data: { apiKey },
    })

    res.json({
      success: true,
      data: {
        apiKey,
        message: 'Store this key securely. It will not be shown again.',
      },
    })
  }

  async revokeApiKey(req: Request, res: Response<ApiResponse>) {
    const userId = req.userId!

    await prisma.user.update({
      where: { id: userId },
      data: { apiKey: null },
    })

    res.json({
      success: true,
      data: {
        message: 'API key revoked successfully',
      },
    })
  }

  async getStats(req: Request, res: Response<ApiResponse>) {
    const userId = req.userId!

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        credits: true,
        createdAt: true,
        emailVerified: true,
        _count: {
          select: {
            analyses: true,
          },
        },
      },
    })

    if (!user) {
      throw new AppError('User not found', 404, ERROR_CODES.NOT_FOUND)
    }

    // Get analysis stats for the current month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const monthlyAnalyses = await prisma.analysis.count({
      where: {
        userId,
        createdAt: {
          gte: startOfMonth,
        },
      },
    })

    // Calculate credits used this month (for free plan)
    const creditsUsedThisMonth = user.plan === 'FREE' ? monthlyAnalyses : 0
    
    // Calculate days until reset for free users
    let daysUntilReset = null
    if (user.plan === 'FREE') {
      const resetDate = new Date(user.creditsResetAt || startOfMonth)
      resetDate.setMonth(resetDate.getMonth() + 1)
      const now = new Date()
      daysUntilReset = Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }

    res.json({
      success: true,
      data: {
        totalAnalyses: user._count.analyses,
        monthlyAnalyses,
        creditsUsedThisMonth,
        plan: user.plan,
        credits: user.credits,
        unlimited: user.plan !== 'FREE',
        daysUntilReset,
        emailVerified: user.emailVerified,
        memberSince: user.createdAt,
      },
    })
  }
}

export const userController = new UserController()