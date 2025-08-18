# TrueCheckIA API - Vercel Functions

Este diretório contém a implementação da API do TrueCheckIA como Vercel Functions, mantendo 100% da compatibilidade com o backend Express.js original.

## Estrutura de Arquivos

```
/api/
├── _utils/
│   └── vercel-adapter.ts          # Adaptador principal para Vercel Functions
├── _middleware/
│   ├── auth.ts                    # Middleware de autenticação
│   ├── validation.ts              # Middleware de validação
│   └── rate-limit.ts              # Rate limiting com Upstash Redis
├── auth/
│   ├── register.ts                # POST /api/auth/register
│   ├── login.ts                   # POST /api/auth/login
│   ├── verify-email.ts            # POST /api/auth/verify-email
│   ├── refresh.ts                 # POST /api/auth/refresh
│   ├── logout.ts                  # POST /api/auth/logout
│   ├── forgot-password.ts         # POST /api/auth/forgot-password
│   ├── reset-password.ts          # POST /api/auth/reset-password
│   ├── resend-verification.ts     # POST /api/auth/resend-verification
│   ├── change-password.ts         # POST /api/auth/change-password
│   └── logout-all.ts              # POST /api/auth/logout-all
├── analysis/
│   ├── check.ts                   # POST /api/analysis/check
│   ├── history.ts                 # GET /api/analysis/history
│   ├── [id].ts                    # GET /api/analysis/:id
│   └── stats.ts                   # GET /api/analysis/stats
├── user/
│   ├── profile.ts                 # GET/PATCH /api/user/profile
│   ├── credits.ts                 # GET /api/user/credits
│   └── api-key.ts                 # POST/DELETE /api/user/api-key
├── v1/
│   ├── analyze.ts                 # POST /api/v1/analyze
│   ├── status.ts                  # GET /api/v1/status
│   └── usage.ts                   # GET /api/v1/usage
├── subscription/
│   ├── checkout.ts                # POST /api/subscription/checkout
│   ├── portal.ts                  # POST /api/subscription/portal
│   ├── status.ts                  # GET /api/subscription/status
│   └── webhook.ts                 # POST /api/subscription/webhook
├── admin/
│   └── [...all].ts                # Todas as rotas de admin (dev only)
├── webhooks/
│   └── [...all].ts                # Webhooks para queues e cron jobs
└── health.ts                      # GET /api/health
```

## Características Principais

### 🔄 Compatibilidade Total
- **Zero Breaking Changes**: Mantém exatamente a mesma API do Express.js
- **Reutilização de Controllers**: Usa 100% dos controllers existentes
- **Mesmo Response Format**: Mantém estrutura de resposta idêntica
- **Error Handling**: Preserva códigos de erro e estruturas

### 🚀 Adaptações para Serverless
- **Cold Start Otimizado**: Estrutura otimizada para startup rápido
- **Edge Runtime Compatible**: Pronto para rodar na edge network
- **Memory Efficient**: Bundle size otimizado
- **Auto-scaling**: Escala automaticamente com demanda

### 🔐 Middleware Funcionando
- **Auth Middleware**: JWT verification mantido
- **Rate Limiting**: Implementado com Upstash Redis
- **Validation**: Zod validation preservado
- **CORS**: Configuração de CORS automática
- **Error Handling**: Error middleware adaptado

### ⚡ Performance
- **30s Max Duration**: Configurado para operações longas
- **1024MB Memory**: Otimizado para operações de AI
- **IAD1 Region**: Baixa latência para usuários brasileiros
- **Upstash Redis**: Cache e rate limiting sem cold start

## Como Usar

### 1. Variáveis de Ambiente Necessárias

Adicione no painel da Vercel ou no arquivo `.env`:

```env
# Database
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=your-jwt-secret
REFRESH_SECRET=your-refresh-secret

# OpenAI
OPENAI_API_KEY=sk-...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Upstash Redis (para rate limiting)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Vercel Webhooks
VERCEL_WEBHOOK_SECRET=your-webhook-secret
VERCEL_CRON_SECRET=your-cron-secret

# Email (Resend)
RESEND_API_KEY=re_...

# URLs
FRONTEND_URL=https://your-frontend.vercel.app
API_URL=https://your-api.vercel.app
```

### 2. Deploy na Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy do projeto
vercel

# Configurar domínio personalizado (opcional)
vercel domains add api.truecheckia.com
```

### 3. Configurar Cron Jobs

Os cron jobs são configurados automaticamente via `vercel.json`:

- **Manutenção**: A cada hora (processa queues pendentes)
- **Agregação de Stats**: Diário às 1h
- **Limpeza**: Diário às 2h
- **Reset de Créditos**: Diário às 3h
- **Renovações**: Diário às 9h
- **Verificação de Créditos Baixos**: Diário às 10h

### 4. Monitoramento

```bash
# Verificar health
curl https://your-api.vercel.app/api/health

# Verificar status das queues
curl -H "Authorization: Bearer YOUR_WEBHOOK_SECRET" \
  https://your-api.vercel.app/api/webhooks/stats

# Trigger manual de jobs
curl -X POST \
  -H "Authorization: Bearer YOUR_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"data": {...}}' \
  https://your-api.vercel.app/api/webhooks/trigger/analysis
```

## Endpoints da API

### Autenticação
- `POST /api/auth/register` - Registro de usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/verify-email` - Verificação de email
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/forgot-password` - Esqueci senha
- `POST /api/auth/reset-password` - Reset senha
- `POST /api/auth/resend-verification` - Reenviar verificação
- `POST /api/auth/change-password` - Trocar senha
- `POST /api/auth/logout-all` - Logout de todos dispositivos

### Análise
- `POST /api/analysis/check` - Analisar texto
- `GET /api/analysis/history` - Histórico de análises
- `GET /api/analysis/:id` - Análise específica
- `GET /api/analysis/stats` - Estatísticas do usuário

### Usuário
- `GET /api/user/profile` - Perfil do usuário
- `PATCH /api/user/profile` - Atualizar perfil
- `GET /api/user/credits` - Créditos disponíveis
- `POST /api/user/api-key` - Gerar API key
- `DELETE /api/user/api-key` - Revogar API key

### API Externa (v1)
- `POST /api/v1/analyze` - Análise via API key
- `GET /api/v1/status` - Status da API
- `GET /api/v1/usage` - Uso da API

### Assinatura
- `POST /api/subscription/checkout` - Criar sessão de checkout
- `POST /api/subscription/portal` - Portal do cliente
- `GET /api/subscription/status` - Status da assinatura
- `POST /api/subscription/webhook` - Webhook do Stripe

### Admin (Dev Only)
- `POST /api/admin/create-dev-user` - Criar usuário de desenvolvimento
- `GET /api/admin/database-stats` - Estatísticas do banco
- `POST /api/admin/seed-sample-data` - Dados de exemplo

### Sistema
- `GET /api/health` - Health check
- `POST /api/webhooks/*` - Processamento de queues e cron jobs

## Rate Limiting

| Endpoint | Limite | Janela |
|----------|---------|---------|
| Auth | 5 requests | 15 minutos |
| Analysis | 30 requests | 1 minuto |
| API Externa | 100 requests | 1 minuto |
| Geral | 1000 requests | 1 hora |

## Diferenças do Express.js

### O que Mudou
1. **Arquivo por Endpoint**: Cada endpoint é um arquivo separado
2. **Middleware Adaptado**: Middleware convertido para Vercel Functions
3. **Rate Limiting**: Usa Upstash Redis em vez de in-memory
4. **Cold Start**: Otimizado para inicialização rápida

### O que se Manteve
1. **Controllers**: 100% reutilizados sem modificação
2. **Validation**: Mesmos schemas Zod
3. **Auth Logic**: JWT e autenticação idênticos
4. **Database**: Prisma Client mantido
5. **Response Format**: Estruturas de resposta iguais
6. **Error Codes**: Códigos de erro preservados

## Troubleshooting

### Cold Start Lento
- Verifique bundle size dos imports
- Use dynamic imports para dependências pesadas
- Considere Edge Runtime para endpoints simples

### Rate Limiting Não Funciona
- Verifique variáveis do Upstash Redis
- Confirme se Redis está acessível da região configurada

### Timeout de Function
- Aumente `maxDuration` no `vercel.json`
- Otimize queries do banco de dados
- Use processamento assíncrono para operações longas

### CORS Issues
- Verifique configuração de CORS no adapter
- Adicione domínios permitidos nas variáveis de ambiente

## Performance Tips

1. **Bundle Otimizado**: Importe apenas o necessário
2. **Connection Pooling**: Use connection pooling do Prisma
3. **Caching**: Implemente cache com Upstash Redis
4. **Edge Functions**: Use para endpoints simples e estáticos
5. **Monitoring**: Use Vercel Analytics para monitorar performance