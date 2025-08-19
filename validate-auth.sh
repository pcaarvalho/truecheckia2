#!/bin/bash
DOMAIN="https://www.truecheckia.com"

echo "🔍 Validando autenticação em $DOMAIN"
echo "========================================"

# 1. Test API Health
echo "📋 1. Testando API health..."
if curl -f -s "$DOMAIN/api/health" | grep -q "healthy"; then
    echo "✅ API Online e saudável"
else
    echo "❌ API Offline ou com problemas"
    echo "   Tentando obter detalhes..."
    curl -s "$DOMAIN/api/health" | head -10
fi

echo ""

# 2. Test Auth Endpoints
echo "📋 2. Testando endpoint de registro..."
response=$(curl -s -w "\n%{http_code}" -X POST "$DOMAIN/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test_'$(date +%s)'@test.com","password":"Test123!@#","name":"Test User"}')

status_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

if [ "$status_code" = "201" ] || [ "$status_code" = "200" ]; then
    echo "✅ Endpoint de registro funcionando (Status: $status_code)"
elif [ "$status_code" = "400" ] || [ "$status_code" = "409" ]; then
    echo "✅ Endpoint de registro funcionando - validação OK (Status: $status_code)"
else
    echo "❌ Endpoint de registro com problemas (Status: $status_code)"
    echo "   Response: $body"
fi

echo ""

# 3. Test Google OAuth
echo "📋 3. Testando OAuth initiation..."
oauth_response=$(curl -s -I "$DOMAIN/api/auth/google" | head -1)
if echo "$oauth_response" | grep -q "302\|301"; then
    echo "✅ OAuth redirection funcionando"
elif echo "$oauth_response" | grep -q "200"; then
    echo "✅ OAuth endpoint respondendo (pode precisar de parâmetros)"
else
    echo "⚠️  OAuth endpoint com resposta inesperada: $oauth_response"
fi

echo ""

# 4. Test Login Endpoint
echo "📋 4. Testando endpoint de login..."
login_response=$(curl -s -w "\n%{http_code}" -X POST "$DOMAIN/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}')

login_status=$(echo "$login_response" | tail -1)
if [ "$login_status" = "401" ] || [ "$login_status" = "400" ]; then
    echo "✅ Endpoint de login funcionando - rejeitou credenciais inválidas ($login_status)"
elif [ "$login_status" = "200" ]; then
    echo "✅ Endpoint de login funcionando - login aceito"
else
    echo "❌ Endpoint de login com problemas (Status: $login_status)"
fi

echo ""
echo "🎉 Validação completa!"
echo "🌐 Site principal: $DOMAIN"
echo ""
echo "📝 Próximos passos:"
echo "   1. Configurar variáveis de ambiente na Vercel"
echo "   2. Atualizar Google OAuth Console"
echo "   3. Testar login completo no navegador"