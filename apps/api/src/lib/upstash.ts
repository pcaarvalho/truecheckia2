import { Redis } from '@upstash/redis'
import { config } from '@truecheckia/config'

// Upstash Redis client - serverless compatible
export const upstash = new Redis({
  url: config.upstash.url,
  token: config.upstash.token,
})

// Legacy ioredis compatibility layer
export const serverlessRedis = {
  async get(key: string): Promise<string | null> {
    return await upstash.get(key)
  },

  async set(key: string, value: string, ex?: number): Promise<string> {
    if (ex) {
      return await upstash.set(key, value, { ex })
    }
    return await upstash.set(key, value)
  },

  async setex(key: string, seconds: number, value: string): Promise<string> {
    return await upstash.set(key, value, { ex: seconds })
  },

  async del(...keys: string[]): Promise<number> {
    return await upstash.del(...keys)
  },

  async keys(pattern: string): Promise<string[]> {
    return await upstash.keys(pattern)
  },

  async exists(...keys: string[]): Promise<number> {
    return await upstash.exists(...keys)
  },

  async expire(key: string, seconds: number): Promise<number> {
    return await upstash.expire(key, seconds)
  },

  async ping(): Promise<string> {
    return await upstash.ping()
  },

  async incr(key: string): Promise<number> {
    return await upstash.incr(key)
  },

  async decr(key: string): Promise<number> {
    return await upstash.decr(key)
  },

  async hget(key: string, field: string): Promise<string | null> {
    return await upstash.hget(key, field)
  },

  async hset(key: string, field: string, value: string): Promise<number> {
    return await upstash.hset(key, { [field]: value })
  },

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return await upstash.hdel(key, ...fields)
  },

  async hgetall(key: string): Promise<Record<string, string>> {
    return await upstash.hgetall(key)
  },

  async lpush(key: string, ...elements: string[]): Promise<number> {
    return await upstash.lpush(key, ...elements)
  },

  async rpop(key: string): Promise<string | null> {
    return await upstash.rpop(key)
  },

  async llen(key: string): Promise<number> {
    return await upstash.llen(key)
  },
}

// Cache utilities
export const serverlessCache = {
  async get(key: string): Promise<any | null> {
    try {
      const data = await upstash.get(key)
      return data ? JSON.parse(data as string) : null
    } catch (error) {
      console.error('Serverless cache get error:', error)
      return null
    }
  },

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value)
      if (ttl) {
        await upstash.set(key, serialized, { ex: ttl })
      } else {
        await upstash.set(key, serialized)
      }
    } catch (error) {
      console.error('Serverless cache set error:', error)
    }
  },

  async del(key: string): Promise<void> {
    try {
      await upstash.del(key)
    } catch (error) {
      console.error('Serverless cache delete error:', error)
    }
  },

  async flush(pattern: string): Promise<void> {
    try {
      const keys = await upstash.keys(pattern)
      if (keys.length > 0) {
        await upstash.del(...keys)
      }
    } catch (error) {
      console.error('Serverless cache flush error:', error)
    }
  },

  async exists(key: string): Promise<boolean> {
    try {
      return (await upstash.exists(key)) > 0
    } catch (error) {
      console.error('Serverless cache exists error:', error)
      return false
    }
  },

  async incr(key: string): Promise<number> {
    try {
      return await upstash.incr(key)
    } catch (error) {
      console.error('Serverless cache incr error:', error)
      return 0
    }
  },

  async expire(key: string, seconds: number): Promise<void> {
    try {
      await upstash.expire(key, seconds)
    } catch (error) {
      console.error('Serverless cache expire error:', error)
    }
  },
}

// JSON serialization helpers for queue operations
export const queueSerialize = (data: any): string => {
  try {
    return JSON.stringify(data)
  } catch (error) {
    console.error('Queue serialize error:', error)
    return JSON.stringify({ error: 'Serialization failed', original: String(data) })
  }
}

export const queueDeserialize = (data: string): any => {
  try {
    return JSON.parse(data)
  } catch (error) {
    console.error('Queue deserialize error:', error)
    return { error: 'Deserialization failed', raw: data }
  }
}

// Queue simulation using Redis lists and scheduled functions with proper serialization
export const serverlessQueue = {
  async add(queueName: string, data: any, options?: { delay?: number }): Promise<string> {
    const jobId = `${Date.now()}-${Math.random().toString(36).substring(2)}`
    const job = {
      id: jobId,
      data,
      queueName,
      createdAt: Date.now(),
      ...(options?.delay && { executeAt: Date.now() + options.delay }),
    }

    try {
      // Add to queue list with proper serialization
      await upstash.lpush(`queue:${queueName}:pending`, queueSerialize(job))
      
      // If delayed, also add to delayed jobs with metadata
      if (options?.delay) {
        await upstash.zadd(`queue:${queueName}:delayed`, {
          score: job.executeAt!,
          member: queueSerialize({ jobId, data: job.data }),
        })
      }

      return jobId
    } catch (error) {
      console.error('Failed to add job to serverless queue:', error)
      throw error
    }
  },

  async process(queueName: string, processor: (job: any) => Promise<any>): Promise<void> {
    try {
      // First, move any delayed jobs that are ready
      await this.moveDelayedJobs(queueName)

      // Process pending jobs with safe deserialization
      const jobData = await upstash.rpop(`queue:${queueName}:pending`)
      if (!jobData) return

      const job = queueDeserialize(jobData as string)
      if (job.error) {
        console.error('Failed to deserialize job:', job)
        return
      }
      
      try {
        // Mark as processing with serialized data
        await upstash.hset(`job:${job.id}`, {
          status: 'processing',
          startedAt: Date.now().toString(),
          data: queueSerialize(job.data),
          queueName: job.queueName,
          createdAt: job.createdAt?.toString() || Date.now().toString(),
        })

        // Process the job
        const result = await processor(job)

        // Mark as completed with proper serialization
        await upstash.hset(`job:${job.id}`, {
          status: 'completed',
          completedAt: Date.now().toString(),
          result: queueSerialize(result),
        })

        // Clean up completed job after 24 hours
        await upstash.expire(`job:${job.id}`, 86400)

      } catch (error) {
        console.error(`Job ${job.id} failed:`, error)
        
        // Mark as failed with serialized error info
        await upstash.hset(`job:${job.id}`, {
          status: 'failed',
          failedAt: Date.now().toString(),
          error: queueSerialize({
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            type: error?.constructor?.name || 'UnknownError'
          }),
        })

        // Keep failed jobs for debugging
        await upstash.expire(`job:${job.id}`, 259200) // 3 days
        throw error
      }
    } catch (error) {
      console.error('Error processing serverless queue:', error)
    }
  },

  async moveDelayedJobs(queueName: string): Promise<void> {
    try {
      const now = Date.now()
      const readyJobs = await upstash.zrangebyscore(
        `queue:${queueName}:delayed`,
        0,
        now,
        { withScores: true }
      )

      for (let i = 0; i < readyJobs.length; i += 2) {
        const jobId = readyJobs[i] as string
        
        // Move from delayed to pending
        const jobKey = `job:${jobId}`
        const jobData = await upstash.hgetall(jobKey)
        
        if (jobData && jobData.data) {
          const parsedData = queueDeserialize(jobData.data)
          await upstash.lpush(`queue:${queueName}:pending`, queueSerialize({
            id: jobId,
            data: parsedData.error ? {} : parsedData,
            queueName,
            createdAt: parseInt(jobData.createdAt || '0'),
          }))
          
          // Remove from delayed
          await upstash.zrem(`queue:${queueName}:delayed`, jobId)
        }
      }
    } catch (error) {
      console.error('Error moving delayed jobs:', error)
    }
  },

  async getJobStatus(jobId: string): Promise<any> {
    try {
      const data = await upstash.hgetall(`job:${jobId}`)
      if (!data || Object.keys(data).length === 0) {
        return null
      }
      
      return {
        id: jobId,
        status: data.status || 'unknown',
        createdAt: data.createdAt ? new Date(parseInt(data.createdAt)) : null,
        startedAt: data.startedAt ? new Date(parseInt(data.startedAt)) : null,
        completedAt: data.completedAt ? new Date(parseInt(data.completedAt)) : null,
        failedAt: data.failedAt ? new Date(parseInt(data.failedAt)) : null,
        result: data.result ? queueDeserialize(data.result) : null,
        error: data.error || null,
      }
    } catch (error) {
      console.error('Error getting job status:', error)
      return null
    }
  },

  async getQueueStats(queueName: string): Promise<any> {
    try {
      const [pending, delayed, processing] = await Promise.all([
        upstash.llen(`queue:${queueName}:pending`),
        upstash.zcard(`queue:${queueName}:delayed`),
        upstash.scard(`queue:${queueName}:processing`),
      ])

      return {
        pending,
        delayed,
        processing,
        total: pending + delayed + processing,
      }
    } catch (error) {
      console.error('Error getting queue stats:', error)
      return { pending: 0, delayed: 0, processing: 0, total: 0 }
    }
  },
}

// Session storage for authentication
export const sessionStore = {
  async set(sessionId: string, data: any, ttl: number = 3600): Promise<void> {
    try {
      await upstash.set(`session:${sessionId}`, JSON.stringify(data), { ex: ttl })
    } catch (error) {
      console.error('Session store set error:', error)
    }
  },

  async get(sessionId: string): Promise<any | null> {
    try {
      const data = await upstash.get(`session:${sessionId}`)
      return data ? JSON.parse(data as string) : null
    } catch (error) {
      console.error('Session store get error:', error)
      return null
    }
  },

  async destroy(sessionId: string): Promise<void> {
    try {
      await upstash.del(`session:${sessionId}`)
    } catch (error) {
      console.error('Session store destroy error:', error)
    }
  },

  async touch(sessionId: string, ttl: number = 3600): Promise<void> {
    try {
      await upstash.expire(`session:${sessionId}`, ttl)
    } catch (error) {
      console.error('Session store touch error:', error)
    }
  },
}

// Rate limiting
export const rateLimiter = {
  async checkLimit(key: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    try {
      const current = await upstash.incr(`rate:${key}`)
      
      if (current === 1) {
        await upstash.expire(`rate:${key}`, window)
      }
      
      const ttl = await upstash.ttl(`rate:${key}`)
      const resetTime = Date.now() + (ttl * 1000)
      
      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        resetTime,
      }
    } catch (error) {
      console.error('Rate limiter error:', error)
      return { allowed: true, remaining: limit, resetTime: Date.now() + window * 1000 }
    }
  },

  async resetLimit(key: string): Promise<void> {
    try {
      await upstash.del(`rate:${key}`)
    } catch (error) {
      console.error('Rate limiter reset error:', error)
    }
  },
}

export default upstash