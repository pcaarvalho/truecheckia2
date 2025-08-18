import { config } from '@truecheckia/config'
import { serverlessCache, upstash } from './upstash'

/**
 * Serverless Redis adapter - seamless drop-in replacement for ioredis
 * Maintains compatibility with existing Redis usage patterns
 */

let isConnected = false

export const connectRedis = async () => {
  if (isConnected) {
    return serverlessRedis
  }

  try {
    // Test connection
    await upstash.ping()
    isConnected = true
    console.log('✅ Upstash Redis connected (serverless)')
    return serverlessRedis
  } catch (error) {
    console.error('Failed to connect to Upstash Redis:', error)
    throw error
  }
}

export const getRedis = () => {
  if (!isConnected) {
    throw new Error('Upstash Redis not initialized. Call connectRedis() first.')
  }
  return serverlessRedis
}

// JSON serialization helpers for complex objects
const serializeValue = (value: any): string => {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return value
  try {
    return JSON.stringify(value)
  } catch (error) {
    console.error('Failed to serialize value:', error)
    return String(value)
  }
}

const deserializeValue = (value: any): any => {
  if (value === null || value === undefined) return value
  if (typeof value !== 'string') return value
  
  // Try to parse as JSON, fallback to original string
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

// Enhanced JSON operations for Upstash
export const jsonOperations = {
  async setJSON(key: string, value: any, options?: { ex?: number }): Promise<string | null> {
    const serialized = serializeValue(value)
    return await upstash.set(key, serialized, options)
  },

  async getJSON(key: string): Promise<any | null> {
    const raw = await upstash.get(key)
    return deserializeValue(raw)
  },

  async hsetJSON(key: string, data: Record<string, any>): Promise<number> {
    const serializedData: Record<string, string> = {}
    for (const [field, value] of Object.entries(data)) {
      serializedData[field] = serializeValue(value)
    }
    return await upstash.hset(key, serializedData)
  },

  async hgetJSON(key: string, field: string): Promise<any | null> {
    const raw = await upstash.hget(key, field)
    return deserializeValue(raw)
  },

  async hgetallJSON(key: string): Promise<Record<string, any> | null> {
    try {
      const raw = await upstash.hgetall(key)
      if (!raw || typeof raw !== 'object' || Object.keys(raw).length === 0) {
        return null
      }
      
      const result: Record<string, any> = {}
      for (const [field, value] of Object.entries(raw)) {
        result[field] = deserializeValue(value)
      }
      return result
    } catch (error) {
      console.error('hgetallJSON error:', error)
      return null
    }
  },

  async lpushJSON(key: string, ...values: any[]): Promise<number> {
    const serialized = values.map(serializeValue)
    return await upstash.lpush(key, ...serialized)
  },

  async rpopJSON(key: string): Promise<any | null> {
    const raw = await upstash.rpop(key)
    return deserializeValue(raw)
  }
}

// Drop-in replacement for existing Redis functions with auto-serialization
export const cacheGet = async (key: string): Promise<any | null> => {
  return await jsonOperations.getJSON(key)
}

export const cacheSet = async (
  key: string,
  value: any,
  ttl?: number
): Promise<void> => {
  await jsonOperations.setJSON(key, value, ttl ? { ex: ttl } : undefined)
}

export const cacheDel = async (key: string): Promise<void> => {
  return await serverlessCache.del(key)
}

export const cacheFlush = async (pattern: string): Promise<void> => {
  return await serverlessCache.flush(pattern)
}

// Enhanced cache with additional serverless optimizations
export const advancedCache = {
  /**
   * Multi-get with fallback
   */
  async mget(keys: string[]): Promise<(any | null)[]> {
    try {
      const results = await Promise.all(
        keys.map(key => serverlessCache.get(key))
      )
      return results
    } catch (error) {
      console.error('Multi-get error:', error)
      return keys.map(() => null)
    }
  },

  /**
   * Multi-set with TTL
   */
  async mset(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    try {
      await Promise.all(
        entries.map(({ key, value, ttl }) => 
          serverlessCache.set(key, value, ttl)
        )
      )
    } catch (error) {
      console.error('Multi-set error:', error)
    }
  },

  /**
   * Atomic increment with expiration
   */
  async incrWithExpire(key: string, ttl: number = 3600): Promise<number> {
    try {
      const count = await serverlessCache.incr(key)
      if (count === 1) {
        await serverlessCache.expire(key, ttl)
      }
      return count
    } catch (error) {
      console.error('Increment with expire error:', error)
      return 0
    }
  },

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    try {
      const cached = await serverlessCache.get(key)
      if (cached !== null) {
        return cached as T
      }

      const fresh = await fetcher()
      await serverlessCache.set(key, fresh, ttl)
      return fresh
    } catch (error) {
      console.error('Get or set error:', error)
      // Fallback to fetcher on cache errors
      return await fetcher()
    }
  },

  /**
   * Distributed lock simulation (for critical sections)
   */
  async withLock<T>(
    lockKey: string,
    operation: () => Promise<T>,
    ttl: number = 30
  ): Promise<T> {
    const lockValue = `${Date.now()}-${Math.random()}`
    
    try {
      // Try to acquire lock
      const acquired = await upstash.set(
        `lock:${lockKey}`,
        lockValue,
        { nx: true, ex: ttl }
      )

      if (!acquired) {
        throw new Error(`Failed to acquire lock: ${lockKey}`)
      }

      // Execute operation
      const result = await operation()
      
      // Release lock (only if we still own it)
      const currentLock = await upstash.get(`lock:${lockKey}`)
      if (currentLock === lockValue) {
        await upstash.del(`lock:${lockKey}`)
      }

      return result
    } catch (error) {
      console.error('Lock operation error:', error)
      throw error
    }
  },

  /**
   * Cache with stale-while-revalidate pattern
   */
  async getStaleWhileRevalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 3600,
    staleTime: number = 7200
  ): Promise<T> {
    try {
      const cached = await serverlessCache.get(key)
      const cacheTime = await upstash.get(`${key}:time`)
      
      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime as string)
        
        // Return stale data immediately
        if (age < staleTime * 1000) {
          // Background revalidation if stale
          if (age > ttl * 1000) {
            // Don't await - fire and forget
            fetcher().then(fresh => {
              serverlessCache.set(key, fresh, staleTime)
              upstash.set(`${key}:time`, Date.now().toString(), { ex: staleTime })
            }).catch(console.error)
          }
          return cached as T
        }
      }

      // Fetch fresh data
      const fresh = await fetcher()
      await Promise.all([
        serverlessCache.set(key, fresh, staleTime),
        upstash.set(`${key}:time`, Date.now().toString(), { ex: staleTime })
      ])
      
      return fresh
    } catch (error) {
      console.error('Stale while revalidate error:', error)
      return await fetcher()
    }
  },
}

// Compatibility layer for existing code with auto-serialization
export const serverlessRedis = {
  // Basic Redis operations with JSON support
  get: (key: string) => jsonOperations.getJSON(key),
  set: (key: string, value: any, ex?: number) => {
    if (ex) {
      return jsonOperations.setJSON(key, value, { ex })
    }
    return jsonOperations.setJSON(key, value)
  },
  
  // Raw operations (for when you need string-only)
  getRaw: (key: string) => upstash.get(key),
  setRaw: (key: string, value: string, ex?: number) => {
    if (ex) {
      return upstash.set(key, value, { ex })
    }
    return upstash.set(key, value)
  },
  setex: (key: string, seconds: number, value: any) => 
    jsonOperations.setJSON(key, value, { ex: seconds }),
  del: (...keys: string[]) => upstash.del(...keys),
  keys: (pattern: string) => upstash.keys(pattern),
  exists: (...keys: string[]) => upstash.exists(...keys),
  expire: (key: string, seconds: number) => upstash.expire(key, seconds),
  ping: () => upstash.ping(),
  incr: (key: string) => upstash.incr(key),
  decr: (key: string) => upstash.decr(key),

  // Hash operations with JSON support
  hget: (key: string, field: string) => jsonOperations.hgetJSON(key, field),
  hset: (key: string, field: string | Record<string, any>, value?: any) => {
    if (typeof field === 'object') {
      return jsonOperations.hsetJSON(key, field)
    }
    return jsonOperations.hsetJSON(key, { [field]: value })
  },
  hdel: (key: string, ...fields: string[]) => upstash.hdel(key, ...fields),
  hgetall: (key: string) => jsonOperations.hgetallJSON(key),

  // List operations with JSON support
  lpush: (key: string, ...elements: any[]) => jsonOperations.lpushJSON(key, ...elements),
  rpop: (key: string) => jsonOperations.rpopJSON(key),
  llen: (key: string) => upstash.llen(key),

  // Set operations
  sadd: (key: string, ...members: any[]) => {
    const serialized = members.map(serializeValue)
    return upstash.sadd(key, ...serialized)
  },
  srem: (key: string, ...members: any[]) => {
    const serialized = members.map(serializeValue)
    return upstash.srem(key, ...serialized)
  },
  smembers: (key: string) => upstash.smembers(key),
  scard: (key: string) => upstash.scard(key),

  // Sorted set operations
  zadd: (key: string, score: number, member: any) => 
    upstash.zadd(key, { score, member: serializeValue(member) }),
  zrem: (key: string, ...members: any[]) => {
    const serialized = members.map(serializeValue)
    return upstash.zrem(key, ...serialized)
  },
  zrangebyscore: (key: string, min: number, max: number, options?: any) =>
    upstash.zrangebyscore(key, min, max, options),
  zcard: (key: string) => upstash.zcard(key),

  // TTL operations
  ttl: (key: string) => upstash.ttl(key),
  pttl: (key: string) => upstash.pttl(key),

  // Pub/Sub (limited in serverless, but maintained for compatibility)
  publish: (channel: string, message: string) => upstash.publish(channel, message),

  // Connection methods (no-op for serverless)
  on: (event: string, handler: Function) => {
    console.log(`Redis event ${event} registered (serverless mode)`)
  },
  connect: () => Promise.resolve(),
  disconnect: () => Promise.resolve(),
  quit: () => Promise.resolve(),
}

export default serverlessRedis