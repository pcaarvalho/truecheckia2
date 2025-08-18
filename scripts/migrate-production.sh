#!/bin/bash

# TrueCheckIA Production Migration Script
# Usage: ./scripts/migrate-production.sh

set -e

echo "🚀 Starting TrueCheckIA Production Migration..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

# Navigate to database package
cd packages/database

echo "📦 Generating Prisma client..."
npm run db:generate

echo "🔄 Running database migrations..."
npm run db:migrate:production

echo "🌱 Seeding production database (if needed)..."
# Only run seed for initial setup
if [ "$SEED_DB" = "true" ]; then
    npm run db:seed:production
fi

echo "✅ Production migration completed successfully!"
echo "📊 Database ready at: $(echo $DATABASE_URL | sed 's/:[^@]*@/:***@/')"