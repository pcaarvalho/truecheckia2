import Redis from 'ioredis'
import { config } from '@truecheckia/config'

let redis: Redis | null = null

export const connectRedis = async (): Promise<Redis> => {
  if (redis) {
    return redis
  }

  try {
    redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
    })

    redis.on('connect', () => {
      console.log('✅ Redis connected')
    })

    redis.on('error', (err) => {
      console.error('Redis error:', err)
    })

    // Test connection
    await redis.ping()

    return redis
  } catch (error) {
    console.error('Failed to connect to Redis:', error)
    throw error
  }
}

export const getRedis = (): Redis => {
  if (!redis) {
    throw new Error('Redis not initialized. Call connectRedis() first.')
  }
  return redis
}

export const cacheGet = async (key: string): Promise<any | null> => {
  try {
    const data = await getRedis().get(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error('Cache get error:', error)
    return null
  }
}

export const cacheSet = async (
  key: string,
  value: any,
  ttl?: number
): Promise<void> => {
  try {
    const serialized = JSON.stringify(value)
    if (ttl) {
      await getRedis().setex(key, ttl, serialized)
    } else {
      await getRedis().set(key, serialized)
    }
  } catch (error) {
    console.error('Cache set error:', error)
  }
}

export const cacheDel = async (key: string): Promise<void> => {
  try {
    await getRedis().del(key)
  } catch (error) {
    console.error('Cache delete error:', error)
  }
}

export const cacheFlush = async (pattern: string): Promise<void> => {
  try {
    const keys = await getRedis().keys(pattern)
    if (keys.length > 0) {
      await getRedis().del(...keys)
    }
  } catch (error) {
    console.error('Cache flush error:', error)
  }
}