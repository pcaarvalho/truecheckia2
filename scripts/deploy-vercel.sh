#!/bin/bash

# Deploy script para Vercel Functions
# Executa validações e deploy da API do TrueCheckIA

set -e

echo "🚀 Deploying TrueCheckIA API to Vercel Functions"
echo "================================================"

# Verificar se Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI não encontrado. Instalando..."
    npm install -g vercel
fi

# Verificar variáveis de ambiente necessárias
echo "🔍 Verificando variáveis de ambiente..."

required_vars=(
    "DATABASE_URL"
    "JWT_SECRET"
    "OPENAI_API_KEY"
    "UPSTASH_REDIS_REST_URL"
    "UPSTASH_REDIS_REST_TOKEN"
)

missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ Variáveis de ambiente obrigatórias não encontradas:"
    printf '   %s\n' "${missing_vars[@]}"
    echo "   Configure essas variáveis antes do deploy."
    exit 1
fi

echo "✅ Variáveis de ambiente configuradas"

# Verificar se os arquivos necessários existem
echo "🔍 Verificando estrutura dos arquivos..."

required_files=(
    "vercel.json"
    "api/_utils/vercel-adapter.ts"
    "api/health.ts"
    "api/auth/login.ts"
    "api/analysis/check.ts"
)

missing_files=()

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    echo "❌ Arquivos necessários não encontrados:"
    printf '   %s\n' "${missing_files[@]}"
    exit 1
fi

echo "✅ Estrutura de arquivos verificada"

# Build do projeto
echo "🔨 Executando build..."
npm run build

# Executar testes de tipo
echo "🔍 Verificando tipos TypeScript..."
npx tsc --noEmit

echo "✅ Verificação de tipos concluída"

# Deploy para Vercel
echo "🚀 Executando deploy para Vercel..."

if [ "$1" = "--production" ]; then
    echo "📦 Deploy de PRODUÇÃO"
    vercel --prod
else
    echo "🧪 Deploy de PREVIEW"
    vercel
fi

# Aguardar deploy
echo "⏳ Aguardando deploy completar..."
sleep 10

# Obter URL do deploy
DEPLOY_URL=$(vercel ls | grep "truecheckia" | head -1 | awk '{print $2}')

if [ -z "$DEPLOY_URL" ]; then
    echo "❌ Não foi possível obter URL do deploy"
    exit 1
fi

echo "✅ Deploy concluído: https://$DEPLOY_URL"

# Testar endpoints básicos
echo "🧪 Testando endpoints básicos..."

# Health check
echo "   Testing health endpoint..."
health_response=$(curl -s -o /dev/null -w "%{http_code}" "https://$DEPLOY_URL/api/health")

if [ "$health_response" = "200" ]; then
    echo "   ✅ Health check passou"
else
    echo "   ❌ Health check falhou (HTTP $health_response)"
fi

# Status endpoint
echo "   Testing status endpoint..."
status_response=$(curl -s -o /dev/null -w "%{http_code}" "https://$DEPLOY_URL/api/v1/status")

if [ "$status_response" = "200" ]; then
    echo "   ✅ Status endpoint passou"
else
    echo "   ❌ Status endpoint falhou (HTTP $status_response)"
fi

echo ""
echo "🎉 Deploy concluído com sucesso!"
echo "📋 URLs importantes:"
echo "   API Base: https://$DEPLOY_URL"
echo "   Health: https://$DEPLOY_URL/api/health"
echo "   Status: https://$DEPLOY_URL/api/v1/status"
echo ""
echo "📚 Próximos passos:"
echo "   1. Configure o frontend para usar a nova URL da API"
echo "   2. Teste os fluxos principais (auth, analysis)"
echo "   3. Configure monitoramento se necessário"
echo "   4. Atualize DNS se usando domínio personalizado"