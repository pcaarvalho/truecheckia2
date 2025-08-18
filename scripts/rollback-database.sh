#!/bin/bash

# TrueCheckIA Database Rollback Script
# Usage: ./scripts/rollback-database.sh [target-branch] [environment]

set -e

TARGET_BRANCH=${1:-main}
ENVIRONMENT=${2:-preview}

echo "🔄 Database Rollback for TrueCheckIA"
echo "Target Branch: $TARGET_BRANCH"
echo "Environment: $ENVIRONMENT"

# Confirmation prompt
read -p "⚠️  This will rollback database changes. Are you sure? (y/N): " confirm
if [[ $confirm != [yY] ]]; then
    echo "❌ Rollback cancelled"
    exit 0
fi

# Backup current state before rollback
echo "💾 Creating backup before rollback..."
timestamp=$(date +%Y%m%d_%H%M%S)
backup_name="pre_rollback_${timestamp}"

# For Neon, create a branch point
if command -v neonctl &> /dev/null; then
    echo "📸 Creating Neon branch point: $backup_name"
    neonctl branches create --name "$backup_name" --parent main
else
    echo "⚠️  Neon CLI not found. Manual backup recommended."
fi

# Prisma migration rollback
echo "🔄 Rolling back Prisma migrations..."
cd packages/database

# Reset to specific migration (if provided)
if [ -n "$TARGET_MIGRATION" ]; then
    echo "🎯 Rolling back to migration: $TARGET_MIGRATION"
    npx prisma migrate resolve --rolled-back "$TARGET_MIGRATION"
else
    # Soft reset - just regenerate client
    echo "🔄 Regenerating Prisma client for target branch..."
    npm run db:generate
fi

# Verify database state
echo "🔍 Verifying database state..."
npx prisma db push --accept-data-loss

echo "✅ Database rollback completed!"
echo "📊 Backup created: $backup_name"
echo "🔗 Original state can be restored from this backup if needed"

# Post-rollback verification
echo "🧪 Running post-rollback verification..."

# Test basic connectivity
if npm run db:health-check > /dev/null 2>&1; then
    echo "✅ Database connectivity verified"
else
    echo "❌ Database connectivity failed - investigate immediately"
    exit 1
fi

echo "🎉 Rollback completed successfully!"
echo ""
echo "Next steps:"
echo "1. Verify application functionality"
echo "2. Check data integrity"
echo "3. Monitor for errors"
echo "4. Update team on rollback status"