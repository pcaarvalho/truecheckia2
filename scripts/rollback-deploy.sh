#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Initiating deployment rollback...${NC}"
echo "================================"

# Check if we're in CI/CD environment
if [ -z "$VERCEL_TOKEN" ]; then
    echo -e "${RED}❌ VERCEL_TOKEN not found${NC}"
    echo "Manual rollback required via Vercel dashboard"
    exit 1
fi

# Get project information
PROJECT_NAME=${VERCEL_PROJECT_NAME:-"truecheckia"}
echo "📋 Project: $PROJECT_NAME"

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# 1. Get current deployments
echo ""
echo "📋 Fetching deployment history..."

# Get the last 5 deployments
DEPLOYMENTS=$(vercel list --token=$VERCEL_TOKEN --scope=$VERCEL_TEAM_ID 2>/dev/null || vercel list --token=$VERCEL_TOKEN 2>/dev/null || echo "")

if [ -z "$DEPLOYMENTS" ]; then
    echo -e "${RED}❌ Failed to fetch deployments${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Deployment history retrieved${NC}"

# 2. Find the current production deployment
echo ""
echo "🔍 Finding current production deployment..."

CURRENT_PROD=$(echo "$DEPLOYMENTS" | grep "PRODUCTION" | head -n 1 | awk '{print $1}')

if [ -z "$CURRENT_PROD" ]; then
    echo -e "${RED}❌ No current production deployment found${NC}"
    exit 1
fi

echo "Current production: $CURRENT_PROD"

# 3. Find the previous stable deployment
echo ""
echo "🔍 Finding previous stable deployment..."

# Get all production deployments except the current one
PREVIOUS_DEPLOYMENTS=$(echo "$DEPLOYMENTS" | grep "PRODUCTION" | tail -n +2)

if [ -z "$PREVIOUS_DEPLOYMENTS" ]; then
    echo -e "${RED}❌ No previous deployment found for rollback${NC}"
    echo "This might be the first deployment. Manual intervention required."
    exit 1
fi

PREVIOUS_DEPLOYMENT=$(echo "$PREVIOUS_DEPLOYMENTS" | head -n 1 | awk '{print $1}')
echo "Previous deployment: $PREVIOUS_DEPLOYMENT"

# 4. Verify the previous deployment is healthy
echo ""
echo "🏥 Checking previous deployment health..."

PREVIOUS_URL="https://$PREVIOUS_DEPLOYMENT-$PROJECT_NAME.vercel.app"

# Quick health check
if curl -sSf "$PREVIOUS_URL/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Previous deployment is healthy${NC}"
else
    print_warning "Previous deployment health check failed, proceeding anyway..."
fi

# 5. Perform the rollback
echo ""
echo "🔄 Rolling back to previous deployment..."

# Promote the previous deployment to production
ROLLBACK_RESULT=$(vercel promote "$PREVIOUS_DEPLOYMENT" --token=$VERCEL_TOKEN --scope=$VERCEL_TEAM_ID 2>&1 || vercel promote "$PREVIOUS_DEPLOYMENT" --token=$VERCEL_TOKEN 2>&1 || echo "FAILED")

if echo "$ROLLBACK_RESULT" | grep -q "Success"; then
    echo -e "${GREEN}✅ Rollback successful${NC}"
    
    # Get the new production URL
    NEW_PROD_URL=$(echo "$ROLLBACK_RESULT" | grep -o "https://[^[:space:]]*" | head -n 1)
    
    if [ -n "$NEW_PROD_URL" ]; then
        echo "New production URL: $NEW_PROD_URL"
    fi
    
else
    echo -e "${RED}❌ Rollback failed${NC}"
    echo "Error: $ROLLBACK_RESULT"
    
    # Try alternative approach - redeploy previous version
    echo ""
    echo "🔄 Attempting alternative rollback method..."
    
    # Get the git commit of the previous deployment
    PREVIOUS_COMMIT=$(vercel inspect "$PREVIOUS_DEPLOYMENT" --token=$VERCEL_TOKEN 2>/dev/null | grep -o '"gitSource":{"type":"github".*"sha":"[^"]*"' | grep -o 'sha":"[^"]*"' | cut -d'"' -f3)
    
    if [ -n "$PREVIOUS_COMMIT" ]; then
        echo "Previous commit: $PREVIOUS_COMMIT"
        
        # Checkout the previous commit and redeploy
        if git checkout "$PREVIOUS_COMMIT" 2>/dev/null; then
            echo "🔄 Redeploying from commit $PREVIOUS_COMMIT..."
            vercel deploy --prod --token=$VERCEL_TOKEN --force
            git checkout main 2>/dev/null || git checkout master 2>/dev/null || true
        else
            echo -e "${RED}❌ Failed to checkout previous commit${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Could not determine previous commit${NC}"
        exit 1
    fi
fi

# 6. Verify rollback success
echo ""
echo "🔍 Verifying rollback..."

# Wait a moment for DNS propagation
sleep 30

PRODUCTION_URL="https://$PROJECT_NAME.vercel.app"

# Check if the rolled-back deployment is working
if curl -sSf "$PRODUCTION_URL/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Rollback verification successful${NC}"
    
    # Get current deployment info
    CURRENT_INFO=$(curl -s "$PRODUCTION_URL/api/health" 2>/dev/null || echo '{}')
    echo "Current deployment status: $CURRENT_INFO"
    
else
    echo -e "${RED}❌ Rollback verification failed${NC}"
    echo "Production site may still be experiencing issues"
    exit 1
fi

# 7. Database rollback check
echo ""
echo "🗄️  Database rollback considerations..."

print_warning "Database state was not automatically rolled back"
print_warning "If database migrations were run, manual intervention may be required"
print_warning "Check database schema compatibility with rolled-back code"

# 8. Cleanup and notifications
echo ""
echo "🧹 Post-rollback tasks..."

# Mark the failed deployment
if [ -n "$CURRENT_PROD" ]; then
    echo "Failed deployment: $CURRENT_PROD"
    # Could add deployment alias removal or marking here
fi

# Final summary
echo ""
echo "================================"
echo -e "${GREEN}🎉 Rollback completed successfully!${NC}"
echo ""
echo "📊 Rollback Summary:"
echo "• Previous production: $CURRENT_PROD"
echo "• Rolled back to: $PREVIOUS_DEPLOYMENT"
echo "• Production URL: $PRODUCTION_URL"
echo "• Rollback time: $(date)"
echo ""
echo -e "${YELLOW}⚠️  Important Notes:${NC}"
echo "• Monitor the application for stability"
echo "• Review failed deployment logs"
echo "• Check database compatibility"
echo "• Update team about the rollback"
echo "• Plan fix for the original issue"

exit 0