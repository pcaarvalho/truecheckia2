#!/bin/bash
URL="https://truecheckiagpt.vercel.app"

echo "🔍 Validando deploy do TrueCheckIA..."
echo "URL: $URL"
echo "================================"

# Testar página principal
echo "📋 Testando página principal..."
if curl -f -s "$URL" | grep -q "TrueCheckIA\|<!DOCTYPE html>"; then
    echo "✅ Site principal carregou corretamente"
else
    echo "❌ ERRO: Site principal não carregou"
    exit 1
fi

# Testar API proxy
echo "📋 Testando API proxy..."
api_response=$(curl -s -w "%{http_code}" "$URL/api/health" -m 10 -o /dev/null)
if [ "$api_response" = "200" ] || [ "$api_response" = "404" ]; then
    echo "✅ API proxy está respondendo (status: $api_response)"
else
    echo "⚠️  API proxy pode estar com problemas (status: $api_response)"
fi

# Testar assets estáticos
echo "📋 Testando assets..."
if curl -f -s "$URL/favicon.ico" > /dev/null 2>&1; then
    echo "✅ Assets estáticos acessíveis"
else
    echo "⚠️  Alguns assets podem não estar carregando"
fi

# Verificar headers de cache
echo "📋 Verificando headers..."
cache_header=$(curl -s -I "$URL/assets/" 2>/dev/null | grep -i cache-control || echo "Não encontrado")
echo "Cache-Control: $cache_header"

echo ""
echo "🎉 Validação concluída!"
echo "🚀 Site deployado em: $URL"
echo ""