// @ts-nocheck
import { Request, Response } from 'express'
import { prisma } from '@truecheckia/database'
import { config, ERROR_CODES } from '@truecheckia/config'
import { AppError } from '../middleware/error.middleware'
import { analyzeWithOpenAI } from '../services/openai.service'
import { cacheGet, cacheSet } from '../lib/redis'
import { createHash } from 'crypto'
import type { ApiResponse, AnalyzeTextInput } from '@truecheckia/types'

class ApiController {
  async analyze(req: Request<{}, {}, AnalyzeTextInput & { webhook_url?: string }>, res: Response<ApiResponse>) {
    const { text, language = 'pt', webhook_url } = req.body
    const apiKey = req.headers['x-api-key'] as string

    if (!apiKey) {
      throw new AppError('API key required', 401, ERROR_CODES.UNAUTHORIZED)
    }

    // Find user by API key
    const user = await prisma.user.findUnique({
      where: { apiKey },
      select: { 
        id: true,
        plan: true,
      },
    })

    if (!user) {
      throw new AppError('Invalid API key', 401, ERROR_CODES.UNAUTHORIZED)
    }

    if (user.plan === 'FREE') {
      throw new AppError(
        'API access requires PRO or ENTERPRISE plan',
        403,
        ERROR_CODES.UNAUTHORIZED
      )
    }

    // Log API usage
    const startTime = Date.now()

    // Generate cache key
    const textHash = createHash('sha256').update(text).digest('hex')
    const cacheKey = `${config.cache.analysisPrefix}${textHash}`

    // Check cache
    const cached = await cacheGet(cacheKey)
    if (cached) {
      // Log API usage
      await prisma.apiUsage.create({
        data: {
          userId: user.id,
          endpoint: '/api/v1/analyze',
          method: 'POST',
          statusCode: 200,
          responseTime: Date.now() - startTime,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      })

      return res.json({
        success: true,
        data: {
          ...cached,
          cached: true,
        },
      })
    }

    // Perform analysis
    const result = await analyzeWithOpenAI(text, language)
    const processingTime = Date.now() - startTime

    // Save to database
    const analysis = await prisma.analysis.create({
      data: {
        userId: user.id,
        text: text.substring(0, 500),
        wordCount: text.split(/\s+/).length,
        charCount: text.length,
        language,
        aiScore: result.aiScore,
        confidence: result.confidence,
        isAiGenerated: result.isAiGenerated,
        indicators: result.indicators,
        explanation: result.explanation,
        suspiciousParts: result.suspiciousParts,
        processingTime,
        cached: false,
      },
    })

    // Cache result
    await cacheSet(cacheKey, result, config.cache.ttl)

    // Log API usage
    await prisma.apiUsage.create({
      data: {
        userId: user.id,
        endpoint: '/api/v1/analyze',
        method: 'POST',
        statusCode: 200,
        responseTime: processingTime,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    })

    // TODO: If webhook_url provided, send result asynchronously

    res.json({
      success: true,
      data: {
        id: analysis.id,
        ...result,
      },
    })
  }

  async getStatus(req: Request, res: Response<ApiResponse>) {
    res.json({
      success: true,
      data: {
        status: 'operational',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      },
    })
  }

  async getUsage(req: Request, res: Response<ApiResponse>) {
    const apiKey = req.headers['x-api-key'] as string

    if (!apiKey) {
      throw new AppError('API key required', 401, ERROR_CODES.UNAUTHORIZED)
    }

    const user = await prisma.user.findUnique({
      where: { apiKey },
      select: { id: true },
    })

    if (!user) {
      throw new AppError('Invalid API key', 401, ERROR_CODES.UNAUTHORIZED)
    }

    const period = (req.query.period as string) || 'month'
    
    let startDate = new Date()
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1)
        break
      case 'week':
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
      default:
        startDate.setMonth(startDate.getMonth() - 1)
        break
    }

    const [totalRequests, successfulRequests, averageResponseTime] = await Promise.all([
      prisma.apiUsage.count({
        where: {
          userId: user.id,
          createdAt: { gte: startDate },
        },
      }),
      prisma.apiUsage.count({
        where: {
          userId: user.id,
          statusCode: 200,
          createdAt: { gte: startDate },
        },
      }),
      prisma.apiUsage.aggregate({
        where: {
          userId: user.id,
          createdAt: { gte: startDate },
        },
        _avg: {
          responseTime: true,
        },
      }),
    ])

    res.json({
      success: true,
      data: {
        period,
        totalRequests,
        successfulRequests,
        failedRequests: totalRequests - successfulRequests,
        averageResponseTime: Math.round(averageResponseTime._avg.responseTime || 0),
        successRate: totalRequests > 0 
          ? Math.round((successfulRequests / totalRequests) * 100)
          : 0,
      },
    })
  }
}

export const apiController = new ApiController()