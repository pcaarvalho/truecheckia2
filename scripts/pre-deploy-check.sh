#!/bin/bash
set -e

echo "🚀 Running pre-deployment checks..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
OVERALL_STATUS=0

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        OVERALL_STATUS=1
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "📋 Pre-deployment Checklist"
echo "================================"

# 1. Environment Variables Check
echo "🔍 Checking environment variables..."
REQUIRED_VARS=(
    "DATABASE_URL"
    "OPENAI_API_KEY"
    "JWT_SECRET"
    "STRIPE_SECRET_KEY"
    "UPSTASH_REDIS_URL"
)

ENV_STATUS=0
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Missing: $var${NC}"
        ENV_STATUS=1
    else
        echo -e "${GREEN}✅ Found: $var${NC}"
    fi
done
print_status $ENV_STATUS "Environment variables"

# 2. Dependencies Check
echo ""
echo "📦 Checking dependencies..."
DEPS_STATUS=0

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${RED}❌ Root node_modules not found${NC}"
    DEPS_STATUS=1
else
    echo -e "${GREEN}✅ Root dependencies installed${NC}"
fi

# Check frontend dependencies
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${RED}❌ Frontend node_modules not found${NC}"
    DEPS_STATUS=1
else
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
fi

print_status $DEPS_STATUS "Dependencies"

# 3. TypeScript Check
echo ""
echo "🔧 Running TypeScript checks..."
TS_STATUS=0

# Frontend TypeScript check
cd frontend
if ! npm run type-check > /dev/null 2>&1; then
    echo -e "${RED}❌ Frontend TypeScript errors${NC}"
    TS_STATUS=1
else
    echo -e "${GREEN}✅ Frontend TypeScript clean${NC}"
fi
cd ..

print_status $TS_STATUS "TypeScript validation"

# 4. Linting Check
echo ""
echo "🧹 Running linting checks..."
LINT_STATUS=0

# Root linting
if ! npm run lint > /dev/null 2>&1; then
    echo -e "${RED}❌ Root linting errors${NC}"
    LINT_STATUS=1
else
    echo -e "${GREEN}✅ Root linting clean${NC}"
fi

# Frontend linting
cd frontend
if ! npm run lint > /dev/null 2>&1; then
    echo -e "${RED}❌ Frontend linting errors${NC}"
    LINT_STATUS=1
else
    echo -e "${GREEN}✅ Frontend linting clean${NC}"
fi
cd ..

print_status $LINT_STATUS "Code linting"

# 5. Build Test
echo ""
echo "🏗️  Testing build process..."
BUILD_STATUS=0

cd frontend
if ! npm run build > /dev/null 2>&1; then
    echo -e "${RED}❌ Frontend build failed${NC}"
    BUILD_STATUS=1
else
    echo -e "${GREEN}✅ Frontend build successful${NC}"
    
    # Check build output
    if [ ! -d "dist" ]; then
        echo -e "${RED}❌ Build output directory missing${NC}"
        BUILD_STATUS=1
    else
        BUILD_SIZE=$(du -sh dist | cut -f1)
        echo -e "${GREEN}📁 Build size: $BUILD_SIZE${NC}"
        
        # Warn if build is too large
        SIZE_KB=$(du -sk dist | cut -f1)
        if [ $SIZE_KB -gt 10240 ]; then # 10MB
            print_warning "Build size is large (${BUILD_SIZE}). Consider optimization."
        fi
    fi
fi
cd ..

print_status $BUILD_STATUS "Build process"

# 6. Serverless Validation
echo ""
echo "☁️  Validating serverless configuration..."
SERVERLESS_STATUS=0

# Check vercel.json exists
if [ ! -f "vercel.json" ]; then
    echo -e "${RED}❌ vercel.json not found${NC}"
    SERVERLESS_STATUS=1
else
    echo -e "${GREEN}✅ vercel.json found${NC}"
fi

# Check API functions exist
if [ ! -d "api" ]; then
    echo -e "${RED}❌ API functions directory not found${NC}"
    SERVERLESS_STATUS=1
else
    FUNCTION_COUNT=$(find api -name "*.ts" | wc -l)
    echo -e "${GREEN}✅ Found $FUNCTION_COUNT serverless functions${NC}"
fi

# Run serverless validation if script exists
if [ -f "scripts/validate-serverless-setup.ts" ]; then
    if npm run validate:serverless > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Serverless validation passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Serverless validation warnings${NC}"
        # Don't fail the deployment for warnings
    fi
fi

print_status $SERVERLESS_STATUS "Serverless configuration"

# 7. Security Check
echo ""
echo "🔒 Running security checks..."
SECURITY_STATUS=0

# Check for sensitive files
SENSITIVE_FILES=(".env" ".env.local" "private.key" "*.pem")
for pattern in "${SENSITIVE_FILES[@]}"; do
    if find . -name "$pattern" -not -path "./node_modules/*" -not -path "./frontend/node_modules/*" | grep -q .; then
        print_warning "Sensitive files found matching pattern: $pattern"
    fi
done

# Basic npm audit (don't fail on warnings)
if npm audit --audit-level=high > /dev/null 2>&1; then
    echo -e "${GREEN}✅ No high/critical vulnerabilities${NC}"
else
    print_warning "Security vulnerabilities detected. Run 'npm audit' for details."
fi

print_status $SECURITY_STATUS "Security checks"

# 8. Database Connectivity (if in CI)
if [ "$CI" = "true" ] && [ -n "$DATABASE_URL" ]; then
    echo ""
    echo "🗄️  Testing database connectivity..."
    DB_STATUS=0
    
    if npm run test:neon > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database connection successful${NC}"
    else
        echo -e "${RED}❌ Database connection failed${NC}"
        DB_STATUS=1
    fi
    
    print_status $DB_STATUS "Database connectivity"
fi

# 9. Redis Connectivity (if in CI)
if [ "$CI" = "true" ] && [ -n "$UPSTASH_REDIS_URL" ]; then
    echo ""
    echo "📡 Testing Redis connectivity..."
    REDIS_STATUS=0
    
    if npm run test:upstash > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis connection successful${NC}"
    else
        echo -e "${RED}❌ Redis connection failed${NC}"
        REDIS_STATUS=1
    fi
    
    print_status $REDIS_STATUS "Redis connectivity"
fi

# Final Summary
echo ""
echo "================================"
if [ $OVERALL_STATUS -eq 0 ]; then
    echo -e "${GREEN}🎉 All pre-deployment checks passed!${NC}"
    echo -e "${GREEN}✅ Ready for deployment${NC}"
else
    echo -e "${RED}💥 Some checks failed!${NC}"
    echo -e "${RED}❌ Fix issues before deploying${NC}"
fi

echo ""
echo "📊 Deployment Summary:"
echo "• Environment: Production"
echo "• Commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'Unknown')"
echo "• Branch: $(git branch --show-current 2>/dev/null || echo 'Unknown')"
echo "• Time: $(date)"
echo "• Build size: ${BUILD_SIZE:-'Unknown'}"

exit $OVERALL_STATUS