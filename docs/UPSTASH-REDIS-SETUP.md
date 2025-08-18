# Configuração Upstash Redis Serverless - TAREFA 2

Este documento detalha a configuração completa do Redis serverless usando Upstash para o projeto TrueCheckIA, incluindo migração do sistema tradicional Bull/Redis para arquitetura serverless.

## 📋 Índice

- [1. Visão Geral](#1-visão-geral)
- [2. Configuração Upstash](#2-configuração-upstash)
- [3. Variáveis de Ambiente](#3-variáveis-de-ambiente)
- [4. Arquitetura Current vs Serverless](#4-arquitetura-current-vs-serverless)
- [5. Cache System](#5-cache-system)
- [6. Queue System Migration](#6-queue-system-migration)
- [7. Rate Limiting](#7-rate-limiting)
- [8. Scripts de Migração](#8-scripts-de-migração)
- [9. Testes e Validação](#9-testes-e-validação)
- [10. Troubleshooting](#10-troubleshooting)

## 1. Visão Geral

### Sistema Atual (Traditional)
- **Redis**: ioredis + Docker local
- **Queues**: Bull.js com Redis backend
- **Cache**: Redis tradicional
- **Rate Limit**: express-rate-limit + Redis

### Sistema Serverless (Target)
- **Redis**: Upstash REST API
- **Queues**: Webhook-based + Vercel Cron
- **Cache**: Upstash Redis
- **Rate Limit**: Upstash Redis + custom middleware

## 2. Configuração Upstash

### 2.1 Criação da Conta e Database

```bash
# 1. Acesse https://upstash.com/
# 2. Crie uma conta gratuita
# 3. Crie uma nova database Redis:
#    - Name: truecheckia-prod (ou truecheckia-dev)
#    - Region: us-east-1 (mais próximo do Vercel)
#    - Type: Regional (melhor performance)
#    - Eviction: noeviction (para não perder dados críticos)
```

### 2.2 Configuração Recomendada

**Produção:**
```
Database Name: truecheckia-prod
Region: us-east-1
Type: Regional
Memory: 256MB (upgrade conforme necessário)
Max Connections: 1000
Eviction Policy: noeviction
```

**Development/Preview:**
```
Database Name: truecheckia-dev
Region: us-east-1
Type: Regional
Memory: 256MB
Max Connections: 100
Eviction Policy: noeviction
```

### 2.3 Configuração de Segurança

```bash
# Configurar TLS
REST TLS: Enabled
TCP TLS: Enabled

# IP Restrictions (opcional para produção)
# Adicionar IPs dos Vercel edge locations se necessário
```

## 3. Variáveis de Ambiente

### 3.1 Variáveis Obrigatórias

```bash
# Upstash Redis Configuration
UPSTASH_REDIS_REST_URL=https://your-redis-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token-here

# Serverless Queue Configuration
CRON_SECRET=your-cron-secret-for-scheduled-jobs
WEBHOOK_SECRET=your-webhook-secret-for-processing

# Force serverless mode
FORCE_SERVERLESS=true
NODE_ENV=production
```

### 3.2 Configuração por Ambiente

**Local Development (.env):**
```bash
# Use Redis local para desenvolvimento mais rápido
REDIS_URL=redis://localhost:6379
FORCE_SERVERLESS=false

# Ou teste com Upstash em desenvolvimento
UPSTASH_REDIS_REST_URL=https://dev-redis-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=dev-token
FORCE_SERVERLESS=true
```

**Vercel Production:**
```bash
UPSTASH_REDIS_REST_URL=https://prod-redis-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=prod-token
CRON_SECRET=ultra-secure-cron-secret
WEBHOOK_SECRET=ultra-secure-webhook-secret
NODE_ENV=production
```

**Vercel Preview:**
```bash
UPSTASH_REDIS_REST_URL=https://preview-redis-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=preview-token
CRON_SECRET=preview-cron-secret
WEBHOOK_SECRET=preview-webhook-secret
NODE_ENV=production
```

## 4. Arquitetura Current vs Serverless

### 4.1 Cache System

**Traditional (Current):**
```typescript
// ioredis
const redis = new Redis(process.env.REDIS_URL)
await redis.get('key')
await redis.set('key', value, 'EX', 3600)
```

**Serverless (Target):**
```typescript
// @upstash/redis
import { serverlessCache } from '@/lib/upstash'
await serverlessCache.get('key')
await serverlessCache.set('key', value, 3600)
```

### 4.2 Queue System

**Traditional (Current):**
```typescript
// Bull queues
import Queue from 'bull'
const analysisQueue = new Queue('analysis', process.env.REDIS_URL)
await analysisQueue.add('processText', { text })
```

**Serverless (Target):**
```typescript
// Webhook-based queues
import { serverlessQueue } from '@/lib/upstash'
await serverlessQueue.add('analysis', { text })
// Processado por webhook ou cron job
```

### 4.3 Rate Limiting

**Traditional (Current):**
```typescript
// express-rate-limit + Redis
app.use(rateLimit({
  store: new RedisStore({ client: redis }),
  max: 100,
  windowMs: 15 * 60 * 1000
}))
```

**Serverless (Target):**
```typescript
// Upstash-based rate limiting
import { rateLimiter } from '@/lib/upstash'
const result = await rateLimiter.checkLimit(userId, 100, 900)
if (!result.allowed) throw new RateLimitError()
```

## 5. Cache System

### 5.1 Implementação Atual

O sistema já possui adaptação serverless implementada em `/apps/api/src/lib/upstash.ts`:

```typescript
// Cache utilities compatíveis
export const serverlessCache = {
  async get(key: string): Promise<any | null>
  async set(key: string, value: any, ttl?: number): Promise<void>
  async del(key: string): Promise<void>
  async flush(pattern: string): Promise<void>
  async exists(key: string): Promise<boolean>
  async incr(key: string): Promise<number>
  async expire(key: string, seconds: number): Promise<void>
}
```

### 5.2 Padrões de Cache

```typescript
// User cache
const userKey = `user:${userId}`
await serverlessCache.set(userKey, userData, 3600) // 1 hour

// Analysis cache
const analysisKey = `analysis:${textHash}`
await serverlessCache.set(analysisKey, result, 86400) // 24 hours

// Rate limit cache
const rateLimitKey = `rate:${userId}:${endpoint}`
await serverlessCache.incr(rateLimitKey)
await serverlessCache.expire(rateLimitKey, 900) // 15 minutes
```

### 5.3 Cache Invalidation

```typescript
// Invalidate user data
await serverlessCache.del(`user:${userId}`)

// Invalidate pattern
await serverlessCache.flush('user:*')
await serverlessCache.flush('analysis:*')
```

## 6. Queue System Migration

### 6.1 Traditional Bull Queues

**Current Structure:**
```
/apps/api/src/queues/
├── index.ts              # Traditional Bull queues
├── analysis.queue.ts     # Bull analysis queue
├── email.queue.ts        # Bull email queue
└── credits.queue.ts      # Bull credits queue
```

### 6.2 Serverless Queue Implementation

**Target Structure:**
```
/apps/api/src/queues/
├── serverless-index.ts          # Serverless queue manager
├── serverless-analysis.queue.ts # Webhook-based analysis
├── serverless-email.queue.ts    # Webhook-based email
└── serverless-credits.queue.ts  # Cron-based credits
```

### 6.3 Queue Processing Strategies

**Immediate Processing (Webhooks):**
```typescript
// Analysis queue - immediate processing
export async function addAnalysisJob(data: any): Promise<string> {
  const jobId = await serverlessQueue.add('analysis', data)
  
  // Trigger immediate processing via webhook
  await fetch('/api/process/analysis', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.WEBHOOK_SECRET}` },
    body: JSON.stringify({ jobId })
  })
  
  return jobId
}
```

**Scheduled Processing (Cron Jobs):**
```typescript
// Credits queue - scheduled processing
// Vercel cron: 0 3 * * * (every day at 3 AM)
export async function resetMonthlyCredits(): Promise<void> {
  const jobs = await serverlessQueue.process('credits', async (job) => {
    // Reset user credits logic
  })
}
```

### 6.4 Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/process-queues",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/reset-credits",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/check-credits",
      "schedule": "0 10 * * *"
    }
  ]
}
```

## 7. Rate Limiting

### 7.1 Implementação Upstash

Já implementado em `/api/_middleware/rate-limit.ts`:

```typescript
// Upstash-based rate limiting
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export function createRateLimitMiddleware(maxRequests?: number, windowMs?: number) {
  return async (req: ExtendedVercelRequest, res: VercelResponse, next: () => void) => {
    const identifier = getClientIdentifier(req)
    const key = `rate_limit:${identifier}`
    
    const current = await redis.incr(key)
    
    if (current === 1) {
      await redis.expire(key, Math.ceil(windowMs / 1000))
    }
    
    if (current > maxRequests) {
      return res.status(429).json({ error: 'Rate limit exceeded' })
    }
    
    next()
  }
}
```

### 7.2 Rate Limit Configurations

```typescript
// Different rate limits for different endpoints
export const rateLimitConfigs = {
  auth: { max: 5, window: 15 * 60 * 1000 },      // 5 per 15 min
  analysis: { max: 30, window: 60 * 1000 },       // 30 per minute
  api: { max: 100, window: 60 * 1000 },           // 100 per minute
  general: { max: 100, window: 15 * 60 * 1000 }   // 100 per 15 min
}
```

## 8. Scripts de Migração e Teste

### 8.1 Setup Script

O script principal para configuração está em `/scripts/setup-upstash.sh`:

```bash
# Executar setup completo
./scripts/setup-upstash.sh

# O script verifica:
# ✅ Variáveis de ambiente
# ✅ Conectividade Upstash
# ✅ Sistema de filas
# ✅ Performance
# ✅ Configuração Vercel
```

### 8.2 Scripts de Teste Disponíveis

```bash
# Teste completo de conectividade
tsx scripts/test-upstash-connectivity.ts

# Teste de migração Redis
tsx scripts/test-redis-migration.ts

# Benchmark de performance
tsx scripts/benchmark-redis-performance.ts

# Validação do sistema
tsx scripts/validate-neon-setup.ts
```

### 8.3 Teste de Migração Completo

**Funcionalidades do teste de migração:**

```typescript
// scripts/test-redis-migration.ts

✅ Conectividade (Upstash + Traditional)
✅ Consistência de dados
✅ Rate limiting compatibility
✅ Padrões de cache
✅ Simulação de filas
✅ Comparação de performance
✅ Cenários de failover
```

**Exemplo de execução:**

```bash
# Teste completo de migração
tsx scripts/test-redis-migration.ts

# Saída esperada:
🚀 Starting Redis Migration Tests
✅ Upstash Connection (45.23ms)
✅ Traditional Redis Connection (12.45ms)
✅ Data Consistency
✅ Rate Limiting Compatibility
✅ Cache Pattern: User Cache (23.45ms)
✅ Performance Comparison
🎉 All migration tests passed! Ready for production.
```

### 8.4 Benchmark de Performance

**Funcionalidades do benchmark:**

```typescript
// scripts/benchmark-redis-performance.ts

📊 Operações testadas:
  • String operations (SET/GET/DEL)
  • Hash operations (HSET/HGETALL)
  • List operations (LPUSH/LLEN)
  • Rate limiting patterns
  • Operações concorrentes

📈 Métricas coletadas:
  • Latência média/min/max/P95
  • Throughput (ops/sec)
  • Taxa de erro
  • Comparação direta Traditional vs Upstash
```

**Configurações de teste:**

```bash
# Light Load (Small Data)
Operations: 50, Concurrency: 5, Data: ~1KB

# Medium Load (Medium Data) 
Operations: 25, Concurrency: 3, Data: ~10KB

# Heavy Load (Large Data)
Operations: 10, Concurrency: 2, Data: ~100KB
```

### 8.5 Migração de Dados

Script completo de migração disponível em `/scripts/migrate-redis-data.ts`:

```bash
# Executar migração de dados
tsx scripts/migrate-redis-data.ts

# Funcionalidades:
✅ Preserva TTL das chaves
✅ Migração em lotes
✅ Tratamento de erros
✅ Relatório detalhado
✅ Rollback em caso de falha
```

## 9. Testes e Validação

### 9.1 Suite Completa de Testes

**Teste de Conectividade Upstash** (`scripts/test-upstash-connectivity.ts`):

```bash
# Execução do teste completo
tsx scripts/test-upstash-connectivity.ts

# Testes incluídos:
✅ Conectividade básica (PING)
✅ Operações de string (SET/GET/DEL/EXISTS)
✅ Operações de hash (HSET/HGET/HGETALL/HDEL)
✅ Operações de lista (LPUSH/LLEN/RPOP)
✅ Operações de set (SADD/SCARD/SISMEMBER)
✅ Operações de sorted set (ZADD/ZCARD/ZRANGE)
✅ Operações de TTL (EXPIRE/TTL)
✅ Padrões de rate limiting
✅ Padrões de cache
✅ Simulação de filas
✅ Benchmark de performance
```

**Resultado esperado:**

```
🚀 Starting Upstash Redis Connectivity Tests
✅ Basic PING (142.34ms)
✅ String SET (89.12ms)
✅ String GET (45.67ms)
✅ Rate Limiting Logic
✅ Cache Pattern
✅ Queue Simulation

Overall Results: 25/25 tests passed (100.0%)
🎉 All tests passed! Upstash is ready for production.

Average operation time: 156.34ms
Good performance

Recommendations:
✅ Ready for production deployment
✅ Consider setting up monitoring
✅ Configure proper backup strategy
```

### 9.2 Testes de Performance e Benchmark

**Benchmark Detalhado** (`scripts/benchmark-redis-performance.ts`):

```bash
# Execução do benchmark completo
tsx scripts/benchmark-redis-performance.ts

# Configurações testadas:
📊 Light Load (Small Data): 50 ops, 5 concurrency, ~1KB data
📊 Medium Load (Medium Data): 25 ops, 3 concurrency, ~10KB data  
📊 Heavy Load (Large Data): 10 ops, 2 concurrency, ~100KB data

# Operações benchmarked:
🔄 STRING SET/GET
🔄 HASH SET/GETALL
🔄 LIST PUSH/LEN
🔄 Rate limiting patterns
🔄 Concurrent operations
```

**Exemplo de resultado:**

```
📊 REDIS PERFORMANCE BENCHMARK RESULTS

STRING SET:
  Upstash:     156.23ms avg, 640 ops/sec
               Min: 89.12ms, Max: 234.56ms, P95: 198.45ms
  Traditional: 23.45ms avg, 4264 ops/sec
               Min: 12.34ms, Max: 45.67ms, P95: 34.56ms
  Comparison:  Traditional is 6.66x faster
               Throughput ratio: 0.15x

STRING GET:
  Upstash:     89.34ms avg, 1119 ops/sec
  Traditional: 12.45ms avg, 8032 ops/sec
  Comparison:  Traditional is 7.18x faster

Recommendations:
✅ Upstash performance is good for most workloads
⚠️  Consider traditional Redis for high-throughput scenarios
```

### 9.3 Validação de Migração

**Teste de Migração Completo** (`scripts/test-redis-migration.ts`):

```bash
# Execução do teste de migração
tsx scripts/test-redis-migration.ts

# Validações incluídas:
🔍 Conectividade (Upstash + Traditional)
🔍 Consistência de dados
🔍 Compatibilidade de rate limiting
🔍 Padrões de cache do TrueCheckIA
🔍 Simulação de filas (analysis, email, credits)
🔍 Comparação de performance
🔍 Cenários de failover
🔍 Handling de dados grandes
🔍 Acesso concorrente
```

**Exemplo de saída:**

```
🚀 Starting Redis Migration Tests

✅ Upstash Connection (45.23ms)
✅ Traditional Redis Connection (12.45ms)
✅ Data Consistency
✅ Rate Limiting Compatibility
✅ Cache Pattern: User Cache (67.89ms)
✅ Cache Pattern: Analysis Cache (89.12ms)
✅ Cache Pattern: Session Cache (45.67ms)
✅ Queue Simulation: analysis (123.45ms)
✅ Queue Simulation: email (98.76ms)
✅ Queue Simulation: credits (67.89ms)
✅ Upstash Performance (2345.67ms)
✅ Traditional Redis Performance (456.78ms)
✅ Heavy Data Handling (234.56ms)
✅ Concurrent Access

Overall Results: 14/14 tests passed (100.0%)
🎉 All migration tests passed! Ready for production.

Performance Analysis:
  Upstash Performance: 156.78ms avg, 637 ops/sec
    vs Traditional: 6.78x slower
  Traditional Redis Performance: 23.12ms avg, 4327 ops/sec

Migration Recommendations:
✅ Migration validation successful
✅ All patterns working correctly
✅ Performance acceptable
✅ Ready for production deployment
```

## 10. Troubleshooting

### 10.1 Problemas Comuns

**Connection Timeout:**
```bash
# Verificar região do Upstash
# US East 1 é recomendado para Vercel

# Verificar firewall/proxy
curl -v https://your-redis-db.upstash.io
```

**Rate Limit Issues:**
```typescript
// Aumentar timeout para operações lentas
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  retry: {
    retries: 3,
    delay: 1000,
  },
})
```

**Memory Limits:**
```bash
# Monitorar uso de memória no Upstash dashboard
# Configurar eviction policy adequada
# Implementar TTL em todas as chaves
```

### 10.2 Debug e Monitoramento

```typescript
// Debug mode
if (process.env.DEBUG_UPSTASH) {
  console.log('Upstash operation:', operation, key, value)
}

// Performance monitoring
const start = performance.now()
const result = await upstash.get(key)
const duration = performance.now() - start
if (duration > 1000) {
  console.warn('Slow Upstash operation:', duration, 'ms')
}
```

### 10.3 Fallback Strategy

```typescript
// Fallback para Redis tradicional se Upstash falhar
export async function resilientCacheGet(key: string) {
  try {
    return await serverlessCache.get(key)
  } catch (error) {
    console.warn('Upstash failed, using traditional Redis:', error)
    return await traditionalRedis.get(key)
  }
}
```

## 📚 Recursos Adicionais

- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Rate Limiting Best Practices](https://upstash.com/blog/rate-limiting)
- [Redis Performance Optimization](https://redis.io/docs/management/optimization/)

## ✅ Checklist de Implementação

- [ ] Criar contas Upstash (prod/dev)
- [ ] Configurar databases Redis
- [ ] Adicionar variáveis de ambiente
- [ ] Testar conectividade
- [ ] Validar cache operations
- [ ] Testar rate limiting
- [ ] Configurar Vercel cron jobs
- [ ] Implementar queue webhooks
- [ ] Executar testes de performance
- [ ] Configurar monitoramento
- [ ] Documentar troubleshooting

---

*Documento criado para TAREFA 2 - Configuração do Redis Serverless usando Upstash*