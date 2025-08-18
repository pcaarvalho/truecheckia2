# Cache Adapter Implementation Guide - TAREFA 2

Este documento detalha como utilizar e otimizar o sistema de cache adaptativo que funciona tanto com Redis tradicional quanto com Upstash Redis serverless.

## 📋 Índice

- [1. Visão Geral do Sistema](#1-visão-geral-do-sistema)
- [2. Uso do Cache Adapter](#2-uso-do-cache-adapter)
- [3. Padrões de Cache](#3-padrões-de-cache)
- [4. Performance e Otimização](#4-performance-e-otimização)
- [5. Monitoramento](#5-monitoramento)
- [6. Troubleshooting](#6-troubleshooting)

## 1. Visão Geral do Sistema

### 1.1 Arquitetura Adaptativa

O sistema utiliza um adapter pattern que automaticamente detecta o ambiente e carrega o cliente Redis apropriado:

```typescript
// Detecção automática do ambiente
const isServerless = process.env.NODE_ENV === 'production' || process.env.FORCE_SERVERLESS === 'true'

// Carregamento dinâmico do adapter
if (isServerless) {
  // Usa Upstash Redis (@upstash/redis)
  const { serverlessCache } = await import('../lib/upstash')
  return serverlessCache
} else {
  // Usa Redis tradicional (ioredis)
  const { traditionalCache } = await import('../lib/redis')
  return traditionalCache
}
```

### 1.2 Interface Unificada

Ambos os sistemas implementam a mesma interface:

```typescript
interface CacheAdapter {
  get(key: string): Promise<any | null>
  set(key: string, value: any, ttl?: number): Promise<void>
  del(key: string): Promise<void>
  flush(pattern: string): Promise<void>
  exists(key: string): Promise<boolean>
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<void>
}
```

## 2. Uso do Cache Adapter

### 2.1 Importação e Inicialização

```typescript
import { RedisAdapter } from '@/lib/queue-adapter'

// Obter instância do cache (auto-detecta ambiente)
const cache = await RedisAdapter.getInstance()

// Usar métodos de cache
await cache.cacheSet('user:123', userData, 3600)
const user = await cache.cacheGet('user:123')
```

### 2.2 Exemplos Práticos

**Cache de Usuário:**
```typescript
import { RedisAdapter } from '@/lib/queue-adapter'

export class UserService {
  private cache = RedisAdapter

  async getUserById(userId: string) {
    const cacheKey = `user:${userId}`
    
    // Tentar cache primeiro
    let user = await this.cache.cacheGet(cacheKey)
    
    if (!user) {
      // Buscar no banco de dados
      user = await prisma.user.findUnique({ where: { id: userId } })
      
      if (user) {
        // Cachear por 1 hora
        await this.cache.cacheSet(cacheKey, user, 3600)
      }
    }
    
    return user
  }

  async updateUser(userId: string, data: any) {
    // Atualizar no banco
    const user = await prisma.user.update({
      where: { id: userId },
      data
    })
    
    // Invalidar cache
    await this.cache.cacheDel(`user:${userId}`)
    
    // Opcional: re-cachear imediatamente
    await this.cache.cacheSet(`user:${userId}`, user, 3600)
    
    return user
  }
}
```

**Cache de Análise:**
```typescript
export class AnalysisService {
  private cache = RedisAdapter

  async analyzeText(text: string, userId: string) {
    // Criar hash do texto para usar como chave
    const textHash = createHash('sha256').update(text).digest('hex')
    const cacheKey = `analysis:${textHash}`
    
    // Verificar cache
    let result = await this.cache.cacheGet(cacheKey)
    
    if (!result) {
      // Realizar análise
      result = await this.performAIAnalysis(text)
      
      // Cachear resultado por 24 horas
      await this.cache.cacheSet(cacheKey, result, 86400)
    }
    
    return result
  }
}
```

**Cache de Sessão:**
```typescript
export class SessionService {
  private cache = RedisAdapter

  async createSession(userId: string, sessionData: any) {
    const sessionId = generateId()
    const cacheKey = `session:${sessionId}`
    
    await this.cache.cacheSet(cacheKey, {
      userId,
      ...sessionData,
      createdAt: Date.now()
    }, 3600) // 1 hora
    
    return sessionId
  }

  async getSession(sessionId: string) {
    const cacheKey = `session:${sessionId}`
    return await this.cache.cacheGet(cacheKey)
  }

  async refreshSession(sessionId: string) {
    const cacheKey = `session:${sessionId}`
    await this.cache.cacheSet(cacheKey, await this.cache.cacheGet(cacheKey), 3600)
  }
}
```

## 3. Padrões de Cache

### 3.1 Cache-Aside Pattern

```typescript
async function getData(key: string) {
  // 1. Verificar cache
  let data = await cache.get(key)
  
  if (!data) {
    // 2. Buscar na fonte de dados
    data = await database.findById(key)
    
    if (data) {
      // 3. Armazenar no cache
      await cache.set(key, data, TTL)
    }
  }
  
  return data
}
```

### 3.2 Write-Through Pattern

```typescript
async function updateData(key: string, data: any) {
  // 1. Atualizar banco de dados
  await database.update(key, data)
  
  // 2. Atualizar cache
  await cache.set(key, data, TTL)
  
  return data
}
```

### 3.3 Write-Behind (Write-Back) Pattern

```typescript
async function updateDataAsync(key: string, data: any) {
  // 1. Atualizar cache imediatamente
  await cache.set(key, data, TTL)
  
  // 2. Agendar atualização do banco (via queue)
  await queue.add('updateDatabase', { key, data })
  
  return data
}
```

### 3.4 Cache Invalidation Patterns

**Tag-based Invalidation:**
```typescript
class TaggedCache {
  async setWithTags(key: string, value: any, tags: string[], ttl?: number) {
    await cache.set(key, value, ttl)
    
    // Associar chave às tags
    for (const tag of tags) {
      await cache.sadd(`tag:${tag}`, key)
    }
  }

  async invalidateTag(tag: string) {
    const keys = await cache.smembers(`tag:${tag}`)
    
    if (keys.length > 0) {
      await Promise.all([
        cache.del(...keys),
        cache.del(`tag:${tag}`)
      ])
    }
  }
}

// Uso
await taggedCache.setWithTags('user:123', userData, ['user', 'profile'], 3600)
await taggedCache.invalidateTag('user') // Invalida todos os caches de usuário
```

**Time-based Invalidation:**
```typescript
class TimeBasedCache {
  async setWithAutoExpiry(key: string, value: any, maxAge: number) {
    const expiryTime = Date.now() + maxAge * 1000
    
    await cache.set(key, {
      data: value,
      expiryTime
    })
  }

  async getWithTimeCheck(key: string) {
    const cached = await cache.get(key)
    
    if (cached && Date.now() > cached.expiryTime) {
      await cache.del(key)
      return null
    }
    
    return cached?.data
  }
}
```

## 4. Performance e Otimização

### 4.1 Batching Operations

```typescript
class BatchCache {
  async mget(keys: string[]): Promise<Record<string, any>> {
    if (isServerless) {
      // Upstash não tem MGET nativo, usar Promise.all
      const results = await Promise.all(
        keys.map(async key => ({ key, value: await cache.get(key) }))
      )
      return Object.fromEntries(
        results.filter(r => r.value !== null).map(r => [r.key, r.value])
      )
    } else {
      // Redis tradicional tem MGET nativo
      return await redis.mget(...keys)
    }
  }

  async mset(data: Record<string, any>, ttl?: number): Promise<void> {
    const operations = Object.entries(data).map(([key, value]) =>
      cache.set(key, value, ttl)
    )
    await Promise.all(operations)
  }
}
```

### 4.2 Connection Pooling (Traditional Redis)

```typescript
// lib/redis.ts
import { Redis } from 'ioredis'

const redisPool = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  // Connection pooling
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxLoadingTimeout: 1000,
  // Memory optimization
  compression: 'gzip',
  // Connection management
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000
})
```

### 4.3 Compression for Large Objects

```typescript
import { gzip, gunzip } from 'zlib'
import { promisify } from 'util'

const gzipAsync = promisify(gzip)
const gunzipAsync = promisify(gunzip)

class CompressedCache {
  async setCompressed(key: string, value: any, ttl?: number) {
    const serialized = JSON.stringify(value)
    
    // Comprimir se objeto for grande (>1KB)
    if (serialized.length > 1024) {
      const compressed = await gzipAsync(serialized)
      await cache.set(`${key}:compressed`, compressed.toString('base64'), ttl)
    } else {
      await cache.set(key, value, ttl)
    }
  }

  async getCompressed(key: string) {
    // Tentar versão comprimida primeiro
    const compressed = await cache.get(`${key}:compressed`)
    
    if (compressed) {
      const buffer = Buffer.from(compressed, 'base64')
      const decompressed = await gunzipAsync(buffer)
      return JSON.parse(decompressed.toString())
    }
    
    return await cache.get(key)
  }
}
```

### 4.4 Pipeline Operations (Traditional Redis)

```typescript
class PipelineCache {
  async bulkOperations(operations: Array<{type: string, key: string, value?: any, ttl?: number}>) {
    if (isServerless) {
      // Upstash: usar Promise.all para paralelismo
      await Promise.all(operations.map(op => {
        switch (op.type) {
          case 'set':
            return cache.set(op.key, op.value, op.ttl)
          case 'get':
            return cache.get(op.key)
          case 'del':
            return cache.del(op.key)
        }
      }))
    } else {
      // Redis tradicional: usar pipeline
      const pipeline = redis.pipeline()
      
      operations.forEach(op => {
        switch (op.type) {
          case 'set':
            if (op.ttl) {
              pipeline.setex(op.key, op.ttl, JSON.stringify(op.value))
            } else {
              pipeline.set(op.key, JSON.stringify(op.value))
            }
            break
          case 'get':
            pipeline.get(op.key)
            break
          case 'del':
            pipeline.del(op.key)
            break
        }
      })
      
      await pipeline.exec()
    }
  }
}
```

## 5. Monitoramento

### 5.1 Métricas de Cache

```typescript
class CacheMetrics {
  private metrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0
  }

  async get(key: string) {
    try {
      const value = await cache.get(key)
      
      if (value !== null) {
        this.metrics.hits++
      } else {
        this.metrics.misses++
      }
      
      return value
    } catch (error) {
      this.metrics.errors++
      throw error
    }
  }

  async set(key: string, value: any, ttl?: number) {
    try {
      await cache.set(key, value, ttl)
      this.metrics.sets++
    } catch (error) {
      this.metrics.errors++
      throw error
    }
  }

  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses
    return {
      ...this.metrics,
      hitRate: total > 0 ? (this.metrics.hits / total * 100).toFixed(2) + '%' : '0%'
    }
  }

  resetMetrics() {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key as keyof typeof this.metrics] = 0
    })
  }
}
```

### 5.2 Health Checks

```typescript
export async function cacheHealthCheck() {
  try {
    const testKey = 'health:check:' + Date.now()
    const testValue = { timestamp: Date.now() }
    
    // Test SET
    const setStart = performance.now()
    await cache.set(testKey, testValue, 60)
    const setTime = performance.now() - setStart
    
    // Test GET
    const getStart = performance.now()
    const retrieved = await cache.get(testKey)
    const getTime = performance.now() - getStart
    
    // Test DEL
    const delStart = performance.now()
    await cache.del(testKey)
    const delTime = performance.now() - delStart
    
    const isHealthy = retrieved && retrieved.timestamp === testValue.timestamp
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      performance: {
        set: `${setTime.toFixed(2)}ms`,
        get: `${getTime.toFixed(2)}ms`,
        del: `${delTime.toFixed(2)}ms`
      },
      provider: isServerless ? 'upstash' : 'redis',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      provider: isServerless ? 'upstash' : 'redis',
      timestamp: new Date().toISOString()
    }
  }
}
```

### 5.3 Alertas e Logging

```typescript
class CacheMonitor {
  private alertThresholds = {
    errorRate: 5, // 5% de erro
    responseTime: 1000, // 1 segundo
    hitRate: 80 // 80% hit rate mínimo
  }

  async monitorOperation(operation: string, fn: () => Promise<any>) {
    const start = performance.now()
    
    try {
      const result = await fn()
      const duration = performance.now() - start
      
      // Log slow operations
      if (duration > this.alertThresholds.responseTime) {
        console.warn(`Slow cache operation: ${operation} took ${duration.toFixed(2)}ms`)
      }
      
      return result
    } catch (error) {
      console.error(`Cache operation failed: ${operation}`, error)
      
      // Increment error metrics
      await this.incrementErrorCount(operation)
      
      throw error
    }
  }

  private async incrementErrorCount(operation: string) {
    const errorKey = `cache:errors:${operation}:${new Date().toISOString().split('T')[0]}`
    await cache.incr(errorKey)
    await cache.expire(errorKey, 86400) // Manter por 24h
  }
}
```

## 6. Troubleshooting

### 6.1 Problemas Comuns

**Connection Timeouts:**
```typescript
// Configuração resiliente
const resilientCache = {
  async get(key: string, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await cache.get(key)
      } catch (error) {
        if (attempt === maxRetries) throw error
        
        console.warn(`Cache GET retry ${attempt}/${maxRetries} for key: ${key}`)
        await new Promise(resolve => setTimeout(resolve, attempt * 1000))
      }
    }
  }
}
```

**Memory Issues:**
```typescript
// Monitoramento de memória
async function checkCacheMemory() {
  if (isServerless) {
    // Upstash: verificar via dashboard
    console.log('Check Upstash dashboard for memory usage')
  } else {
    // Redis tradicional: usar INFO
    const info = await redis.info('memory')
    const memoryUsage = info.match(/used_memory_human:(.+)/)?.[1]
    console.log('Redis memory usage:', memoryUsage)
  }
}
```

**Cache Stampede:**
```typescript
class AntiStampedeCache {
  private pending = new Map<string, Promise<any>>()

  async getWithLock(key: string, fetcher: () => Promise<any>, ttl: number = 3600) {
    // Verificar cache primeiro
    let value = await cache.get(key)
    if (value !== null) return value

    // Verificar se já existe operação em andamento
    if (this.pending.has(key)) {
      return await this.pending.get(key)
    }

    // Criar nova operação
    const promise = this.fetchAndCache(key, fetcher, ttl)
    this.pending.set(key, promise)

    try {
      value = await promise
      return value
    } finally {
      this.pending.delete(key)
    }
  }

  private async fetchAndCache(key: string, fetcher: () => Promise<any>, ttl: number) {
    const value = await fetcher()
    await cache.set(key, value, ttl)
    return value
  }
}
```

### 6.2 Debug Mode

```typescript
// Ativar modo debug
if (process.env.DEBUG_CACHE) {
  const originalGet = cache.get
  const originalSet = cache.set

  cache.get = async function(key: string) {
    console.log(`[CACHE] GET ${key}`)
    const start = performance.now()
    const result = await originalGet.call(this, key)
    const duration = performance.now() - start
    console.log(`[CACHE] GET ${key} -> ${result ? 'HIT' : 'MISS'} (${duration.toFixed(2)}ms)`)
    return result
  }

  cache.set = async function(key: string, value: any, ttl?: number) {
    console.log(`[CACHE] SET ${key} (TTL: ${ttl || 'none'})`)
    const start = performance.now()
    await originalSet.call(this, key, value, ttl)
    const duration = performance.now() - start
    console.log(`[CACHE] SET ${key} -> OK (${duration.toFixed(2)}ms)`)
  }
}
```

---

## ✅ Checklist de Implementação

- [ ] Configurar Redis Adapter nos services
- [ ] Implementar padrões de cache apropriados
- [ ] Configurar métricas e monitoramento
- [ ] Testar performance em ambos os ambientes
- [ ] Configurar alertas para problemas
- [ ] Documentar padrões de uso para a equipe
- [ ] Implementar estratégias de fallback
- [ ] Configurar debug mode para desenvolvimento

---

*Documento criado para TAREFA 2 - Configuração do Redis Serverless usando Upstash*