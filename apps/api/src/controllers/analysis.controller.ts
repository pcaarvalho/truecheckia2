// @ts-nocheck
import { Request, Response } from 'express'
import { prisma } from '@truecheckia/database'
import { config, ERROR_CODES } from '@truecheckia/config'
import { AppError } from '../middleware/error.middleware'
import { analyzeWithOpenAI } from '../services/openai.service'
import { RedisAdapter } from '../lib/queue-adapter'
import { createHash } from 'crypto'
import type { ApiResponse, AnalyzeTextInput, AnalysisResult } from '@truecheckia/types'

class AnalysisController {
  async analyzeText(req: Request<{}, {}, AnalyzeTextInput>, res: Response<ApiResponse>) {
    const { text, language = 'pt' } = req.body
    const userId = req.userId!

    // Check user credits
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

    // Reset credits if needed (monthly reset for free users)
    if (user.plan === 'FREE') {
      const now = new Date()
      const resetDate = new Date(user.creditsResetAt)
      const daysSinceReset = Math.floor((now.getTime() - resetDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceReset >= 30) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            credits: config.limits.freeCredits,
            creditsResetAt: now,
          },
        })
        user.credits = config.limits.freeCredits
      }
    }

    // Check if user has credits (unlimited for PRO/ENTERPRISE)
    if (user.plan === 'FREE' && user.credits <= 0) {
      throw new AppError(
        'Insufficient credits',
        403,
        ERROR_CODES.INSUFFICIENT_CREDITS,
        { creditsRemaining: 0 }
      )
    }

    // Generate cache key
    const textHash = createHash('sha256').update(text).digest('hex')
    const cacheKey = `${config.cache.analysisPrefix}${textHash}`

    // Check cache
    const cached = await RedisAdapter.cacheGet(cacheKey)
    if (cached) {
      // Still deduct credit for cached results
      if (user.plan === 'FREE') {
        await prisma.user.update({
          where: { id: userId },
          data: { credits: { decrement: 1 } },
        })
      }

      // Save to history
      const analysis = await prisma.analysis.create({
        data: {
          userId,
          text: text.substring(0, 500), // Store first 500 chars only
          wordCount: text.split(/\s+/).length,
          charCount: text.length,
          language,
          aiScore: cached.aiScore,
          confidence: cached.confidence,
          isAiGenerated: cached.isAiGenerated,
          indicators: cached.indicators,
          explanation: cached.explanation,
          suspiciousParts: cached.suspiciousParts,
          processingTime: 0,
          cached: true,
        },
      })

      return res.json({
        success: true,
        data: {
          ...cached,
          id: analysis.id,
          cached: true,
        },
      })
    }

    // Perform analysis
    const startTime = Date.now()
    let result: AnalysisResult
    try {
      result = await analyzeWithOpenAI(text, language)
    } catch (error) {
      console.error('Analysis failed:', error)
      throw new AppError(
        'AI analysis service is temporarily unavailable. Please try again later.',
        503,
        ERROR_CODES.SERVICE_UNAVAILABLE
      )
    }
    const processingTime = Date.now() - startTime

    // Deduct credit only after successful analysis
    if (user.plan === 'FREE') {
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { decrement: 1 } },
      })
    }

    // Save to database
    const analysis = await prisma.analysis.create({
      data: {
        userId,
        text: text.substring(0, 500),
        wordCount: text.split(/\s+/).length,
        charCount: text.length,
        language,
        aiScore: result.aiScore,
        confidence: result.confidence,
        isAiGenerated: result.isAiGenerated,
        indicators: result.indicators as any,
        explanation: result.explanation,
        suspiciousParts: result.suspiciousParts as any,
        processingTime,
        cached: false,
      },
    })

    // Cache result
    await RedisAdapter.cacheSet(cacheKey, result, config.cache.ttl)

    // Prepare response
    const response: AnalysisResult = {
      id: analysis.id,
      aiScore: result.aiScore,
      confidence: result.confidence,
      isAiGenerated: result.isAiGenerated,
      indicators: result.indicators,
      explanation: result.explanation,
      suspiciousParts: result.suspiciousParts,
      processingTime,
      wordCount: analysis.wordCount,
      charCount: analysis.charCount,
    }

    res.json({
      success: true,
      data: response,
    })
  }

  async getHistory(req: Request, res: Response<ApiResponse>) {
    const userId = req.userId!
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const skip = (page - 1) * limit

    const [analyses, total] = await Promise.all([
      prisma.analysis.findMany({
        where: { userId },
        select: {
          id: true,
          text: true,
          aiScore: true,
          confidence: true,
          isAiGenerated: true,
          wordCount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.analysis.count({ where: { userId } }),
    ])

    res.json({
      success: true,
      data: analyses,
      meta: {
        page,
        limit,
        total,
      },
    })
  }

  async getAnalysis(req: Request, res: Response<ApiResponse>) {
    const { id } = req.params
    const userId = req.userId!

    const analysis = await prisma.analysis.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!analysis) {
      throw new AppError('Analysis not found', 404, ERROR_CODES.NOT_FOUND)
    }

    res.json({
      success: true,
      data: analysis,
    })
  }

  async getStats(req: Request, res: Response<ApiResponse>) {
    const userId = req.userId!

    const [totalAnalyses, currentMonthAnalyses, analyses] = await Promise.all([
      prisma.analysis.count({ where: { userId } }),
      prisma.analysis.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(new Date().setDate(1)),
          },
        },
      }),
      prisma.analysis.findMany({
        where: { userId },
        select: {
          aiScore: true,
          indicators: true,
        },
      }),
    ])

    // Calculate average AI score
    const averageAiScore = analyses.length > 0
      ? analyses.reduce((sum, a) => sum + a.aiScore, 0) / analyses.length
      : 0

    // Find most detected patterns
    const patternCounts: Record<string, number> = {}
    analyses.forEach(analysis => {
      const indicators = analysis.indicators as any[]
      indicators.forEach(indicator => {
        patternCounts[indicator.type] = (patternCounts[indicator.type] || 0) + 1
      })
    })

    const mostDetectedPatterns = Object.entries(patternCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([pattern]) => pattern)

    res.json({
      success: true,
      data: {
        totalAnalyses,
        currentMonthAnalyses,
        averageAiScore: Math.round(averageAiScore),
        mostDetectedPatterns,
      },
    })
  }
}

export const analysisController = new AnalysisController()