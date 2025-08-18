# TrueCheckIA - Configuração do Neon PostgreSQL

## Overview

Este documento detalha a configuração completa do Neon PostgreSQL para o projeto TrueCheckIA, incluindo ambientes de Production e Preview, connection pooling, migrations e práticas de segurança.

## Estrutura do Banco de Dados

O projeto utiliza Prisma ORM com PostgreSQL e possui as seguintes características:

### Modelos Principais
- **User**: Usuários com sistema de planos e créditos
- **Analysis**: Análises de IA com cache e métricas
- **Subscription**: Integrações Stripe para pagamentos
- **ApiUsage**: Monitoramento de uso da API
- **Notification**: Sistema de notificações
- **CachedAnalysis**: Cache de análises para performance

### Modelos de Monitoramento
- **QueryPerformance**: Métricas de performance de queries
- **SystemHealth**: Status de saúde dos serviços
- **DatabaseMetrics**: Métricas específicas do banco
- **AnalyticsEvent**: Eventos analíticos particionados

## 1. Configuração Inicial no Neon

### 1.1 Criação da Conta e Projetos

1. Acesse [Neon.tech](https://neon.tech) e crie uma conta
2. Crie um novo projeto chamado `truecheckia-production`
3. Configure a região próxima aos usuários (ex: US East para América)

### 1.2 Configuração de Branches

#### Branch Principal (Production)
```bash
# Neon automaticamente cria a branch 'main' para produção
Branch: main
Name: production
Database: truecheckia_prod
```

#### Branch de Preview
```bash
# Criar branch para preview/desenvolvimento
Branch: preview
Name: preview-env
Database: truecheckia_preview
```

### 1.3 Connection Strings

#### Production
```bash
# Connection String (com pooling)
DATABASE_URL="postgresql://username:password@ep-xxx-pooler.region.aws.neon.tech/truecheckia_prod?sslmode=require&pgbouncer=true"

# Direct Connection (para migrations)
DIRECT_URL="postgresql://username:password@ep-xxx.region.aws.neon.tech/truecheckia_prod?sslmode=require"

# Shadow Database (para migrations)
SHADOW_DATABASE_URL="postgresql://username:password@ep-xxx-pooler.region.aws.neon.tech/truecheckia_shadow?sslmode=require&pgbouncer=true"
```

#### Preview/Development
```bash
# Connection String (com pooling)
PREVIEW_DATABASE_URL="postgresql://username:password@ep-xxx-pooler.region.aws.neon.tech/truecheckia_preview?sslmode=require&pgbouncer=true"

# Direct Connection (para migrations)
PREVIEW_DIRECT_URL="postgresql://username:password@ep-xxx.region.aws.neon.tech/truecheckia_preview?sslmode=require"
```

## 2. Configuração do Connection Pooling

### 2.1 Configuração do PgBouncer no Neon

O Neon utiliza PgBouncer integrado. Configure as seguintes configurações:

```bash
# Configurações recomendadas no Neon Dashboard
Pool Mode: Transaction
Pool Size: 25 (ajustar conforme necessário)
Max Client Connections: 100
Default Pool Size: 20
```

### 2.2 Configuração no Prisma

O schema já está configurado para usar connection pooling:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")        # URL com pooling
  directUrl = env("DIRECT_URL")         # URL direta para migrations
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL") # Para migrations
}
```

### 2.3 Configuração do Cliente Prisma

Para otimizar conexões em ambiente serverless:

```typescript
// packages/database/src/index.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

## 3. Scripts de Migration

### 3.1 Script de Setup para Production

```bash
#!/bin/bash
# scripts/setup-neon-production.sh

set -e

echo "🚀 Configurando Neon PostgreSQL para Produção"
echo "============================================="

# Verificar variáveis de ambiente
if [ -z "$DATABASE_URL" ] || [ -z "$DIRECT_URL" ]; then
    echo "❌ ERROR: DATABASE_URL e DIRECT_URL são obrigatórias"
    exit 1
fi

# Navegar para o diretório do banco
cd packages/database

# Gerar cliente Prisma
echo "🔧 Gerando cliente Prisma..."
npm run db:generate

# Executar migrations
echo "🗄️  Executando migrations..."
npx prisma migrate deploy

# Verificar conexão
echo "🧪 Verificando conexão..."
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verify() {
  try {
    await prisma.\$connect();
    console.log('✅ Conexão com Neon estabelecida com sucesso');
    await prisma.\$disconnect();
  } catch (error) {
    console.error('❌ Erro na conexão:', error);
    process.exit(1);
  }
}

verify();
"

echo "✅ Setup do Neon PostgreSQL concluído com sucesso!"
```

### 3.2 Script de Setup para Preview

```bash
#!/bin/bash
# scripts/setup-neon-preview.sh

set -e

echo "🔄 Configurando Neon PostgreSQL para Preview"
echo "==========================================="

# Usar variáveis de preview
export DATABASE_URL="$PREVIEW_DATABASE_URL"
export DIRECT_URL="$PREVIEW_DIRECT_URL"

# Executar mesmo processo de setup
./scripts/setup-neon-production.sh

echo "✅ Setup do ambiente Preview concluído!"
```

### 3.3 Script de Seed para Production

```bash
#!/bin/bash
# scripts/seed-neon-production.sh

cd packages/database

# Criar arquivo de seed específico para produção
cat > src/seed-production.ts << 'EOF'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Executando seed de produção...')

  // Admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@truecheckia.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'SecureAdmin123!'
  
  const hashedPassword = await bcrypt.hash(adminPassword, 12)
  
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Administrador',
      role: 'ADMIN',
      plan: 'ENTERPRISE',
      credits: 10000,
      emailVerified: true,
    },
  })

  console.log(`✅ Admin criado: ${adminUser.email}`)
  
  // Sistema de health check
  await prisma.systemHealth.create({
    data: {
      service: 'database',
      status: 'HEALTHY',
      responseTime: 50,
      metadata: {
        version: '1.0.0',
        setupDate: new Date().toISOString()
      }
    }
  })

  console.log('✅ Sistema de monitoramento inicializado')
  console.log('🎉 Seed de produção concluído!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
EOF

# Executar seed
npx tsx src/seed-production.ts

# Limpar arquivo temporário
rm src/seed-production.ts

echo "✅ Seed de produção executado com sucesso!"
```

## 4. Otimizações de Performance

### 4.1 Índices Críticos

O schema já possui índices otimizados para as queries mais frequentes:

```prisma
// Usuários - Queries de autenticação e planos
@@index([email])
@@index([apiKey]) 
@@index([plan, credits, createdAt])

// Análises - Histórico e performance
@@index([userId, createdAt(sort: Desc)])
@@index([userId, isAiGenerated, createdAt(sort: Desc)])
@@index([cached, createdAt])

// API Usage - Monitoramento
@@index([userId, createdAt(sort: Desc)])
@@index([endpoint, createdAt(sort: Desc)])
@@index([responseTime, createdAt])

// Cache - Limpeza e lookup
@@index([textHash])
@@index([expiresAt])
```

### 4.2 Configuração de Timeout

```typescript
// Para ambiente serverless
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Timeout otimizado para serverless
  __internal: {
    engine: {
      connectTimeout: 60000,
      queryTimeout: 60000,
    },
  },
})
```

### 4.3 Queries Otimizadas

```typescript
// Exemplo de query otimizada para histórico de análises
async function getUserAnalysisHistory(userId: string, limit = 20) {
  return prisma.analysis.findMany({
    where: { userId },
    select: {
      id: true,
      text: true,
      aiScore: true,
      confidence: true,
      isAiGenerated: true,
      createdAt: true,
      // Evitar campos pesados como indicators e suspiciousParts
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
```

## 5. Monitoramento e Observabilidade

### 5.1 Health Check Endpoint

```typescript
// apps/api/src/routes/health.ts
import { Request, Response } from 'express'
import { prisma } from '@truecheckia/database'

export async function healthCheck(req: Request, res: Response) {
  try {
    const start = Date.now()
    
    // Test basic connection
    await prisma.$queryRaw`SELECT 1`
    
    const responseTime = Date.now() - start
    
    // Log metrics
    await prisma.systemHealth.create({
      data: {
        service: 'database',
        status: 'HEALTHY',
        responseTime,
      }
    })
    
    res.json({
      status: 'healthy',
      database: 'connected',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    await prisma.systemHealth.create({
      data: {
        service: 'database',
        status: 'DOWN',
        metadata: { error: error.message }
      }
    }).catch(() => {}) // Fail silently if DB is down
    
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    })
  }
}
```

### 5.2 Query Performance Monitoring

```typescript
// middleware/performance.ts
import { prisma } from '@truecheckia/database'

export function trackQueryPerformance(queryType: string) {
  return async function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    
    descriptor.value = async function(...args: any[]) {
      const start = Date.now()
      
      try {
        const result = await method.apply(this, args)
        const executionTime = Date.now() - start
        
        // Log performance em background
        setImmediate(async () => {
          try {
            await prisma.queryPerformance.create({
              data: {
                queryType,
                executionTime,
                recordCount: Array.isArray(result) ? result.length : 1,
              }
            })
          } catch (e) {
            console.error('Failed to log query performance:', e)
          }
        })
        
        return result
      } catch (error) {
        const executionTime = Date.now() - start
        
        // Log failed query
        setImmediate(async () => {
          try {
            await prisma.queryPerformance.create({
              data: {
                queryType: `${queryType}_FAILED`,
                executionTime,
                recordCount: 0,
              }
            })
          } catch (e) {
            console.error('Failed to log query performance:', e)
          }
        })
        
        throw error
      }
    }
  }
}
```

## 6. Configuração de Variáveis de Ambiente

### 6.1 Arquivo .env para Development

```bash
# .env.local (Development)
DATABASE_URL="postgresql://username:password@ep-xxx-pooler.region.aws.neon.tech/truecheckia_preview?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://username:password@ep-xxx.region.aws.neon.tech/truecheckia_preview?sslmode=require"
SHADOW_DATABASE_URL="postgresql://username:password@ep-xxx-pooler.region.aws.neon.tech/truecheckia_shadow?sslmode=require&pgbouncer=true"
```

### 6.2 Configuração para Vercel

```bash
# Variáveis para Vercel (Production)
DATABASE_URL="postgresql://prod-username:prod-password@ep-xxx-pooler.region.aws.neon.tech/truecheckia_prod?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://prod-username:prod-password@ep-xxx.region.aws.neon.tech/truecheckia_prod?sslmode=require"

# Variáveis para Vercel (Preview)
PREVIEW_DATABASE_URL="postgresql://preview-username:preview-password@ep-xxx-pooler.region.aws.neon.tech/truecheckia_preview?sslmode=require&pgbouncer=true"
PREVIEW_DIRECT_URL="postgresql://preview-username:preview-password@ep-xxx.region.aws.neon.tech/truecheckia_preview?sslmode=require"
```

## 7. Backup e Recuperação

### 7.1 Configuração de Backups Automáticos

O Neon fornece backups automáticos, mas configure pontos de recuperação:

```bash
# Script para criar backup manual
#!/bin/bash
# scripts/backup-database.sh

BACKUP_NAME="truecheckia-backup-$(date +%Y%m%d-%H%M%S)"

echo "📦 Criando backup: $BACKUP_NAME"

# Neon CLI para criar branch de backup
npx neonctl branches create --name "$BACKUP_NAME" --parent main

echo "✅ Backup criado: $BACKUP_NAME"
```

### 7.2 Script de Recuperação

```bash
#!/bin/bash
# scripts/restore-database.sh

BACKUP_BRANCH=$1

if [ -z "$BACKUP_BRANCH" ]; then
    echo "❌ Uso: ./restore-database.sh <backup-branch-name>"
    exit 1
fi

echo "🔄 Restaurando banco de dados do backup: $BACKUP_BRANCH"

# Confirmar operação
read -p "⚠️  Isso substituirá a branch main. Continuar? (y/N): " confirm
if [ "$confirm" != "y" ]; then
    echo "❌ Operação cancelada"
    exit 1
fi

# Restaurar via Neon CLI
npx neonctl branches restore main --source "$BACKUP_BRANCH"

echo "✅ Banco de dados restaurado com sucesso!"
```

## 8. Troubleshooting

### 8.1 Problemas Comuns

#### Connection Pool Esgotado
```typescript
// Monitorar conexões ativas
async function checkDatabaseConnections() {
  const result = await prisma.$queryRaw`
    SELECT count(*) as active_connections 
    FROM pg_stat_activity 
    WHERE state = 'active'
  `
  
  console.log('Conexões ativas:', result)
}
```

#### Queries Lentas
```sql
-- Identificar queries lentas
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

#### Lock de Tabelas
```sql
-- Verificar locks ativos
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

### 8.2 Comandos Úteis

```bash
# Verificar status do banco
npx prisma db pull

# Reset completo do banco (Preview apenas)
npx prisma migrate reset --force

# Verificar diferenças no schema
npx prisma db diff

# Gerar migration
npx prisma migrate dev --name description_of_changes

# Deploy em produção
npx prisma migrate deploy
```

## 9. Checklist de Configuração

### 9.1 Setup Inicial
- [ ] Criar conta no Neon
- [ ] Criar projeto de produção
- [ ] Configurar branch main (production)
- [ ] Criar branch preview
- [ ] Configurar connection pooling
- [ ] Obter connection strings
- [ ] Configurar variáveis de ambiente

### 9.2 Configuração do Código
- [ ] Atualizar schema.prisma com URLs corretas
- [ ] Configurar cliente Prisma para serverless
- [ ] Executar migrations iniciais
- [ ] Fazer seed dos dados básicos
- [ ] Testar conexão

### 9.3 Configuração Avançada
- [ ] Configurar monitoramento
- [ ] Implementar health checks
- [ ] Configurar backups
- [ ] Documentar troubleshooting
- [ ] Testar performance

### 9.4 Deploy
- [ ] Configurar variáveis na Vercel
- [ ] Testar em preview
- [ ] Deploy em produção
- [ ] Verificar logs e métricas
- [ ] Documentar acesso para equipe

## 10. Próximos Passos

Após a configuração do Neon PostgreSQL:

1. **TAREFA 2**: Configurar Upstash Redis para cache e filas
2. **TAREFA 3**: Adaptar backend para Vercel Functions
3. **TAREFA 4**: Implementar monitoramento avançado
4. **TAREFA 5**: Configurar pipeline CI/CD completo

---

**Importante**: Mantenha as credenciais de banco de dados seguras e nunca as commite no repositório. Use sempre variáveis de ambiente e considere usar serviços de gerenciamento de secrets para produção.