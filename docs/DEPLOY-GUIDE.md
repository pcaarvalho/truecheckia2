# TrueCheckIA - Guia de Deploy na Vercel

## Pré-requisitos

- [ ] Conta no Neon (neon.tech)
- [ ] Conta na Vercel (vercel.com)
- [ ] Vercel CLI instalado (`npm i -g vercel`)
- [ ] Node.js 18+ instalado
- [ ] Chaves da OpenAI e Stripe configuradas

## 1. Setup do Banco de Dados (Neon)

### 1.1 Criar Projeto no Neon
```bash
# 1. Acesse neon.tech e crie conta
# 2. Criar novo projeto: "truecheckia-production"
# 3. Região: us-east-1 (ou mais próxima)
# 4. Database: truecheckia
```

### 1.2 Configurar Branches
```bash
# No console do Neon:
# 1. Branch principal: main (criado automaticamente)
# 2. Criar branch: preview (para deploys de teste)
```

### 1.3 Configurar Connection Pooling
```bash
# No console do Neon, habilitar:
# - Connection Pooling: Enabled
# - Pool Mode: Transaction
# - Pool Size: 25
```

### 1.4 Copiar Connection Strings
```bash
# Production (branch main):
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/truecheckia?sslmode=require&pgbouncer=true"

# Preview (branch preview):
DATABASE_URL_PREVIEW="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/truecheckia?sslmode=require&pgbouncer=true"
```

## 2. Setup do Projeto

### 2.1 Preparar Schema
```bash
# Executar no diretório do projeto:
cd packages/database
npm run db:generate
```

### 2.2 Setup Production Database
```bash
# Configurar variável de ambiente:
export DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/truecheckia?sslmode=require&pgbouncer=true"

# Executar setup:
./scripts/setup-production-db.sh
```

### 2.3 Setup Preview Database
```bash
# Configurar variável para preview:
export DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/truecheckia?sslmode=require&pgbouncer=true"

# Executar migrations:
cd packages/database
npm run db:push
```

## 3. Deploy na Vercel

### 3.1 Instalar e Configurar Vercel CLI
```bash
npm i -g vercel
vercel login
vercel link
```

### 3.2 Configurar Environment Variables

#### Production
```bash
vercel env add DATABASE_URL production
# Cole a connection string de produção

vercel env add JWT_SECRET production
# Cole: production-jwt-secret-256-bits-random

vercel env add OPENAI_API_KEY production
# Cole sua chave da OpenAI

vercel env add STRIPE_SECRET_KEY production
# Cole: sk_live_...

vercel env add STRIPE_WEBHOOK_SECRET production
# Cole: whsec_...

vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
# Cole: pk_live_...

# Continuar para todas as variáveis da seção 4
```

#### Preview
```bash
vercel env add DATABASE_URL preview
# Cole a connection string de preview

vercel env add JWT_SECRET preview
# Cole: preview-jwt-secret-256-bits-random

vercel env add STRIPE_SECRET_KEY preview
# Cole: sk_test_...

# Continuar para todas as variáveis de preview
```

### 3.3 Deploy Preview
```bash
# Deploy para testing:
./scripts/deploy-vercel.sh preview

# Ou manualmente:
vercel deploy
```

### 3.4 Deploy Production
```bash
# Deploy para produção:
./scripts/deploy-vercel.sh production

# Ou manualmente:
vercel deploy --prod
```

## 4. Verificação Pós-Deploy

### 4.1 Health Checks
```bash
# Verificar endpoints:
curl https://your-app.vercel.app/api/health
curl https://your-app.vercel.app/api/v1/status
```

### 4.2 Teste de Funcionalidades
- [ ] Registro de usuário
- [ ] Login/logout
- [ ] Análise de texto
- [ ] Sistema de créditos
- [ ] Integração Stripe
- [ ] API externa

### 4.3 Monitoramento
- [ ] Configurar alertas no Vercel
- [ ] Monitorar métricas no Neon
- [ ] Verificar logs de erro
- [ ] Testar performance

## 5. Manutenção

### 5.1 Migrations
```bash
# Para novas migrations:
cd packages/database
npm run db:migrate

# Deploy migration:
./scripts/migrate-production.sh
```

### 5.2 Backup
```bash
# Backups automáticos no Neon (Point-in-time recovery)
# Backups manuais antes de deploys importantes:
# Criar branch no Neon antes de mudanças críticas
```

### 5.3 Rollback
```bash
# Em caso de problemas:
./scripts/rollback-database.sh main production
vercel rollback
```

## 6. Comandos Úteis

```bash
# Ver logs em tempo real:
vercel logs --follow

# Executar migrations:
./scripts/migrate-production.sh

# Health check do banco:
cd packages/database && npx tsx -e "
import { checkDatabaseHealth } from './src/health';
checkDatabaseHealth().then(console.log);
"

# Verificar tamanho do banco:
cd packages/database && npx tsx -e "
import { getDatabaseSize } from './src/health';
getDatabaseSize().then(size => console.log('DB size:', size, 'MB'));
"
```

## 7. Troubleshooting

### Problemas Comuns

#### Connection Pool Exhausted
```bash
# Verificar no Neon console:
# - Número de conexões ativas
# - Aumentar pool size se necessário
# - Verificar queries longas
```

#### Migration Failed
```bash
# Reset preview database:
./scripts/rollback-database.sh

# Re-run migration:
cd packages/database
npm run db:push
```

#### Vercel Build Failed
```bash
# Verificar logs:
vercel logs

# Problemas comuns:
# - Environment variables não definidas
# - Prisma client não gerado
# - Database inacessível
```

### Support
- **Neon**: docs.neon.tech
- **Vercel**: vercel.com/docs
- **Prisma**: prisma.io/docs

## 8. Performance Benchmarks

### Targets de Performance
- Database latency: < 50ms (Neon us-east-1)
- API response time: < 200ms p95
- Page load time: < 3s
- AI analysis time: < 10s

### Monitoring
```bash
# Setup monitoring:
# 1. Vercel Analytics habilitado
# 2. Neon Monitoring ativo
# 3. Custom health checks configurados
```