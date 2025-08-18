#!/bin/bash

# TrueCheckIA - Production Deploy Script

set -e

echo "🚀 TrueCheckIA Production Deploy"
echo "================================"

# Check environment
if [ "$1" != "production" ]; then
    echo "⚠️  Warning: This script is for production deployment."
    echo "Usage: ./scripts/deploy.sh production"
    exit 1
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Run database migrations
echo "🗄️ Running database migrations..."
cd packages/database
npx prisma migrate deploy
cd ../..

# Build Docker images
echo "🐳 Building Docker images..."
docker build -t truecheckia-api ./apps/api
docker build -t truecheckia-web ./apps/web

# Tag images for registry (adjust for your registry)
# docker tag truecheckia-api:latest your-registry/truecheckia-api:latest
# docker tag truecheckia-web:latest your-registry/truecheckia-web:latest

# Push to registry (if using)
# docker push your-registry/truecheckia-api:latest
# docker push your-registry/truecheckia-web:latest

echo "✅ Build complete!"
echo ""
echo "Next steps:"
echo "1. Deploy to your hosting provider (Vercel, AWS, etc.)"
echo "2. Set environment variables in production"
echo "3. Run database migrations in production"
echo "4. Start services"