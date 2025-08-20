// Upstash Redis client for Vercel serverless functions
// Simple implementation that works without complex dependencies

interface RedisInterface {
  ping(): Promise<string>
  get(key: string): Promise<string | null>
  set(key: string, value: string, options?: { ex?: number; nx?: boolean; xx?: boolean }): Promise<string>
  del(...keys: string[]): Promise<number>
  exists(...keys: string[]): Promise<number>
  keys(pattern: string): Promise<string[]>
  zadd(key: string, scoreMembers: { score: number; member: string }): Promise<number>
  zrem(key: string, member: string): Promise<number>
  sadd(key: string, member: string): Promise<number>
  srem(key: string, member: string): Promise<number>
  smembers(key: string): Promise<string[]>
  scard(key: string): Promise<number>
  hincrby(key: string, field: string, increment: number): Promise<number>
  hgetall(key: string): Promise<Record<string, string>>
  hset(key: string, field: string | Record<string, string>, value?: string): Promise<number>
  expire(key: string, seconds: number): Promise<number>
  ttl(key: string): Promise<number>
  incr(key: string): Promise<number>
}

// Simple HTTP-based Redis client for Upstash
class UpstashRedis implements RedisInterface {
  private url: string
  private token: string

  constructor() {
    this.url = process.env.UPSTASH_REDIS_REST_URL!
    this.token = process.env.UPSTASH_REDIS_REST_TOKEN!
    
    if (!this.url || !this.token) {
      throw new Error('Missing Upstash Redis credentials: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required')
    }
  }

  private async execute(command: string[]): Promise<any> {
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
      })

      if (!response.ok) {
        throw new Error(`Redis command failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.result
    } catch (error) {
      console.error('Redis command error:', error)
      throw error
    }
  }

  async ping(): Promise<string> {
    return await this.execute(['PING'])
  }

  async get(key: string): Promise<string | null> {
    return await this.execute(['GET', key])
  }

  async set(key: string, value: string, options?: { ex?: number; nx?: boolean; xx?: boolean }): Promise<string> {
    const command = ['SET', key, value]
    
    if (options?.ex) {
      command.push('EX', options.ex.toString())
    }
    if (options?.nx) {
      command.push('NX')
    }
    if (options?.xx) {
      command.push('XX')
    }
    
    return await this.execute(command)
  }

  async del(...keys: string[]): Promise<number> {
    return await this.execute(['DEL', ...keys])
  }

  async exists(...keys: string[]): Promise<number> {
    return await this.execute(['EXISTS', ...keys])
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.execute(['KEYS', pattern])
  }

  async zadd(key: string, scoreMembers: { score: number; member: string }): Promise<number> {
    return await this.execute(['ZADD', key, scoreMembers.score.toString(), scoreMembers.member])
  }

  async zrem(key: string, member: string): Promise<number> {
    return await this.execute(['ZREM', key, member])
  }

  async sadd(key: string, member: string): Promise<number> {
    return await this.execute(['SADD', key, member])
  }

  async srem(key: string, member: string): Promise<number> {
    return await this.execute(['SREM', key, member])
  }

  async smembers(key: string): Promise<string[]> {
    return await this.execute(['SMEMBERS', key])
  }

  async scard(key: string): Promise<number> {
    return await this.execute(['SCARD', key])
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    return await this.execute(['HINCRBY', key, field, increment.toString()])
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const result = await this.execute(['HGETALL', key])
    const obj: Record<string, string> = {}
    for (let i = 0; i < result.length; i += 2) {
      obj[result[i]] = result[i + 1]
    }
    return obj
  }

  async hset(key: string, field: string | Record<string, string>, value?: string): Promise<number> {
    if (typeof field === 'string' && value !== undefined) {
      return await this.execute(['HSET', key, field, value])
    } else if (typeof field === 'object') {
      const args = ['HSET', key]
      for (const [k, v] of Object.entries(field)) {
        args.push(k, v)
      }
      return await this.execute(args)
    }
    throw new Error('Invalid arguments for HSET')
  }

  async expire(key: string, seconds: number): Promise<number> {
    return await this.execute(['EXPIRE', key, seconds.toString()])
  }

  async ttl(key: string): Promise<number> {
    return await this.execute(['TTL', key])
  }

  async incr(key: string): Promise<number> {
    return await this.execute(['INCR', key])
  }
}

// Create and export Upstash Redis instance
export const upstash = new UpstashRedis()

// Export for compatibility
export { UpstashRedis }
export default upstash