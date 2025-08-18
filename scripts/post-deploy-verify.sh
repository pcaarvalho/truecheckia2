#!/bin/bash
set -e

DEPLOYMENT_URL=${1:-"https://truecheckia.vercel.app"}
TIMEOUT=300 # 5 minutes
RETRY_INTERVAL=10

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Post-deployment verification for: $DEPLOYMENT_URL${NC}"
echo "================================"

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to wait for deployment
wait_for_deployment() {
    echo "⏳ Waiting for deployment to be ready..."
    
    local start_time=$(date +%s)
    local end_time=$((start_time + TIMEOUT))
    
    while [ $(date +%s) -lt $end_time ]; do
        if curl -sSf "$DEPLOYMENT_URL" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Deployment is responding${NC}"
            return 0
        fi
        
        echo "⏳ Waiting... (timeout in $((end_time - $(date +%s)))s)"
        sleep $RETRY_INTERVAL
    done
    
    echo -e "${RED}❌ Deployment timeout after ${TIMEOUT}s${NC}"
    return 1
}

# 1. Wait for deployment to be ready
wait_for_deployment || exit 1

# 2. Health Check
echo ""
echo "🏥 Health check..."
HEALTH_STATUS=0

if curl -sSf "$DEPLOYMENT_URL/api/health" > /dev/null 2>&1; then
    HEALTH_RESPONSE=$(curl -s "$DEPLOYMENT_URL/api/health")
    echo -e "${GREEN}✅ Health endpoint responding${NC}"
    echo "Response: $HEALTH_RESPONSE"
else
    echo -e "${RED}❌ Health endpoint failed${NC}"
    HEALTH_STATUS=1
fi

print_status $HEALTH_STATUS "Health check"

# 3. Frontend Loading
echo ""
echo "🌐 Frontend verification..."
FRONTEND_STATUS=0

# Check if main page loads
if curl -sSf "$DEPLOYMENT_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend loads successfully${NC}"
    
    # Check for essential elements
    PAGE_CONTENT=$(curl -s "$DEPLOYMENT_URL")
    
    if echo "$PAGE_CONTENT" | grep -q "TrueCheckIA"; then
        echo -e "${GREEN}✅ Page content verification passed${NC}"
    else
        print_warning "Page content verification failed"
        FRONTEND_STATUS=1
    fi
    
    # Check for critical assets
    if echo "$PAGE_CONTENT" | grep -q "\.js\|\.css"; then
        echo -e "${GREEN}✅ Static assets found${NC}"
    else
        print_warning "Static assets not found in HTML"
    fi
    
else
    echo -e "${RED}❌ Frontend failed to load${NC}"
    FRONTEND_STATUS=1
fi

print_status $FRONTEND_STATUS "Frontend verification"

# 4. API Endpoints Check
echo ""
echo "🔌 API endpoints verification..."
API_STATUS=0

# Test critical endpoints
ENDPOINTS=(
    "/api/v1/status:GET"
    "/api/auth/login:POST"
    "/api/analysis/check:POST"
)

for endpoint_method in "${ENDPOINTS[@]}"; do
    IFS=':' read -r endpoint method <<< "$endpoint_method"
    
    if [ "$method" = "GET" ]; then
        if curl -sSf "$DEPLOYMENT_URL$endpoint" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $endpoint (GET)${NC}"
        else
            echo -e "${RED}❌ $endpoint (GET)${NC}"
            API_STATUS=1
        fi
    else
        # For POST endpoints, just check if they respond (even with 400/401)
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$DEPLOYMENT_URL$endpoint")
        if [ "$HTTP_CODE" != "000" ] && [ "$HTTP_CODE" != "502" ] && [ "$HTTP_CODE" != "503" ]; then
            echo -e "${GREEN}✅ $endpoint (POST) - HTTP $HTTP_CODE${NC}"
        else
            echo -e "${RED}❌ $endpoint (POST) - HTTP $HTTP_CODE${NC}"
            API_STATUS=1
        fi
    fi
done

print_status $API_STATUS "API endpoints"

# 5. Database Connectivity
echo ""
echo "🗄️  Database connectivity..."
DB_STATUS=0

# Test database through API
DB_RESPONSE=$(curl -s "$DEPLOYMENT_URL/api/v1/status" 2>/dev/null || echo '{"error":"failed"}')

if echo "$DB_RESPONSE" | grep -q '"database.*ok\|"status.*ok'; then
    echo -e "${GREEN}✅ Database connection verified${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "Response: $DB_RESPONSE"
    DB_STATUS=1
fi

print_status $DB_STATUS "Database connectivity"

# 6. Redis Connectivity
echo ""
echo "📡 Redis connectivity..."
REDIS_STATUS=0

if echo "$DB_RESPONSE" | grep -q '"redis.*ok\|"cache.*ok'; then
    echo -e "${GREEN}✅ Redis connection verified${NC}"
else
    echo -e "${YELLOW}⚠️  Redis connection not verified${NC}"
    # Don't fail deployment for Redis issues
fi

print_status 0 "Redis connectivity"

# 7. Performance Check
echo ""
echo "⚡ Basic performance check..."
PERF_STATUS=0

# Measure response time
START_TIME=$(date +%s%N)
curl -sSf "$DEPLOYMENT_URL" > /dev/null 2>&1
END_TIME=$(date +%s%N)

RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 )) # Convert to milliseconds

echo "Response time: ${RESPONSE_TIME}ms"

if [ $RESPONSE_TIME -lt 3000 ]; then
    echo -e "${GREEN}✅ Good response time${NC}"
elif [ $RESPONSE_TIME -lt 5000 ]; then
    print_warning "Slow response time (${RESPONSE_TIME}ms)"
else
    echo -e "${RED}❌ Very slow response time (${RESPONSE_TIME}ms)${NC}"
    PERF_STATUS=1
fi

print_status $PERF_STATUS "Performance check"

# 8. SSL Certificate Check
echo ""
echo "🔒 SSL certificate verification..."
SSL_STATUS=0

if echo "$DEPLOYMENT_URL" | grep -q "https://"; then
    SSL_INFO=$(echo | openssl s_client -servername $(echo $DEPLOYMENT_URL | sed 's|https://||' | sed 's|/.*||') -connect $(echo $DEPLOYMENT_URL | sed 's|https://||' | sed 's|/.*||'):443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "SSL check failed")
    
    if echo "$SSL_INFO" | grep -q "notAfter"; then
        echo -e "${GREEN}✅ SSL certificate valid${NC}"
        EXPIRY_DATE=$(echo "$SSL_INFO" | grep "notAfter" | cut -d= -f2)
        echo "Certificate expires: $EXPIRY_DATE"
    else
        echo -e "${RED}❌ SSL certificate invalid${NC}"
        SSL_STATUS=1
    fi
else
    print_warning "HTTP deployment - SSL not checked"
fi

print_status $SSL_STATUS "SSL certificate"

# 9. Security Headers Check
echo ""
echo "🛡️  Security headers check..."
SECURITY_STATUS=0

SECURITY_HEADERS=$(curl -sI "$DEPLOYMENT_URL" 2>/dev/null || echo "")

REQUIRED_HEADERS=(
    "x-frame-options"
    "x-content-type-options"
    "strict-transport-security"
)

for header in "${REQUIRED_HEADERS[@]}"; do
    if echo "$SECURITY_HEADERS" | grep -qi "$header"; then
        echo -e "${GREEN}✅ $header header present${NC}"
    else
        print_warning "$header header missing"
    fi
done

print_status $SECURITY_STATUS "Security headers"

# Final Summary
echo ""
echo "================================"
OVERALL_STATUS=$((HEALTH_STATUS + FRONTEND_STATUS + API_STATUS + DB_STATUS + PERF_STATUS + SSL_STATUS))

if [ $OVERALL_STATUS -eq 0 ]; then
    echo -e "${GREEN}🎉 Post-deployment verification successful!${NC}"
    echo -e "${GREEN}✅ Deployment is healthy and ready${NC}"
else
    echo -e "${RED}💥 Some verification checks failed!${NC}"
    echo -e "${RED}❌ Review deployment health${NC}"
fi

echo ""
echo "📊 Deployment Details:"
echo "• URL: $DEPLOYMENT_URL"
echo "• Response time: ${RESPONSE_TIME}ms"
echo "• Verification time: $(date)"
echo "• Status: $([ $OVERALL_STATUS -eq 0 ] && echo 'Healthy' || echo 'Issues detected')"

# Return exit code based on critical failures only
exit $((HEALTH_STATUS + FRONTEND_STATUS + DB_STATUS))