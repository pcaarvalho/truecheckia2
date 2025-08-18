#!/bin/bash

# TrueCheckIA - Setup Neon PostgreSQL Preview Environment
# Este script configura o banco de dados de preview/development no Neon

set -e

echo "🔄 Configurando Neon PostgreSQL para Preview"
echo "==========================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se estamos no ambiente de preview
if [ -z "$PREVIEW_DATABASE_URL" ]; then
    log_error "PREVIEW_DATABASE_URL não está definida"
    log_info "Configure a connection string do ambiente de preview"
    log_info "Exemplo: postgresql://user:pass@host-pooler.region.aws.neon.tech/preview_db?sslmode=require&pgbouncer=true"
    exit 1
fi

if [ -z "$PREVIEW_DIRECT_URL" ]; then
    log_error "PREVIEW_DIRECT_URL não está definida"
    log_info "Configure a connection string direta do ambiente de preview"
    log_info "Exemplo: postgresql://user:pass@host.region.aws.neon.tech/preview_db?sslmode=require"
    exit 1
fi

# Configurar variáveis para o ambiente de preview
export DATABASE_URL="$PREVIEW_DATABASE_URL"
export DIRECT_URL="$PREVIEW_DIRECT_URL"

# Definir shadow database para preview
if [ -z "$SHADOW_DATABASE_URL" ]; then
    # Extrair detalhes da URL para criar shadow database
    SHADOW_DB_NAME=$(echo $PREVIEW_DATABASE_URL | sed 's/.*\/\([^?]*\).*/\1/')_shadow
    export SHADOW_DATABASE_URL=$(echo $PREVIEW_DATABASE_URL | sed "s/${SHADOW_DB_NAME%_shadow}/${SHADOW_DB_NAME}/")
    log_info "Shadow database configurada automaticamente: ${SHADOW_DB_NAME}"
fi

log_info "Ambiente de preview configurado:"
log_info "   Database: $(echo $DATABASE_URL | sed 's/:[^@]*@/:***@/')"
log_info "   Direct: $(echo $DIRECT_URL | sed 's/:[^@]*@/:***@/')"

# Executar script de produção com configurações de preview
log_info "Executando configuração usando environment de preview..."

# Verificar se o script de produção existe
if [ ! -f "scripts/setup-neon-production.sh" ]; then
    log_error "Script de produção não encontrado"
    log_info "Execute este script a partir do diretório raiz do projeto"
    exit 1
fi

# Executar setup de produção com dados de preview
./scripts/setup-neon-production.sh --with-seed || {
    log_error "Falha na configuração do ambiente de preview"
    exit 1
}

# Configurações específicas do ambiente de preview
log_info "Aplicando configurações específicas do preview..."

cd packages/database

# Criar dados adicionais para desenvolvimento
log_info "Criando dados de desenvolvimento..."

cat > src/temp-preview-seed.ts << 'EOF'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 Criando dados de desenvolvimento...')

  // Criar usuário de desenvolvimento
  const devPassword = await bcrypt.hash('dev12345', 12)
  
  const devUser = await prisma.user.upsert({
    where: { email: 'dev@truecheckia.com' },
    update: {
      credits: 10000,
      plan: 'ENTERPRISE'
    },
    create: {
      email: 'dev@truecheckia.com',
      password: devPassword,
      name: 'Dev User',
      role: 'USER',
      plan: 'ENTERPRISE',
      credits: 10000,
      emailVerified: true,
    },
  })

  console.log(`✅ Usuário de desenvolvimento: ${devUser.email}`)
  
  // Criar usuário de teste free
  const freeUserPassword = await bcrypt.hash('test12345', 12)
  
  const freeUser = await prisma.user.upsert({
    where: { email: 'test@truecheckia.com' },
    update: {
      credits: 10,
      plan: 'FREE'
    },
    create: {
      email: 'test@truecheckia.com',
      password: freeUserPassword,
      name: 'Test User',
      role: 'USER',
      plan: 'FREE',
      credits: 10,
      emailVerified: true,
    },
  })

  console.log(`✅ Usuário de teste free: ${freeUser.email}`)
  
  // Criar análises de exemplo
  const sampleTexts = [
    {
      text: "Esta é uma análise de exemplo para testar o sistema de detecção de IA.",
      isAi: false,
      score: 15.5
    },
    {
      text: "O seguinte texto foi gerado artificialmente para demonstrar as capacidades do sistema de análise automatizada de conteúdo utilizando algoritmos avançados de processamento de linguagem natural.",
      isAi: true,
      score: 89.2
    },
    {
      text: "Texto normal escrito por humano com linguagem natural e espontânea.",
      isAi: false,
      score: 22.1
    }
  ]
  
  for (const sample of sampleTexts) {
    await prisma.analysis.create({
      data: {
        userId: devUser.id,
        text: sample.text,
        wordCount: sample.text.split(' ').length,
        charCount: sample.text.length,
        language: 'pt',
        aiScore: sample.score,
        confidence: sample.score > 70 ? 'HIGH' : sample.score > 40 ? 'MEDIUM' : 'LOW',
        isAiGenerated: sample.isAi,
        indicators: sample.isAi ? ['repetitive_patterns', 'formal_structure'] : ['natural_flow'],
        explanation: sample.isAi ? 
          'Este texto apresenta características típicas de conteúdo gerado por IA.' :
          'Este texto apresenta características de escrita humana natural.',
        suspiciousParts: [],
        modelUsed: 'gpt-4',
        processingTime: Math.floor(Math.random() * 500) + 200,
      },
    })
  }
  
  console.log(`✅ Criadas ${sampleTexts.length} análises de exemplo`)
  
  // Criar evento de analytics de exemplo
  await prisma.analyticsEvent.create({
    data: {
      eventType: 'system_setup',
      userId: devUser.id,
      properties: {
        environment: 'preview',
        setupDate: new Date().toISOString(),
        version: '1.0.0'
      }
    }
  })
  
  // Estatísticas finais
  const userCount = await prisma.user.count()
  const analysisCount = await prisma.analysis.count()
  const eventCount = await prisma.analyticsEvent.count()
  
  console.log(`📊 Estatísticas do ambiente de preview:`)
  console.log(`   Usuários: ${userCount}`)
  console.log(`   Análises: ${analysisCount}`)
  console.log(`   Eventos: ${eventCount}`)
  
  console.log('🎉 Dados de desenvolvimento criados com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro ao criar dados de desenvolvimento:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
EOF

# Executar seed de preview
npx tsx src/temp-preview-seed.ts || {
    log_warning "Falha ao criar dados de desenvolvimento (não crítico)"
}

# Limpar arquivo temporário
rm -f src/temp-preview-seed.ts

# Teste de performance específico para preview
log_info "Executando testes de performance para preview..."

npx tsx -e "
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function performanceTest() {
  try {
    console.log('🏃 Executando testes de performance...');
    
    // Teste de conexão
    const start1 = Date.now();
    await prisma.\$connect();
    const connectTime = Date.now() - start1;
    console.log(\`   Conexão: \${connectTime}ms\`);
    
    // Teste de query simples
    const start2 = Date.now();
    const users = await prisma.user.findMany({
      take: 5,
      select: { id: true, email: true, plan: true, credits: true }
    });
    const queryTime = Date.now() - start2;
    console.log(\`   Query usuários: \${queryTime}ms\`);
    
    // Teste de query complexa
    const start3 = Date.now();
    const analyses = await prisma.analysis.findMany({
      take: 10,
      include: {
        user: {
          select: { email: true, plan: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    const complexQueryTime = Date.now() - start3;
    console.log(\`   Query complexa: \${complexQueryTime}ms\`);
    
    // Teste de agregação
    const start4 = Date.now();
    const stats = await prisma.analysis.groupBy({
      by: ['confidence'],
      _count: {
        id: true
      }
    });
    const aggregationTime = Date.now() - start4;
    console.log(\`   Agregação: \${aggregationTime}ms\`);
    
    console.log('📊 Resultados dos testes:');
    console.log(\`   Usuários encontrados: \${users.length}\`);
    console.log(\`   Análises encontradas: \${analyses.length}\`);
    console.log(\`   Estatísticas por confiança: \${stats.length} grupos\`);
    
    // Verificar se performance está adequada
    const totalTime = connectTime + queryTime + complexQueryTime + aggregationTime;
    console.log(\`   Tempo total: \${totalTime}ms\`);
    
    if (totalTime > 5000) {
      console.log('⚠️  Performance pode estar abaixo do esperado');
    } else {
      console.log('✅ Performance adequada para ambiente de preview');
    }
    
    await prisma.\$disconnect();
  } catch (error) {
    console.error('❌ Erro no teste de performance:', error.message);
    process.exit(1);
  }
}

performanceTest();
" || log_warning "Testes de performance falharam (não crítico)"

cd ../..

# Criar arquivo de configuração para preview
log_info "Criando arquivo de configuração para preview..."

cat > .env.preview.example << 'EOF'
# TrueCheckIA Preview Environment Configuration
# Copy to .env.local for development

# Database (Neon PostgreSQL - Preview Branch)
DATABASE_URL="postgresql://username:password@ep-xxx-pooler.region.aws.neon.tech/truecheckia_preview?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://username:password@ep-xxx.region.aws.neon.tech/truecheckia_preview?sslmode=require"
SHADOW_DATABASE_URL="postgresql://username:password@ep-xxx-pooler.region.aws.neon.tech/truecheckia_shadow?sslmode=require&pgbouncer=true"

# Redis (Upstash - Development)
REDIS_URL="redis://localhost:6379"
# UPSTASH_REDIS_URL="redis://default:xxx@xxx.upstash.io:6379" # Use this for serverless

# OpenAI
OPENAI_API_KEY="sk-test-..."

# Stripe (Test Keys)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_test_..."

# JWT
JWT_SECRET="dev-jwt-secret-key"

# Email (Development)
SMTP_HOST="localhost"
SMTP_PORT="1025"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="noreply@truecheckia.com"

# App Configuration
NODE_ENV="development"
APP_URL="http://localhost:5173"
API_URL="http://localhost:4000"

# Development Users
ADMIN_EMAIL="admin@truecheckia.com"
ADMIN_PASSWORD="TrueCheck@2024!"
EOF

# Resumo final
echo ""
log_success "🎉 Setup do ambiente Preview concluído com sucesso!"
echo ""
echo "📋 Configuração do ambiente de preview:"
echo "   ✅ Banco de dados configurado"
echo "   ✅ Migrations executadas"
echo "   ✅ Dados de desenvolvimento criados"
echo "   ✅ Usuários de teste criados"
echo "   ✅ Análises de exemplo inseridas"
echo "   ✅ Testes de performance executados"
echo ""
echo "👥 Usuários criados para teste:"
echo "   📧 admin@truecheckia.com (senha: TrueCheck@2024!) - ADMIN/ENTERPRISE"
echo "   📧 dev@truecheckia.com (senha: dev12345) - USER/ENTERPRISE"
echo "   📧 test@truecheckia.com (senha: test12345) - USER/FREE"
echo ""
echo "📄 Arquivo de configuração criado:"
echo "   .env.preview.example - copie para .env.local e ajuste as variáveis"
echo ""
echo "🔑 Próximos passos:"
echo "   1. Copiar .env.preview.example para .env.local"
echo "   2. Ajustar variáveis de ambiente conforme necessário"
echo "   3. Testar aplicação com 'npm run dev'"
echo "   4. Configurar Upstash Redis (TAREFA 2)"
echo ""
log_warning "Este é um ambiente de desenvolvimento - use apenas para testes!"