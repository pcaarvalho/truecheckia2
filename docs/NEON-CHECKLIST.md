# Neon PostgreSQL Setup Checklist - TrueCheckIA

Use este checklist para validar a configuração do Neon PostgreSQL em produção.

## 📋 Pre-Setup

- [ ] Conta criada no [Neon.tech](https://neon.tech)
- [ ] Plano Pro selecionado (para produção)
- [ ] Região us-east-1 escolhida (otimizada para Vercel)
- [ ] Projeto "truecheckia-production" criado

## 🏗️ Configuração do Projeto

### Database Branches
- [ ] Branch `main` configurada (produção)
- [ ] Branch `preview` criada (desenvolvimento)
- [ ] Auto-scaling habilitado no branch main
- [ ] Backup automático configurado

### Connection Pooling
- [ ] Pool Mode: Transaction
- [ ] Pool Size: 25 conexões
- [ ] Pool Timeout: 30 segundos
- [ ] Max Client Connections: 100

## 🔐 Environment Variables

### Obrigatórias
- [ ] `DATABASE_URL` configurada (pooled connection)
- [ ] `DIRECT_URL` configurada (direct connection)

### Opcionais
- [ ] `SHADOW_DATABASE_URL` configurada (recomendada)

### Formato das URLs
- [ ] DATABASE_URL inclui `pooler` no hostname
- [ ] DATABASE_URL inclui `pgbouncer=true`
- [ ] DATABASE_URL inclui `sslmode=require`
- [ ] DATABASE_URL inclui `connect_timeout=10`
- [ ] DIRECT_URL **não** inclui pooler
- [ ] Todas as URLs usam região us-east-1

## 🧪 Testes de Conectividade

### Comandos de Teste
```bash
# Copiar arquivo de exemplo
cp .env.neon.example .env

# Atualizar com suas credenciais
# Editar DATABASE_URL, DIRECT_URL, SHADOW_DATABASE_URL

# Testar conectividade
npm run test:neon

# Validação completa
npm run validate:neon
```

### Validações
- [ ] Teste de conectividade passa ✅
- [ ] Latência < 200ms
- [ ] Conexões ativas < 20
- [ ] Health check retorna "healthy"
- [ ] Performance test passa

## 📊 Schema e Dados

### Database Setup
```bash
# Gerar cliente Prisma
npm run db:generate

# Aplicar schema
npm run db:migrate

# Carregar dados de exemplo
npm run db:seed
```

### Validações
- [ ] Schema aplicado sem erros
- [ ] Tabelas criadas corretamente
- [ ] Índices criados
- [ ] Extensão pg_stat_statements habilitada
- [ ] Usuário de desenvolvimento criado

## ⚡ Performance e Monitoring

### Configurações de Performance
- [ ] Connection pooling otimizado
- [ ] Query timeout configurado
- [ ] Slow query logging habilitado

### Health Checks
- [ ] Endpoint `/health/database` funciona
- [ ] Endpoint `/health/performance` funciona
- [ ] Métricas de conexão disponíveis

### Alertas (configurar no Neon Dashboard)
- [ ] CPU > 80% por 5 minutos
- [ ] Conexões > 90% do limite
- [ ] Storage > 80% da cota
- [ ] Error rate > 1%
- [ ] Query time > 1 segundo

## 🔒 Segurança

### Configurações de Segurança
- [ ] SSL habilitado (sslmode=require)
- [ ] Credenciais seguras
- [ ] IP allowlist configurado (se necessário)
- [ ] Audit logging habilitado

### Backup e Recovery
- [ ] Backup automático habilitado
- [ ] Point-in-time recovery disponível
- [ ] Processo de restore testado

## 🚀 Deploy Configuration

### Desenvolvimento
- [ ] Arquivo `.env.local` configurado
- [ ] Branch preview sendo usado
- [ ] Logging detalhado habilitado

### Produção (Vercel)
- [ ] Environment variables configuradas
- [ ] Branch main sendo usado
- [ ] Connection pooling otimizado
- [ ] Monitoring habilitado

## ✅ Validação Final

### Checklist de Produção
- [ ] Todos os testes de conectividade passam
- [ ] Performance dentro dos limites aceitáveis
- [ ] Alertas configurados e funcionando
- [ ] Backup testado
- [ ] Documentação atualizada
- [ ] Runbooks preparados

### Comandos de Validação Final
```bash
# Teste completo da infraestrutura
npm run validate:neon

# Teste de performance
npm run db:studio  # Verificar dados manualmente

# Teste de conectividade externa
psql $DATABASE_URL -c "SELECT version();"
```

## 📚 Troubleshooting

### Problemas Comuns

**Connection Timeout**
- [ ] Verificar connect_timeout na URL
- [ ] Testar DIRECT_URL vs DATABASE_URL
- [ ] Verificar região do Neon vs Vercel

**Pool Exhaustion**
- [ ] Monitorar conexões ativas
- [ ] Verificar connection leaks na aplicação
- [ ] Ajustar pool size se necessário

**Latência Alta**
- [ ] Verificar região do banco
- [ ] Otimizar queries lentas
- [ ] Verificar índices

**Migration Errors**
- [ ] Usar DIRECT_URL para migrations
- [ ] Verificar SHADOW_DATABASE_URL
- [ ] Testar em branch preview primeiro

## 🎯 Próximos Passos

Após completar este checklist:

1. **Configurar Upstash Redis**
   ```bash
   npm run setup:upstash
   ```

2. **Setup Vercel Deployment**
   - Configurar environment variables
   - Deploy da aplicação
   - Configurar domínios

3. **Configurar Monitoring Completo**
   - APM (Application Performance Monitoring)
   - Error tracking
   - Real user monitoring

4. **Otimizações de Performance**
   - Query optimization
   - Caching strategies
   - CDN configuration

## 📝 Status

**Data de Setup**: _______________  
**Responsável**: _______________  
**Ambiente**: [ ] Desenvolvimento [ ] Staging [ ] Produção  
**Status**: [ ] Em Progresso [ ] Completo [ ] Validado  

**Notas**:
_________________________________
_________________________________
_________________________________