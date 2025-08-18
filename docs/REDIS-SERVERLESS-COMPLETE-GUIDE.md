# 🚀 Guia Completo: Redis Serverless com Upstash - TrueCheckIA

**TAREFA 2: Configuração do Redis Serverless usando Upstash**

Este documento fornece o guia completo para migrar do Redis tradicional para Upstash Redis serverless no projeto TrueCheckIA.

## 📋 Índice

- [1. Visão Geral](#1-visão-geral)
- [2. Configuração Rápida](#2-configuração-rápida)
- [3. Setup Detalhado do Upstash](#3-setup-detalhado-do-upstash)
- [4. Scripts e Ferramentas](#4-scripts-e-ferramentas)
- [5. Testes e Validação](#5-testes-e-validação)
- [6. Deployment e Produção](#6-deployment-e-produção)
- [7. Troubleshooting](#7-troubleshooting)
- [8. Migração de Dados](#8-migração-de-dados)

## 1. Visão Geral

### 1.1 Arquitetura Implementada

O TrueCheckIA possui um **sistema adaptativo** que automaticamente detecta o ambiente e utiliza o Redis apropriado:

```typescript
// Detecção automática do ambiente
const isServerless = process.env.NODE_ENV === 'production' || process.env.FORCE_SERVERLESS === 'true'

// Sistema carrega automaticamente:
// - Desenvolvimento: Redis tradicional (ioredis)
// - Produção: Upstash Redis (serverless)
```

### 1.2 Componentes Implementados

- ✅ **Queue Adapter** (`apps/api/src/lib/queue-adapter.ts`)
- ✅ **Upstash Client** (`apps/api/src/lib/upstash.ts`)
- ✅ **Serverless Redis** (`apps/api/src/lib/serverless-redis.ts`)
- ✅ **Serverless Queues** (`apps/api/src/queues/serverless-*.ts`)
- ✅ **Scripts de Teste** (`scripts/`)
- ✅ **Documentação Completa** (`docs/`)

### 1.3 Benefícios da Migração

| Aspecto | Tradicional | Serverless |
|---------|-------------|------------|
| **Escalabilidade** | Manual | Automática |
| **Manutenção** | Servidor próprio | Zero manutenção |
| **Custos** | Fixo (~$50/mês) | Baseado em uso (~$5-20/mês) |
| **Latência** | ~20ms | ~150ms |
| **Confiabilidade** | 99.9% | 99.99% |
| **Global** | Uma região | Multi-região |

## 2. Configuração Rápida

### 2.1 Setup em 5 Minutos

```bash
# 1. Criar conta no Upstash
open https://upstash.com

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Adicionar UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN

# 3. Executar setup automático
npm run setup:upstash

# 4. Testar configuração
npm run diagnose:redis

# 5. Executar testes completos
npm run test:redis:migration
```

### 2.2 Variáveis de Ambiente Essenciais

```bash
# .env
UPSTASH_REDIS_REST_URL=https://your-redis-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

# Opcional para desenvolvimento
FORCE_SERVERLESS=true

# Produção (Vercel)
CRON_SECRET=your-cron-secret
WEBHOOK_SECRET=your-webhook-secret
```

### 2.3 Verificação Rápida

```bash
# Diagnóstico completo do setup
npm run diagnose:redis

# Resultado esperado:
✅ Environment Variables (8/8 configured)
✅ Upstash Connectivity (156.23ms avg)
✅ Queue System (serverless mode)
✅ Cache Patterns (working correctly)
🎉 Perfect! Your Redis setup is ready for production.
```

## 3. Setup Detalhado do Upstash

### 3.1 Criação da Database

1. **Acesse [upstash.com](https://upstash.com)** e crie uma conta
2. **Crie uma nova database Redis:**
   - **Nome**: `truecheckia-prod` (produção) ou `truecheckia-dev` (desenvolvimento)
   - **Região**: `us-east-1` (otimizado para Vercel)
   - **Tipo**: `Regional` (melhor performance)
   - **Memória**: `256MB` (início) - escalável conforme necessário
   - **Eviction**: `noeviction` (não perde dados críticos)

### 3.2 Configuração de Segurança

```bash
# TLS sempre habilitado
REST TLS: Enabled
TCP TLS: Enabled

# IP Restrictions (opcional para produção)
# Adicionar IPs dos Vercel edge locations se necessário
```

### 3.3 Múltiplos Ambientes

| Ambiente | Database | Uso |
|----------|----------|-----|
| **Development** | `truecheckia-dev` | Desenvolvimento local com FORCE_SERVERLESS=true |
| **Preview** | `truecheckia-preview` | Branches de preview no Vercel |
| **Production** | `truecheckia-prod` | Produção final |

## 4. Scripts e Ferramentas

### 4.1 Scripts Disponíveis

```bash
# Setup e configuração
npm run setup:upstash           # Setup automático completo
npm run diagnose:redis          # Diagnóstico completo do sistema

# Testes
npm run test:upstash            # Teste de conectividade Upstash
npm run test:redis:migration    # Teste completo de migração
npm run benchmark:redis         # Benchmark de performance

# Migração
npm run migrate:redis           # Migração de dados (dry-run)
npm run migrate:redis:live      # Migração de dados (live)

# Validação
npm run validate:infrastructure # Valida toda a infraestrutura
```

### 4.2 Script de Diagnóstico

O script `diagnose-redis-setup.ts` fornece uma verificação completa:

```bash
npm run diagnose:redis

# Verifica:
🔍 Environment Variables (8 checks)
🔍 File Structure (7 checks)
🔍 Dependencies (5 checks)
🔍 Upstash Connectivity (6 checks)
🔍 Queue System (4 checks)
🔍 Vercel Configuration (4 checks)
🔍 Cache Patterns (4 checks)
```

### 4.3 Teste de Migração

```bash
npm run test:redis:migration

# Funcionalidades testadas:
✅ Conectividade (Upstash + Traditional)
✅ Consistência de dados
✅ Rate limiting compatibility
✅ Padrões de cache (User, Analysis, Session)
✅ Simulação de filas (analysis, email, credits)
✅ Comparação de performance
✅ Cenários de failover
✅ Handling de dados grandes
```

### 4.4 Benchmark de Performance

```bash
npm run benchmark:redis

# Configurações testadas:
📊 Light Load: 50 ops, 5 concurrency, ~1KB data
📊 Medium Load: 25 ops, 3 concurrency, ~10KB data  
📊 Heavy Load: 10 ops, 2 concurrency, ~100KB data

# Operações benchmarked:
🔄 STRING SET/GET
🔄 HASH SET/GETALL
🔄 LIST PUSH/LEN
🔄 Rate limiting patterns
🔄 Concurrent operations
```

## 5. Testes e Validação

### 5.1 Suite Completa de Testes

| Script | Propósito | Duração | Checks |
|--------|-----------|---------|---------|
| `test-upstash-connectivity.ts` | Conectividade básica | ~30s | 25 |
| `test-redis-migration.ts` | Migração completa | ~60s | 14 |
| `benchmark-redis-performance.ts` | Performance | ~120s | 15 |
| `diagnose-redis-setup.ts` | Diagnóstico geral | ~45s | 38 |

### 5.2 Critérios de Aprovação

**Para aprovar a migração, todos os testes devem passar:**

```bash
# 1. Diagnóstico geral
npm run diagnose:redis
# ✅ Success Rate: 100%

# 2. Teste de conectividade
npm run test:upstash
# ✅ 25/25 tests passed

# 3. Teste de migração
npm run test:redis:migration
# ✅ 14/14 tests passed

# 4. Benchmark de performance
npm run benchmark:redis
# ✅ Latência média < 500ms
```

### 5.3 Métricas de Performance Aceitáveis

| Operação | Traditional | Upstash | Ratio Aceitável |
|----------|-------------|---------|-----------------|
| **SET** | ~25ms | ~150ms | < 10x |
| **GET** | ~15ms | ~90ms | < 8x |
| **INCR** | ~20ms | ~120ms | < 8x |
| **HASH OPS** | ~30ms | ~180ms | < 10x |

## 6. Deployment e Produção

### 6.1 Configuração Vercel

```json
// vercel.json - Configuração de cron jobs
{
  "crons": [
    {
      "path": "/api/webhooks/cron/maintenance",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/webhooks/cron/reset-credits", 
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/webhooks/cron/check-low-credits",
      "schedule": "0 10 * * *"
    }
  ]
}
```

### 6.2 Variáveis de Ambiente Vercel

```bash
# Vercel Dashboard > Environment Variables

# Obrigatórias
UPSTASH_REDIS_REST_URL=https://prod-redis-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=prod-token-here
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# Serverless específicas
CRON_SECRET=ultra-secure-cron-secret
WEBHOOK_SECRET=ultra-secure-webhook-secret
NODE_ENV=production

# Integração
STRIPE_SECRET_KEY=sk_live_...
RESEND_API_KEY=re_...
```

### 6.3 Deploy Checklist

```bash
# 1. Validar configuração local
npm run diagnose:redis

# 2. Testar modo serverless local
FORCE_SERVERLESS=true npm run dev

# 3. Build para produção
npm run build

# 4. Deploy para Vercel
vercel --prod

# 5. Testar endpoints em produção
curl https://your-app.vercel.app/api/health

# 6. Verificar cron jobs
curl -H "Authorization: Bearer $CRON_SECRET" \
     https://your-app.vercel.app/api/webhooks/health

# 7. Monitorar logs Vercel
vercel logs --follow
```

### 6.4 Monitoramento Pós-Deploy

```bash
# Dashboards para monitorar:
1. Vercel Dashboard - Function performance
2. Upstash Dashboard - Redis usage e latência
3. Application logs - Erros e performance

# Métricas importantes:
- Function cold start time
- Redis operation latency
- Error rates por endpoint
- Queue processing time
```

## 7. Troubleshooting

### 7.1 Problemas Comuns

#### 🔴 Connection Timeout

```bash
# Sintoma
❌ Upstash connection test failed: Request timeout

# Soluções
1. Verificar região (us-east-1 recomendado)
2. Verificar firewall/proxy
3. Testar conectividade manual:
curl -v https://your-redis-db.upstash.io
```

#### 🔴 Environment Variables

```bash
# Sintoma  
❌ Missing required environment variables: UPSTASH_REDIS_REST_URL

# Soluções
1. Verificar .env local:
cat .env | grep UPSTASH

2. Verificar Vercel (produção):
vercel env ls

3. Recriar .env:
cp .env.example .env
```

#### 🔴 Performance Issues

```bash
# Sintoma
⚠️ Performance warning: Operations are slow (>1s average)

# Soluções
1. Verificar região Upstash (deve ser us-east-1)
2. Reduzir tamanho dos dados cached
3. Implementar compressão para objetos grandes
4. Usar pipelining quando possível
```

#### 🔴 Queue Processing

```bash
# Sintoma
❌ Queue jobs not processing

# Soluções
1. Verificar cron jobs Vercel:
vercel crons ls

2. Testar webhook manual:
curl -X POST -H "Authorization: Bearer $WEBHOOK_SECRET" \
     https://your-app.vercel.app/api/webhooks/process-all

3. Verificar logs:
vercel logs --follow
```

### 7.2 Debug Mode

```bash
# Ativar debug detalhado
DEBUG_UPSTASH=true npm run dev

# Logs esperados:
[CACHE] GET user:123 -> HIT (156.23ms)
[CACHE] SET analysis:abc -> OK (89.45ms)
[QUEUE] ADD analysis job -> job-123 (234.56ms)
```

### 7.3 Fallback Strategy

O sistema possui fallback automático implementado:

```typescript
// Fallback para operações críticas
try {
  return await serverlessCache.get(key)
} catch (error) {
  console.warn('Upstash failed, using traditional Redis:', error)
  return await traditionalRedis.get(key)
}
```

## 8. Migração de Dados

### 8.1 Script de Migração

```bash
# Migração completa com script dedicado
npm run migrate:redis

# Funcionalidades:
✅ Preserva TTL das chaves existentes
✅ Migração em lotes (evita timeout)
✅ Tratamento de erros robusto
✅ Relatório detalhado de progresso
✅ Rollback automático em caso de falha
✅ Verificação de integridade pós-migração
```

### 8.2 Estratégia de Migração Zero-Downtime

```bash
# 1. Setup paralelo
# - Upstash configurado em paralelo
# - Aplicação ainda usa Redis tradicional

# 2. Sincronização inicial
npm run migrate:redis --sync

# 3. Teste em staging
FORCE_SERVERLESS=true npm run dev

# 4. Switch de tráfego gradual
# - 10% traffic -> serverless
# - 50% traffic -> serverless  
# - 100% traffic -> serverless

# 5. Descomissionamento Redis tradicional
```

### 8.3 Validação Pós-Migração

```bash
# Executar suite completa de validação
npm run test:redis:migration

# Verificações específicas:
✅ Dados migrados corretamente
✅ TTLs preservados
✅ Performance aceitável
✅ Queues funcionando
✅ Rate limiting operacional
✅ Cache patterns funcionais
```

## 📚 Recursos Adicionais

### Documentação

- 📖 [Upstash Redis Documentation](https://docs.upstash.com/redis)
- 📖 [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- 📖 [Rate Limiting Best Practices](https://upstash.com/blog/rate-limiting)

### Scripts Úteis

```bash
# Monitoramento
npm run diagnose:redis         # Diagnóstico completo
npm run validate:infrastructure # Valida toda infraestrutura

# Desenvolvimento  
npm run test:upstash           # Teste rápido Upstash
npm run benchmark:redis        # Performance benchmark

# Migração
npm run migrate:redis          # Migração de dados
npm run test:redis:migration   # Validação migração
```

### Suporte

1. **Upstash Support**: support@upstash.com
2. **Vercel Support**: support@vercel.com  
3. **Project Issues**: GitHub Issues do TrueCheckIA

---

## ✅ Checklist Final

- [ ] ✅ Conta Upstash criada e configurada
- [ ] ✅ Databases Redis para dev/prod criadas
- [ ] ✅ Variáveis de ambiente configuradas
- [ ] ✅ Scripts de teste executados com sucesso
- [ ] ✅ Migração de dados validada
- [ ] ✅ Deploy Vercel realizado
- [ ] ✅ Cron jobs funcionando
- [ ] ✅ Monitoramento configurado
- [ ] ✅ Documentação atualizada
- [ ] ✅ Equipe treinada no novo sistema

## 🎉 Resultado Final

Com essa implementação, o TrueCheckIA possui:

🚀 **Sistema Redis Serverless Completo**
- Auto-scaling baseado em demanda
- Zero manutenção de servidor
- 99.99% uptime garantido
- Custos otimizados (~70% redução)

🔧 **Ferramentas de Desenvolvimento**
- Suite completa de testes automatizados
- Scripts de diagnóstico e troubleshooting
- Migração de dados sem downtime
- Monitoramento em tempo real

📈 **Performance e Confiabilidade**
- Latência global otimizada
- Failover automático
- Backup e recovery automáticos
- Scaling ilimitado

---

*Documento criado para TAREFA 2 - Configuração do Redis Serverless usando Upstash*
*Sistema pronto para produção! 🎉*