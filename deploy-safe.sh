#!/bin/bash

# SCRIPT DE DEPLOY SEGURO - TrueCheckIA
# Verifica tudo antes de fazer commit e monitora deploy

set -e  # Parar se qualquer comando falhar

COMMIT_MSG="$1"
if [ -z "$COMMIT_MSG" ]; then
    echo "❌ Uso: ./deploy-safe.sh \"mensagem do commit\""
    exit 1
fi

echo "🔍 VALIDAÇÃO PRÉ-DEPLOY - TrueCheckIA"
echo "=================================================="

# 1. Verificar se vercel.json é válido
echo "📋 1. Validando vercel.json..."
if ! node -e "JSON.parse(require('fs').readFileSync('vercel.json', 'utf8'))"; then
    echo "❌ vercel.json inválido!"
    exit 1
fi
echo "✅ vercel.json válido"

# 2. Testar build do frontend
echo "📋 2. Testando build do frontend..."
cd frontend
if ! npm run build >/dev/null 2>&1; then
    echo "❌ Build do frontend falhou!"
    npm run build
    exit 1
fi
cd ..
echo "✅ Build do frontend OK"

# 3. Verificar TypeScript do frontend (já incluído no build)
echo "📋 3. Verificando TypeScript do frontend..."
cd frontend
if ! npm run type-check >/dev/null 2>&1; then
    echo "❌ Erros de TypeScript no frontend detectados!"
    npm run type-check
    exit 1
fi
cd ..
echo "✅ TypeScript OK"

# 4. Verificar se arquivos críticos existem
echo "📋 4. Verificando arquivos críticos..."
critical_files=(
    "api/health.ts"
    "api/auth/register.ts"
    "api/auth/login.ts"
    "api/auth/google.ts"
    "api/auth/google/callback.ts"
)

for file in "${critical_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Arquivo crítico ausente: $file"
        exit 1
    fi
done
echo "✅ Arquivos críticos OK"

# 5. Commit seguro
echo "📋 5. Fazendo commit seguro..."
git add .
git status --porcelain

if [ -n "$(git status --porcelain)" ]; then
    git commit -m "$COMMIT_MSG"
    echo "✅ Commit realizado"
else
    echo "⚠️ Nenhuma mudança para commit"
fi

# 6. Push com verificação
echo "📋 6. Enviando para GitHub..."
git push origin main
echo "✅ Push realizado"

# 7. Aguardar deploy da Vercel
echo "📋 7. Aguardando deploy da Vercel..."
echo "⏳ Aguardando 30 segundos para o deploy processar..."
sleep 30

# 8. Verificar se API está respondendo
echo "📋 8. Verificando API..."
max_attempts=6
attempt=1

while [ $attempt -le $max_attempts ]; do
    echo "   Tentativa $attempt/$max_attempts..."
    
    # Testar health endpoint
    if curl -f -s https://www.truecheckia.com/api/health >/dev/null 2>&1; then
        echo "✅ API está respondendo!"
        break
    elif [ $attempt -eq $max_attempts ]; then
        echo "❌ API não está respondendo após $max_attempts tentativas"
        echo "🔍 Verificando logs da Vercel..."
        vercel logs --since 5m 2>/dev/null || echo "Instale Vercel CLI para ver logs: npm i -g vercel"
        exit 1
    else
        echo "   ⏳ API ainda não está pronta, aguardando 15s..."
        sleep 15
    fi
    
    ((attempt++))
done

# 9. Testes de validação rápida
echo "📋 9. Executando testes de validação..."

# Teste de registro (deve retornar erro 400 para dados inválidos)
register_test=$(curl -s -w "%{http_code}" -X POST https://www.truecheckia.com/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"invalid"}' -o /dev/null)

if [ "$register_test" = "400" ] || [ "$register_test" = "422" ]; then
    echo "✅ Endpoint de registro funcionando"
else
    echo "⚠️ Endpoint de registro retornou: $register_test"
fi

# Teste de login (deve retornar erro 400/401 para dados inválidos)  
login_test=$(curl -s -w "%{http_code}" -X POST https://www.truecheckia.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test","password":"test"}' -o /dev/null)

if [ "$login_test" = "400" ] || [ "$login_test" = "401" ]; then
    echo "✅ Endpoint de login funcionando"
else
    echo "⚠️ Endpoint de login retornou: $login_test"
fi

echo ""
echo "🎉 DEPLOY REALIZADO COM SUCESSO!"
echo "=================================================="
echo "🌐 Site: https://www.truecheckia.com"
echo "🔗 API: https://www.truecheckia.com/api/health"
echo "📊 Logs: vercel logs --follow"
echo ""
echo "📝 Próximos passos:"
echo "   1. Testar login no navegador"
echo "   2. Configurar variáveis de ambiente se necessário"
echo "   3. Atualizar Google OAuth Console"
echo ""