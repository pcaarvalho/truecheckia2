import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cacheManager, cacheWarmingStrategies, cacheKey } from '../../_utils/cache-manager'
import { prisma } from '@truecheckia/database'

/**
 * Cache Warming Cron Job
 * Runs every 5 minutes to keep critical data hot
 * Optimizes cold start performance for frequently accessed data
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // Verify cron authorization
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const startTime = Date.now()
  const results = {
    warmed: 0,
    errors: 0,
    duration: 0,
    strategies: [] as string[]
  }

  try {
    console.log('🔥 Starting cache warming process...')

    // 1. Warm critical configuration
    await warmConfiguration()
    results.strategies.push('configuration')

    // 2. Warm active user data
    await warmActiveUsers()
    results.strategies.push('active-users')

    // 3. Warm popular analysis results
    await warmPopularAnalyses()
    results.strategies.push('popular-analyses')

    // 4. Warm API key data for active keys
    await warmApiKeys()
    results.strategies.push('api-keys')

    // 5. Warm subscription data
    await warmSubscriptions()
    results.strategies.push('subscriptions')

    results.duration = Date.now() - startTime

    console.log(`✅ Cache warming completed in ${results.duration}ms`)
    console.log(`📊 Strategies: ${results.strategies.join(', ')}`)

    return res.status(200).json({
      success: true,
      message: 'Cache warming completed',
      results
    })

  } catch (error) {
    console.error('❌ Cache warming failed:', error)
    results.errors++
    results.duration = Date.now() - startTime

    return res.status(500).json({
      success: false,
      message: 'Cache warming failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      results
    })
  }
}

/**
 * Warm critical configuration data
 */
async function warmConfiguration(): Promise<void> {
  console.log('🏗️ Warming configuration cache...')
  
  await cacheWarmingStrategies.warmConfigCache()
  
  // Warm feature flags
  await cacheManager.set(cacheKey.config('features'), {
    aiAnalysis: true,
    apiAccess: true,
    webhooks: true,
    advancedAnalytics: true,
    customModels: false
  }, {
    ttl: 14400, // 4 hours
    priority: 'critical',
    tags: ['config', 'features']
  })

  // Warm rate limits
  await cacheManager.set(cacheKey.config('rate-limits'), {
    auth: { free: 5, pro: 10, enterprise: 25 },
    analysis: { free: 10, pro: 50, enterprise: 100 },
    api: { free: 50, pro: 200, enterprise: 500 }
  }, {
    ttl: 14400,
    priority: 'critical',
    tags: ['config', 'limits']
  })
}

/**
 * Warm data for most active users (last 24 hours)
 */
async function warmActiveUsers(): Promise<void> {
  console.log('👥 Warming active user cache...')
  
  try {
    // Get most active users from last 24 hours
    const activeUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        lastLoginAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      select: { id: true },
      take: 50, // Limit to top 50 active users
      orderBy: { lastLoginAt: 'desc' }
    })

    console.log(`Found ${activeUsers.length} active users to warm`)

    // Warm user data in batches
    const batchSize = 10
    for (let i = 0; i < activeUsers.length; i += batchSize) {
      const batch = activeUsers.slice(i, i + batchSize)
      
      await Promise.allSettled(
        batch.map(async user => {
          try {
            await cacheWarmingStrategies.warmUserData(user.id)
          } catch (error) {
            console.warn(`Failed to warm user ${user.id}:`, error)
          }
        })
      )
    }
  } catch (error) {
    console.error('Failed to warm active users:', error)
  }
}

/**
 * Warm popular analysis results (most frequently requested)
 */
async function warmPopularAnalyses(): Promise<void> {
  console.log('📈 Warming popular analysis cache...')
  
  try {
    // Get most common analysis patterns from last 7 days
    const recentAnalyses = await prisma.analysis.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        },
        status: 'COMPLETED'
      },
      select: {
        text: true,
        aiScore: true,
        confidence: true,
        isAiGenerated: true,
        indicators: true,
        explanation: true,
        suspiciousParts: true,
        processingTime: true,
        language: true
      },
      take: 20,
      orderBy: { createdAt: 'desc' }
    })

    console.log(`Warming ${recentAnalyses.length} popular analyses`)

    // Cache analysis results
    for (const analysis of recentAnalyses) {
      try {
        const textHash = require('crypto').createHash('sha256')
          .update(analysis.text.substring(0, 500))
          .digest('hex')
        
        const cacheKeyAnalysis = cacheKey.analysis(textHash)
        
        await cacheManager.set(cacheKeyAnalysis, {
          aiScore: analysis.aiScore,
          confidence: analysis.confidence,
          isAiGenerated: analysis.isAiGenerated,
          indicators: analysis.indicators,
          explanation: analysis.explanation,
          suspiciousParts: analysis.suspiciousParts,
          processingTime: analysis.processingTime,
          language: analysis.language,
          cached: true
        }, {
          ttl: 7200, // 2 hours
          priority: 'high',
          tags: ['analysis', 'popular']
        })
      } catch (error) {
        console.warn('Failed to cache analysis:', error)
      }
    }
  } catch (error) {
    console.error('Failed to warm popular analyses:', error)
  }
}

/**
 * Warm API key data for active keys
 */
async function warmApiKeys(): Promise<void> {
  console.log('🔑 Warming API key cache...')
  
  try {
    // Get API keys used in last 24 hours
    const activeApiKeys = await prisma.apiKey.findMany({
      where: {
        isActive: true,
        lastUsedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      include: {
        user: {
          select: { id: true, email: true, role: true, plan: true, isActive: true }
        }
      },
      take: 25 // Limit to most recent 25 keys
    })

    console.log(`Warming ${activeApiKeys.length} active API keys`)

    for (const apiKeyData of activeApiKeys) {
      try {
        const keyCache = cacheKey.apiKey(apiKeyData.key)
        
        await cacheManager.set(keyCache, {
          id: apiKeyData.id,
          name: apiKeyData.name,
          user: apiKeyData.user,
          permissions: apiKeyData.permissions,
          lastUsedAt: apiKeyData.lastUsedAt,
          expiresAt: apiKeyData.expiresAt
        }, {
          ttl: 600, // 10 minutes
          priority: 'high',
          tags: ['api-key', 'auth']
        })
      } catch (error) {
        console.warn(`Failed to cache API key ${apiKeyData.id}:`, error)
      }
    }
  } catch (error) {
    console.error('Failed to warm API keys:', error)
  }
}

/**
 * Warm subscription data for active subscriptions
 */
async function warmSubscriptions(): Promise<void> {
  console.log('💳 Warming subscription cache...')
  
  try {
    // Get active subscriptions
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        status: { in: ['active', 'trialing'] }
      },
      include: {
        user: {
          select: { id: true }
        }
      },
      take: 100 // Limit to 100 active subscriptions
    })

    console.log(`Warming ${activeSubscriptions.length} active subscriptions`)

    for (const subscription of activeSubscriptions) {
      try {
        const subCache = cacheKey.subscription(subscription.user.id)
        
        await cacheManager.set(subCache, {
          id: subscription.id,
          plan: subscription.plan,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          stripeSubscriptionId: subscription.stripeSubscriptionId
        }, {
          ttl: 1800, // 30 minutes
          priority: 'high',
          tags: ['subscription', 'billing']
        })
      } catch (error) {
        console.warn(`Failed to cache subscription ${subscription.id}:`, error)
      }
    }
  } catch (error) {
    console.error('Failed to warm subscriptions:', error)
  }
}