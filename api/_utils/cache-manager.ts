import { upstash, serverlessCache } from '../../apps/api/src/lib/upstash'

/**
 * Advanced Cache Manager for Serverless Environment
 * Provides enhanced caching with tags, priorities, and intelligent cleanup
 */

export interface CacheOptions {
  ttl?: number // Time to live in seconds
  priority?: 'low' | 'normal' | 'high' | 'critical'
  tags?: string[]
  metadata?: Record<string, any>
}

export interface CacheEntry {
  key: string
  value: any
  ttl: number
  priority: string
  tags: string[]
  metadata: Record<string, any>
  createdAt: number
  accessCount: number
  lastAccess: number
}

export class CacheManager {
  private static readonly CACHE_PREFIX = 'cache'
  private static readonly INDEX_PREFIX = 'cache-index'
  private static readonly TAGS_PREFIX = 'cache-tags'
  private static readonly STATS_PREFIX = 'cache-stats'

  /**
   * Set cache entry with advanced options
   */
  static async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    const {
      ttl = 3600, // Default 1 hour
      priority = 'normal',
      tags = [],
      metadata = {}
    } = options

    const entry: CacheEntry = {
      key,
      value,
      ttl,
      priority,
      tags,
      metadata,
      createdAt: Date.now(),
      accessCount: 0,
      lastAccess: Date.now()
    }

    try {
      const cacheKey = `${this.CACHE_PREFIX}:${key}`
      
      // Store the entry
      await upstash.set(cacheKey, JSON.stringify(entry), { ex: ttl })

      // Update indexes
      await Promise.all([
        // Add to priority index
        upstash.zadd(`${this.INDEX_PREFIX}:priority:${priority}`, {
          score: Date.now(),
          member: key
        }),

        // Add to tags indexes
        ...tags.map(tag => 
          upstash.sadd(`${this.TAGS_PREFIX}:${tag}`, key)
        ),

        // Update stats
        upstash.hincrby(`${this.STATS_PREFIX}:operations`, 'sets', 1),
        upstash.hincrby(`${this.STATS_PREFIX}:size`, priority, 1)
      ])

      // Set expiration for indexes
      await Promise.all([
        upstash.expire(`${this.INDEX_PREFIX}:priority:${priority}`, ttl + 60),
        ...tags.map(tag => 
          upstash.expire(`${this.TAGS_PREFIX}:${tag}`, ttl + 60)
        )
      ])

    } catch (error) {
      console.error('Cache set failed:', error)
      throw error
    }
  }

  /**
   * Get cache entry with access tracking
   */
  static async get(key: string): Promise<any> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}:${key}`
      const data = await upstash.get(cacheKey)
      
      if (!data) {
        await upstash.hincrby(`${this.STATS_PREFIX}:operations`, 'misses', 1)
        return null
      }

      const entry: CacheEntry = JSON.parse(data as string)
      
      // Update access statistics
      entry.accessCount++
      entry.lastAccess = Date.now()
      
      // Update cache entry with new stats (without extending TTL)
      await upstash.set(cacheKey, JSON.stringify(entry), { xx: true })
      
      // Update stats
      await upstash.hincrby(`${this.STATS_PREFIX}:operations`, 'hits', 1)
      
      return entry.value

    } catch (error) {
      console.error('Cache get failed:', error)
      await upstash.hincrby(`${this.STATS_PREFIX}:operations`, 'errors', 1)
      return null
    }
  }

  /**
   * Delete cache entry and cleanup indexes
   */
  static async delete(key: string): Promise<boolean> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}:${key}`
      
      // Get entry to cleanup indexes
      const data = await upstash.get(cacheKey)
      if (data) {
        const entry: CacheEntry = JSON.parse(data as string)
        
        // Cleanup indexes
        await Promise.all([
          // Remove from priority index
          upstash.zrem(`${this.INDEX_PREFIX}:priority:${entry.priority}`, key),
          
          // Remove from tags indexes
          ...entry.tags.map(tag => 
            upstash.srem(`${this.TAGS_PREFIX}:${tag}`, key)
          )
        ])
      }

      // Delete the entry
      const deleted = await upstash.del(cacheKey)
      
      // Update stats
      if (deleted > 0) {
        await upstash.hincrby(`${this.STATS_PREFIX}:operations`, 'deletes', 1)
      }
      
      return deleted > 0

    } catch (error) {
      console.error('Cache delete failed:', error)
      return false
    }
  }

  /**
   * Check if cache entry exists
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}:${key}`
      return (await upstash.exists(cacheKey)) > 0
    } catch (error) {
      console.error('Cache exists check failed:', error)
      return false
    }
  }

  /**
   * Get entries by tags
   */
  static async getByTags(tags: string[]): Promise<Array<{ key: string; value: any }>> {
    try {
      const entries: Array<{ key: string; value: any }> = []
      
      for (const tag of tags) {
        const keys = await upstash.smembers(`${this.TAGS_PREFIX}:${tag}`)
        
        for (const key of keys) {
          const value = await this.get(key)
          if (value !== null) {
            entries.push({ key, value })
          }
        }
      }
      
      // Remove duplicates
      const uniqueEntries = entries.filter((entry, index, self) => 
        index === self.findIndex(e => e.key === entry.key)
      )
      
      return uniqueEntries

    } catch (error) {
      console.error('Get by tags failed:', error)
      return []
    }
  }

  /**
   * Clear entries by pattern
   */
  static async clear(pattern: string = '*'): Promise<number> {
    try {
      const keys = await upstash.keys(`${this.CACHE_PREFIX}:${pattern}`)
      
      if (keys.length === 0) {
        return 0
      }

      // Get entries to cleanup indexes
      const entries = await Promise.all(
        keys.map(async (key) => {
          const data = await upstash.get(key)
          return data ? JSON.parse(data as string) : null
        })
      )

      // Delete cache entries
      const deleted = await upstash.del(...keys)

      // Cleanup indexes for deleted entries
      const cleanupPromises: Promise<any>[] = []
      
      entries.forEach(entry => {
        if (entry) {
          const cacheKey = entry.key
          
          // Remove from priority index
          cleanupPromises.push(
            upstash.zrem(`${this.INDEX_PREFIX}:priority:${entry.priority}`, cacheKey)
          )
          
          // Remove from tags indexes
          entry.tags.forEach((tag: string) => {
            cleanupPromises.push(
              upstash.srem(`${this.TAGS_PREFIX}:${tag}`, cacheKey)
            )
          })
        }
      })

      await Promise.all(cleanupPromises)
      
      // Update stats
      await upstash.hincrby(`${this.STATS_PREFIX}:operations`, 'bulk_deletes', deleted)
      
      return deleted

    } catch (error) {
      console.error('Cache clear failed:', error)
      return 0
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{
    operations: Record<string, number>
    size: Record<string, number>
    hitRate: number
    memoryUsage: any
  }> {
    try {
      const [operations, size] = await Promise.all([
        upstash.hgetall(`${this.STATS_PREFIX}:operations`),
        upstash.hgetall(`${this.STATS_PREFIX}:size`)
      ])

      const hits = parseInt(operations.hits || '0')
      const misses = parseInt(operations.misses || '0')
      const total = hits + misses
      const hitRate = total > 0 ? hits / total : 0

      return {
        operations: Object.fromEntries(
          Object.entries(operations).map(([key, value]) => [key, parseInt(value as string) || 0])
        ),
        size: Object.fromEntries(
          Object.entries(size).map(([key, value]) => [key, parseInt(value as string) || 0])
        ),
        hitRate,
        memoryUsage: await this.getMemoryUsage()
      }

    } catch (error) {
      console.error('Get cache stats failed:', error)
      return {
        operations: {},
        size: {},
        hitRate: 0,
        memoryUsage: null
      }
    }
  }

  /**
   * Get memory usage information
   */
  private static async getMemoryUsage(): Promise<any> {
    try {
      // Get sample of cache keys to estimate size
      const keys = await upstash.keys(`${this.CACHE_PREFIX}:*`)
      const sampleSize = Math.min(keys.length, 100)
      const sampleKeys = keys.slice(0, sampleSize)
      
      let totalSize = 0
      for (const key of sampleKeys) {
        const data = await upstash.get(key)
        if (data) {
          totalSize += JSON.stringify(data).length
        }
      }

      const averageSize = sampleKeys.length > 0 ? totalSize / sampleKeys.length : 0
      const estimatedTotal = averageSize * keys.length

      return {
        totalKeys: keys.length,
        sampleSize,
        averageEntrySize: averageSize,
        estimatedTotalSize: estimatedTotal,
        unit: 'bytes'
      }

    } catch (error) {
      console.error('Get memory usage failed:', error)
      return null
    }
  }

  /**
   * Cleanup expired entries and optimize cache
   */
  static async cleanup(): Promise<{
    expired: number
    optimized: number
    errors: number
  }> {
    const results = { expired: 0, optimized: 0, errors: 0 }

    try {
      console.log('Starting cache cleanup...')

      // Get all cache keys
      const keys = await upstash.keys(`${this.CACHE_PREFIX}:*`)
      
      for (const key of keys) {
        try {
          const data = await upstash.get(key)
          if (!data) {
            // Key expired or deleted, cleanup indexes
            const cacheKey = key.replace(`${this.CACHE_PREFIX}:`, '')
            await this.cleanupIndexes(cacheKey)
            results.expired++
          }
        } catch (error) {
          console.error(`Error processing key ${key}:`, error)
          results.errors++
        }
      }

      // Cleanup empty tag indexes
      const tagKeys = await upstash.keys(`${this.TAGS_PREFIX}:*`)
      for (const tagKey of tagKeys) {
        try {
          const size = await upstash.scard(tagKey)
          if (size === 0) {
            await upstash.del(tagKey)
            results.optimized++
          }
        } catch (error) {
          console.error(`Error cleaning tag index ${tagKey}:`, error)
          results.errors++
        }
      }

      console.log(`Cache cleanup completed: ${JSON.stringify(results)}`)
      
      // Update cleanup stats
      await upstash.hset(`${this.STATS_PREFIX}:cleanup`, {
        lastRun: Date.now().toString(),
        expired: results.expired.toString(),
        optimized: results.optimized.toString(),
        errors: results.errors.toString()
      })

    } catch (error) {
      console.error('Cache cleanup failed:', error)
      results.errors++
    }

    return results
  }

  /**
   * Cleanup indexes for a cache key
   */
  private static async cleanupIndexes(cacheKey: string): Promise<void> {
    try {
      // Get all priority indexes
      const priorities = ['low', 'normal', 'high', 'critical']
      const cleanupPromises = priorities.map(priority => 
        upstash.zrem(`${this.INDEX_PREFIX}:priority:${priority}`, cacheKey)
      )

      // Get all tag indexes and remove key
      const tagKeys = await upstash.keys(`${this.TAGS_PREFIX}:*`)
      tagKeys.forEach(tagKey => {
        cleanupPromises.push(upstash.srem(tagKey, cacheKey))
      })

      await Promise.all(cleanupPromises)
    } catch (error) {
      console.error('Cleanup indexes failed:', error)
    }
  }
}

// Export singleton instance
export const cacheManager = CacheManager