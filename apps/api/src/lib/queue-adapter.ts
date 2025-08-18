import { config } from '@truecheckia/config'

/**
 * Queue Adapter - Dynamic loading based on environment
 * Allows seamless switching between Bull queues (traditional) and serverless queues
 */

// Determine which queue system to use
const isServerless = process.env.NODE_ENV === 'production' || process.env.FORCE_SERVERLESS === 'true'

/**
 * Dynamic queue system loader
 */
export const getQueueSystem = async () => {
  if (isServerless) {
    console.log('🚀 Loading serverless queue system (Upstash)')
    const serverlessQueues = await import('../queues/serverless-index')
    return {
      type: 'serverless',
      ...serverlessQueues,
    }
  } else {
    console.log('🔄 Loading traditional queue system (Bull + Redis)')
    const traditionalQueues = await import('../queues/index')
    return {
      type: 'traditional',
      ...traditionalQueues,
    }
  }
}

/**
 * Dynamic Redis client loader
 */
export const getRedisClient = async () => {
  if (isServerless) {
    console.log('🚀 Loading serverless Redis client (Upstash)')
    const serverlessRedis = await import('./serverless-redis')
    return {
      type: 'serverless',
      ...serverlessRedis,
    }
  } else {
    console.log('🔄 Loading traditional Redis client (ioredis)')
    const traditionalRedis = await import('./redis')
    return {
      type: 'traditional',
      ...traditionalRedis,
    }
  }
}

/**
 * Universal queue interface
 */
export interface UniversalQueue {
  addAnalysisJob: (data: any) => Promise<string>
  sendEmail: (data: any) => Promise<string>
  sendTemplateEmail: (to: string, template: string, ...args: any[]) => Promise<string>
  getJobStatus: (jobId: string) => Promise<any>
  getQueueStats: () => Promise<any>
  initializeQueues: () => void
  shutdownQueues: () => Promise<void>
}

/**
 * Universal Redis interface
 */
export interface UniversalRedis {
  connectRedis: () => Promise<any>
  getRedis: () => any
  cacheGet: (key: string) => Promise<any>
  cacheSet: (key: string, value: any, ttl?: number) => Promise<void>
  cacheDel: (key: string) => Promise<void>
  cacheFlush: (pattern: string) => Promise<void>
}

/**
 * Queue adapter factory
 */
export class QueueAdapter {
  private static instance: UniversalQueue | null = null
  
  static async getInstance(): Promise<UniversalQueue> {
    if (!this.instance) {
      const queueSystem = await getQueueSystem()
      this.instance = queueSystem as UniversalQueue
    }
    return this.instance
  }
  
  static async addAnalysisJob(data: any): Promise<string> {
    const queue = await this.getInstance()
    return await queue.addAnalysisJob(data)
  }
  
  static async sendEmail(data: any): Promise<string> {
    const queue = await this.getInstance()
    return await queue.sendEmail(data)
  }
  
  static async sendTemplateEmail(to: string, template: string, ...args: any[]): Promise<string> {
    const queue = await this.getInstance()
    return await queue.sendTemplateEmail(to, template, ...args)
  }
  
  static async getJobStatus(jobId: string): Promise<any> {
    const queue = await this.getInstance()
    return await queue.getJobStatus(jobId)
  }
  
  static async getQueueStats(): Promise<any> {
    const queue = await this.getInstance()
    return await queue.getQueueStats()
  }
  
  static async initializeQueues(): Promise<void> {
    const queue = await this.getInstance()
    queue.initializeQueues()
  }
  
  static async shutdownQueues(): Promise<void> {
    const queue = await this.getInstance()
    await queue.shutdownQueues()
  }
}

/**
 * Redis adapter factory
 */
export class RedisAdapter {
  private static instance: UniversalRedis | null = null
  
  static async getInstance(): Promise<UniversalRedis> {
    if (!this.instance) {
      const redisSystem = await getRedisClient()
      this.instance = redisSystem as UniversalRedis
    }
    return this.instance
  }
  
  static async connectRedis(): Promise<any> {
    const redis = await this.getInstance()
    return await redis.connectRedis()
  }
  
  static async getRedis(): Promise<any> {
    const redis = await this.getInstance()
    return redis.getRedis()
  }
  
  static async cacheGet(key: string): Promise<any> {
    const redis = await this.getInstance()
    return await redis.cacheGet(key)
  }
  
  static async cacheSet(key: string, value: any, ttl?: number): Promise<void> {
    const redis = await this.getInstance()
    await redis.cacheSet(key, value, ttl)
  }
  
  static async cacheDel(key: string): Promise<void> {
    const redis = await this.getInstance()
    await redis.cacheDel(key)
  }
  
  static async cacheFlush(pattern: string): Promise<void> {
    const redis = await this.getInstance()
    await redis.cacheFlush(pattern)
  }
}

/**
 * Environment detection utilities
 */
export const EnvironmentUtils = {
  isServerless: () => isServerless,
  isTraditional: () => !isServerless,
  getMode: () => isServerless ? 'serverless' : 'traditional',
  
  // Check if we're running in Vercel
  isVercel: () => !!process.env.VERCEL,
  
  // Check if we're running in development
  isDevelopment: () => process.env.NODE_ENV === 'development',
  
  // Check if we're running in production
  isProduction: () => process.env.NODE_ENV === 'production',
  
  // Get queue provider info
  getQueueProvider: () => ({
    type: isServerless ? 'serverless' : 'traditional',
    provider: isServerless ? 'upstash' : 'redis',
    framework: isServerless ? 'vercel' : 'bull',
  }),
  
  // Get Redis provider info
  getRedisProvider: () => ({
    type: isServerless ? 'serverless' : 'traditional',
    provider: isServerless ? 'upstash' : 'ioredis',
    connection: isServerless ? 'rest' : 'tcp',
  }),
}

/**
 * Migration utilities
 */
export const MigrationUtils = {
  /**
   * Test both queue systems
   */
  async testQueueSystems(): Promise<{
    traditional: { available: boolean; error?: string }
    serverless: { available: boolean; error?: string }
  }> {
    const results = {
      traditional: { available: false, error: undefined as string | undefined },
      serverless: { available: false, error: undefined as string | undefined },
    }
    
    // Test traditional queues
    try {
      const traditional = await import('../queues/index')
      await traditional.getQueueStats()
      results.traditional.available = true
    } catch (error) {
      results.traditional.error = error instanceof Error ? error.message : 'Unknown error'
    }
    
    // Test serverless queues
    try {
      const serverless = await import('../queues/serverless-index')
      await serverless.getQueueStats()
      results.serverless.available = true
    } catch (error) {
      results.serverless.error = error instanceof Error ? error.message : 'Unknown error'
    }
    
    return results
  },
  
  /**
   * Test both Redis systems
   */
  async testRedisSystems(): Promise<{
    traditional: { available: boolean; error?: string }
    serverless: { available: boolean; error?: string }
  }> {
    const results = {
      traditional: { available: false, error: undefined as string | undefined },
      serverless: { available: false, error: undefined as string | undefined },
    }
    
    // Test traditional Redis
    try {
      const traditional = await import('./redis')
      await traditional.connectRedis()
      results.traditional.available = true
    } catch (error) {
      results.traditional.error = error instanceof Error ? error.message : 'Unknown error'
    }
    
    // Test serverless Redis
    try {
      const serverless = await import('./serverless-redis')
      await serverless.connectRedis()
      results.serverless.available = true
    } catch (error) {
      results.serverless.error = error instanceof Error ? error.message : 'Unknown error'
    }
    
    return results
  },
  
  /**
   * Get migration status
   */
  getMigrationStatus(): {
    currentMode: string
    recommendation: string
    requiredEnvVars: string[]
    optionalEnvVars: string[]
  } {
    const requiredEnvVars = isServerless 
      ? ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']
      : ['REDIS_URL']
      
    const optionalEnvVars = isServerless
      ? ['CRON_SECRET', 'WEBHOOK_SECRET']
      : []
    
    const recommendation = isServerless
      ? 'You are using serverless queues. Make sure Upstash Redis is configured.'
      : 'You are using traditional queues. Consider migrating to serverless for production.'
    
    return {
      currentMode: EnvironmentUtils.getMode(),
      recommendation,
      requiredEnvVars,
      optionalEnvVars,
    }
  },
}

export default {
  QueueAdapter,
  RedisAdapter,
  EnvironmentUtils,
  MigrationUtils,
}