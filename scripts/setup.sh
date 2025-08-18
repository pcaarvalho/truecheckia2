#!/bin/bash

# TrueCheckIA - Initial Setup Script

set -e

echo "🚀 TrueCheckIA Setup Script"
echo "=========================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "📋 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration (OpenAI API key, Stripe keys, etc.)"
    echo "Press enter to continue after editing .env..."
    read
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "🗄️ Running database migrations..."
cd packages/database
npx prisma generate
npx prisma db push
cd ../..

# Seed database (optional)
# echo "🌱 Seeding database..."
# npm run db:seed

echo "✅ Setup complete!"
echo ""
echo "You can now start the development servers:"
echo "  npm run dev"
echo ""
echo "Services running:"
echo "  PostgreSQL: localhost:5432"
echo "  Redis: localhost:6379"
echo "  Mailhog: http://localhost:8025"
echo ""
echo "Once started:"
echo "  API: http://localhost:4000"
echo "  Frontend: http://localhost:3000"
echo "  API Docs: http://localhost:4000/api-docs"