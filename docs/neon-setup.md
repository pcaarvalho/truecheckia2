# Neon PostgreSQL Setup Guide for TrueCheckIA

Este guia documenta o processo completo de configuração do Neon PostgreSQL para o projeto TrueCheckIA, otimizado para deploy serverless no Vercel.

## 📋 Visão Geral

O TrueCheckIA utiliza Neon PostgreSQL como banco de dados principal com as seguintes características:
- **Connection Pooling** otimizado para serverless
- **Múltiplas branches** para desenvolvimento e produção
- **Auto-scaling** baseado em demanda
- **Backup automático** e point-in-time recovery

## 🚀 Passo 1: Criação da Conta Neon

### 1.1 Registro
1. Acesse [neon.tech](https://neon.tech)
2. Clique em "Sign Up"
3. Use sua conta GitHub/Google para integração simplificada
4. Confirme o email de verificação

### 1.2 Plano Recomendado
Para produção do TrueCheckIA:
- **Plan**: Pro ($20/mês)
- **Compute**: 1 vCPU, 4 GB RAM (auto-scaling até 4 vCPU)
- **Storage**: 10 GB iniciais (expansível até 200 GB)
- **Connections**: Até 1000 conexões simultâneas

## 🏗️ Passo 2: Configuração do Projeto

### 2.1 Criar Projeto
```bash
# Na dashboard do Neon
Nome do Projeto: truecheckia-production
Região: us-east-1 (Oregon) - Otimizada para Vercel
PostgreSQL Version: 16
```

### 2.2 Configurar Branches
O Neon permite múltiplas branches do banco:

**Branch Main (Produção)**
- Nome: `main`
- Auto-scaling: Enabled
- Compute: 1-4 vCPU auto-scale
- Backup: Daily + Point-in-time recovery

**Branch Preview (Development/Staging)**
- Nome: `preview`
- Parent: `main`
- Compute: 0.25 vCPU (fixed)
- Backup: Weekly

### 2.3 Comando para criação de branches
```bash
# Via Neon CLI (opcional)
neonctl branches create --name=preview --parent=main
```

## ⚙️ Passo 3: Connection Pooling

### 3.1 Configuração Otimizada
```bash
Pool Mode: Transaction
Pool Size: 25 conexões
Pool Timeout: 30 segundos
Max Client Connections: 100
```

### 3.2 Configurações por Ambiente

**Produção (Vercel Serverless)**
```env
# Connection pooling habilitado
Pool Mode: Transaction
Max Connections: 25
Idle Timeout: 600s
```

**Desenvolvimento (Local)**
```env
# Connection pooling reduzido
Pool Mode: Session
Max Connections: 10
Idle Timeout: 300s
```

## 🔐 Passo 4: Connection Strings

### 4.1 Tipos de Connection String

O Neon fornece 3 tipos de connection strings:

#### DATABASE_URL (Pooled - Para aplicação)
```env
DATABASE_URL="postgresql://username:password@ep-xxxx-pooler.us-east-1.postgres.neon.tech:5432/neondb?sslmode=require&pgbouncer=true&connect_timeout=10"
```

#### DIRECT_URL (Direct - Para migrações)
```env
DIRECT_URL="postgresql://username:password@ep-xxxx.us-east-1.postgres.neon.tech:5432/neondb?sslmode=require&connect_timeout=10"
```

#### SHADOW_DATABASE_URL (Para Prisma migrations)
```env
SHADOW_DATABASE_URL="postgresql://username:password@ep-xxxx-pooler.us-east-1.postgres.neon.tech:5432/shadowdb?sslmode=require&pgbouncer=true"
```

### 4.2 Configuração no Prisma Schema

O schema já está configurado para usar as 3 URLs:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
  extensions = ["pg_stat_statements"]
}
```

## 🧪 Passo 5: Testes de Conectividade

### 5.1 Script de Teste Automático
```bash
# Executar teste de conectividade
npm run test:neon

# Ou diretamente
tsx scripts/test-neon-connectivity.ts
```

### 5.2 Teste Manual Básico
```bash
# Teste usando psql
psql "postgresql://username:password@ep-xxxx.us-east-1.postgres.neon.tech:5432/neondb?sslmode=require"

# Dentro do psql, executar:
SELECT version();
SELECT current_database();
\conninfo
```

### 5.3 Teste de Performance
```sql
-- Teste de latência
SELECT 
  NOW() as timestamp,
  'health_check' as test,
  pg_postmaster_start_time() as server_start;

-- Teste de conexões ativas
SELECT 
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active_connections
FROM pg_stat_activity 
WHERE datname = current_database();
```

## 📊 Passo 6: Monitoramento e Alertas

### 6.1 Métricas Importantes
- **Latência de conexão**: < 100ms ideal
- **Conexões ativas**: < 80% do pool
- **CPU usage**: < 70% sustentado
- **Memory usage**: < 85%
- **Storage growth**: Monitorar tendência

### 6.2 Alertas Neon
Configure alertas na dashboard para:
- CPU > 80% por 5 minutos
- Conexões > 90% do limite
- Storage > 80% da cota
- Erro rate > 1%

### 6.3 Health Check Endpoint
```typescript
// Health check integrado no projeto
import { checkDatabaseHealth } from '@/packages/database/src/health'

app.get('/health/database', async (req, res) => {
  const health = await checkDatabaseHealth()
  res.status(health.status === 'healthy' ? 200 : 503).json(health)
})
```

## 🔧 Passo 7: Configuração por Ambiente

### 7.1 Ambiente de Desenvolvimento
```env
# .env.local
DATABASE_URL="postgresql://user:pass@ep-dev-pooler.us-east-1.postgres.neon.tech:5432/devdb?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://user:pass@ep-dev.us-east-1.postgres.neon.tech:5432/devdb?sslmode=require"
SHADOW_DATABASE_URL="postgresql://user:pass@ep-dev-pooler.us-east-1.postgres.neon.tech:5432/shadow_dev?sslmode=require&pgbouncer=true"
```

### 7.2 Ambiente de Produção
```env
# Vercel Environment Variables
DATABASE_URL="postgresql://user:pass@ep-prod-pooler.us-east-1.postgres.neon.tech:5432/proddb?sslmode=require&pgbouncer=true&connect_timeout=10"
DIRECT_URL="postgresql://user:pass@ep-prod.us-east-1.postgres.neon.tech:5432/proddb?sslmode=require&connect_timeout=10"
SHADOW_DATABASE_URL="postgresql://user:pass@ep-prod-pooler.us-east-1.postgres.neon.tech:5432/shadow_prod?sslmode=require&pgbouncer=true"
```

## 🚀 Passo 8: Deploy e Migrações

### 8.1 Primeira Migration
```bash
# Aplicar schema inicial
npm run db:push

# Ou fazer migration completa
npm run db:migrate

# Seed de dados iniciais
npm run db:seed
```

### 8.2 Migration Strategy para Produção
```bash
# 1. Backup automático (Neon faz isso)
# 2. Test em branch preview
neonctl branches create --name=migration-test --parent=main

# 3. Apply migration em preview
DATABASE_URL="preview_url" npm run db:migrate

# 4. Test da aplicação
npm run test:neon

# 5. Apply em produção
npm run db:migrate

# 6. Cleanup preview branch
neonctl branches delete migration-test
```

## 📋 Checklist de Validação Pós-Setup

### ✅ Conectividade
- [ ] DATABASE_URL conecta com sucesso
- [ ] DIRECT_URL conecta com sucesso  
- [ ] SHADOW_DATABASE_URL configurada (se usando)
- [ ] Latência < 200ms
- [ ] Pool connections funcionando

### ✅ Schema e Dados
- [ ] Schema aplicado corretamente
- [ ] Indices criados
- [ ] Seed data carregado
- [ ] Extensões habilitadas (pg_stat_statements)

### ✅ Performance
- [ ] Connection pooling otimizado
- [ ] Queries principais < 100ms
- [ ] No connection leaks
- [ ] Auto-scaling configurado

### ✅ Monitoramento
- [ ] Health checks funcionando
- [ ] Alertas configurados
- [ ] Logs estruturados
- [ ] Métricas de performance

### ✅ Segurança
- [ ] SSL habilitado
- [ ] Credenciais seguras
- [ ] IP allowlist (se necessário)
- [ ] Backup configurado

## 🛠️ Comandos Úteis

### Teste de Conectividade
```bash
# Teste completo
npm run test:neon

# Teste manual
tsx scripts/test-neon-connectivity.ts
```

### Database Operations
```bash
# Conectar ao banco
psql $DATABASE_URL

# Ver estatísticas
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE datname = current_database();"

# Ver tamanho do banco
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size(current_database()));"
```

### Monitoramento
```bash
# Health check via API
curl https://api.truecheckia.com/health/database

# Métricas de performance
curl https://api.truecheckia.com/health/performance
```

## 🚨 Troubleshooting

### Connection Timeouts
```bash
# Verificar connection string
echo $DATABASE_URL | grep -o "connect_timeout=[0-9]*"

# Aumentar timeout se necessário
DATABASE_URL="${DATABASE_URL}&connect_timeout=30"
```

### Pool Exhaustion
```sql
-- Ver conexões ativas
SELECT count(*), state FROM pg_stat_activity 
WHERE datname = current_database() 
GROUP BY state;

-- Matar conexões idle antigas
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
AND state_change < NOW() - INTERVAL '10 minutes';
```

### High Latency
1. Verificar região do Neon vs Vercel
2. Testar DIRECT_URL vs DATABASE_URL
3. Otimizar queries lentas
4. Verificar índices

### Migration Failures
```bash
# Reset para último estado conhecido
npm run db:push --accept-data-loss

# Ou fazer rollback manual
psql $DIRECT_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npm run db:push
```

## 📚 Recursos Adicionais

- [Neon Documentation](https://neon.tech/docs)
- [Prisma with Neon](https://www.prisma.io/docs/guides/database/neon)
- [Vercel + Neon Guide](https://vercel.com/guides/nextjs-prisma-neon)
- [Connection Pooling Best Practices](https://neon.tech/docs/connect/connection-pooling)

## 🎯 Próximas Etapas

Após completar este setup:
1. **TASK 1.2**: Configurar Upstash Redis
2. **TASK 1.3**: Setup Vercel deployment
3. **TASK 1.4**: Configure monitoring completo
4. **TASK 1.5**: Otimizações de performance