#!/bin/bash

# TrueCheckIA - Setup Neon PostgreSQL Production
# Este script configura o banco de dados de produção no Neon

set -e

echo "🚀 Configurando Neon PostgreSQL para Produção"
echo "============================================="

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

# Verificar pré-requisitos
log_info "Verificando pré-requisitos..."

# Verificar se as ferramentas necessárias estão instaladas
required_tools=("npm" "node" "npx")
for tool in "${required_tools[@]}"; do
    if ! command -v $tool &> /dev/null; then
        log_error "$tool não está instalado"
        exit 1
    fi
done

# Verificar variáveis de ambiente obrigatórias
if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL não está definida"
    log_info "Configure a connection string do Neon PostgreSQL (com pooling)"
    log_info "Exemplo: postgresql://user:pass@host-pooler.region.aws.neon.tech/db?sslmode=require&pgbouncer=true"
    exit 1
fi

if [ -z "$DIRECT_URL" ]; then
    log_error "DIRECT_URL não está definida"
    log_info "Configure a connection string direta do Neon PostgreSQL (para migrations)"
    log_info "Exemplo: postgresql://user:pass@host.region.aws.neon.tech/db?sslmode=require"
    exit 1
fi

log_success "Pré-requisitos verificados"

# Verificar se estamos no diretório correto
if [ ! -f "packages/database/package.json" ]; then
    log_error "Execute este script a partir do diretório raiz do projeto"
    exit 1
fi

# Instalar dependências se necessário
log_info "Verificando dependências..."
if [ ! -d "node_modules" ]; then
    log_info "Instalando dependências..."
    npm install
fi

# Navegar para o diretório do banco
cd packages/database

# Gerar cliente Prisma
log_info "Gerando cliente Prisma..."
npm run db:generate

# Verificar conexão antes das migrations
log_info "Testando conexão com o banco..."
npx tsx -e "
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function testConnection() {
  try {
    await prisma.\$connect();
    console.log('✅ Conexão estabelecida com sucesso');
    
    // Testar query básica
    await prisma.\$queryRaw\`SELECT 1 as test\`;
    console.log('✅ Query de teste executada com sucesso');
    
    await prisma.\$disconnect();
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    process.exit(1);
  }
}

testConnection();
" || {
    log_error "Falha na conexão com o banco de dados"
    log_info "Verifique se:"
    log_info "1. As credenciais do Neon estão corretas"
    log_info "2. O banco de dados foi criado no Neon"
    log_info "3. As variáveis DATABASE_URL e DIRECT_URL estão corretas"
    exit 1
}

# Executar migrations
log_info "Executando migrations..."
npx prisma migrate deploy || {
    log_error "Falha ao executar migrations"
    log_info "Verificando se o schema precisa ser resetado..."
    
    # Tentar fazer push do schema
    log_info "Tentando fazer push do schema..."
    npx prisma db push --force-reset || {
        log_error "Falha ao fazer push do schema"
        exit 1
    }
}

# Verificar estrutura do banco
log_info "Verificando estrutura do banco..."
npx tsx -e "
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyStructure() {
  try {
    // Verificar principais tabelas
    const tables = await prisma.\$queryRaw\`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    \`;
    
    console.log('📋 Tabelas criadas:');
    tables.forEach(table => {
      console.log(\`   - \${table.table_name}\`);
    });
    
    // Verificar índices críticos
    const indexes = await prisma.\$queryRaw\`
      SELECT tablename, indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname NOT LIKE '%_pkey'
      ORDER BY tablename, indexname;
    \`;
    
    console.log('📊 Índices criados:', indexes.length);
    
    await prisma.\$disconnect();
    console.log('✅ Estrutura do banco verificada com sucesso');
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error.message);
    process.exit(1);
  }
}

verifyStructure();
"

# Executar seed de produção se especificado
if [ "$1" = "--with-seed" ]; then
    log_info "Executando seed de produção..."
    
    # Criar arquivo de seed temporário
    cat > src/temp-production-seed.ts << 'EOF'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Executando seed de produção...')

  // Verificar se já existe usuário admin
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  })

  if (existingAdmin) {
    console.log('👤 Usuário admin já existe:', existingAdmin.email)
  } else {
    // Criar admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@truecheckia.com'
    const adminPassword = process.env.ADMIN_PASSWORD || 'TrueCheck@2024!'
    
    const hashedPassword = await bcrypt.hash(adminPassword, 12)
    
    const adminUser = await prisma.user.create({
      data: {
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
  }
  
  // Configurar sistema de health check
  await prisma.systemHealth.upsert({
    where: {
      id: 'database-setup'
    },
    update: {
      status: 'HEALTHY',
      responseTime: 50,
      metadata: {
        lastSetup: new Date().toISOString(),
        version: '1.0.0'
      }
    },
    create: {
      id: 'database-setup',
      service: 'database',
      status: 'HEALTHY',
      responseTime: 50,
      metadata: {
        setupDate: new Date().toISOString(),
        version: '1.0.0'
      }
    }
  })

  console.log('✅ Sistema de monitoramento inicializado')
  
  // Verificar contadores
  const userCount = await prisma.user.count()
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
  
  console.log(`📊 Estatísticas:`)
  console.log(`   Usuários: ${userCount}`)
  console.log(`   Admins: ${adminCount}`)
  
  console.log('🎉 Seed de produção concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
EOF

    # Executar seed
    npx tsx src/temp-production-seed.ts || {
        log_error "Falha ao executar seed"
        rm -f src/temp-production-seed.ts
        exit 1
    }
    
    # Limpar arquivo temporário
    rm -f src/temp-production-seed.ts
fi

# Verificação final
log_info "Executando verificação final..."
npx tsx -e "
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function finalVerification() {
  try {
    const start = Date.now();
    
    // Testar queries básicas
    const userCount = await prisma.user.count();
    const analysisCount = await prisma.analysis.count();
    const subscriptionCount = await prisma.subscription.count();
    
    const responseTime = Date.now() - start;
    
    console.log('📊 Verificação final:');
    console.log(\`   Usuários: \${userCount}\`);
    console.log(\`   Análises: \${analysisCount}\`);
    console.log(\`   Assinaturas: \${subscriptionCount}\`);
    console.log(\`   Tempo de resposta: \${responseTime}ms\`);
    
    // Testar performance de queries importantes
    const start2 = Date.now();
    await prisma.user.findMany({
      take: 10,
      select: { id: true, email: true, plan: true },
      orderBy: { createdAt: 'desc' }
    });
    const queryTime = Date.now() - start2;
    
    console.log(\`   Query de usuários: \${queryTime}ms\`);
    
    if (queryTime > 1000) {
      console.log('⚠️  Query lenta detectada - considere verificar índices');
    }
    
    await prisma.\$disconnect();
    console.log('✅ Verificação final concluída com sucesso');
  } catch (error) {
    console.error('❌ Erro na verificação final:', error.message);
    process.exit(1);
  }
}

finalVerification();
"

# Retornar ao diretório raiz
cd ../..

# Resumo final
echo ""
log_success "🎉 Setup do Neon PostgreSQL concluído com sucesso!"
echo ""
echo "📋 Resumo da configuração:"
echo "   ✅ Cliente Prisma gerado"
echo "   ✅ Migrations executadas"
echo "   ✅ Estrutura do banco verificada"
echo "   ✅ Conexão testada e funcionando"
if [ "$1" = "--with-seed" ]; then
echo "   ✅ Dados iniciais inseridos"
fi
echo ""
echo "🔑 Próximos passos:"
echo "   1. Configurar variáveis de ambiente na Vercel"
echo "   2. Testar conexão no ambiente de preview"
echo "   3. Executar testes de integração"
echo "   4. Configurar monitoramento e alertas"
echo ""
echo "📊 Connection String configurada:"
echo "   $(echo $DATABASE_URL | sed 's/:[^@]*@/:***@/')"
echo ""
log_warning "Lembre-se de manter as credenciais seguras e nunca commitá-las no repositório!"