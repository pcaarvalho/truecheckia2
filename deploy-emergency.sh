#!/bin/bash

echo "🚨 DEPLOY DE EMERGÊNCIA - TRUECHECKIA2 🚨"
echo "======================================="

# Verificar se estamos no diretório correto
if [ ! -f "vercel.json" ]; then
    echo "❌ Erro: vercel.json não encontrado. Execute este script no diretório raiz do projeto."
    exit 1
fi

echo "📋 Verificando configurações..."

# Verificar se o Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI não encontrado. Instalando..."
    npm install -g vercel
fi

echo "🔧 Limpando cache e preparando build..."

# Limpar cache do npm
cd frontend && npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Voltar ao diretório raiz
cd ..

echo "🏗️ Testando build local..."
npm run build:vercel

if [ $? -ne 0 ]; then
    echo "❌ Build local falhou. Parando deploy."
    exit 1
fi

echo "✅ Build local OK! Fazendo deploy..."

# Deploy com force
vercel --prod --force

if [ $? -eq 0 ]; then
    echo "✅ Deploy realizado com sucesso!"
    echo "🌐 Projeto: truecheckiagpt"
else
    echo "❌ Deploy falhou. Tentando deploy com debug..."
    vercel --prod --force --debug
fi

echo "📊 Status final:"
vercel ls truecheckiagpt

echo "======================================="
echo "🏁 Script finalizado!"