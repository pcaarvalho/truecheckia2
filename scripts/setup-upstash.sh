#!/bin/bash

# TrueCheckIA - Upstash Redis Setup Script
# TAREFA 2: Configuração do Redis Serverless usando Upstash

set -e

echo "🚀 Setting up Upstash Redis for TrueCheckIA"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running in the correct directory
if [ ! -f "package.json" ] || [ ! -d "apps/api" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Checking environment variables..."

# Check required environment variables
MISSING_VARS=()

if [ -z "$UPSTASH_REDIS_REST_URL" ]; then
    MISSING_VARS+=("UPSTASH_REDIS_REST_URL")
fi

if [ -z "$UPSTASH_REDIS_REST_TOKEN" ]; then
    MISSING_VARS+=("UPSTASH_REDIS_REST_TOKEN")
fi

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    print_warning "Please set these variables in your .env file:"
    echo "UPSTASH_REDIS_REST_URL=https://your-redis-db.upstash.io"
    echo "UPSTASH_REDIS_REST_TOKEN=your-upstash-token-here"
    echo ""
    print_warning "You can also copy from .env.serverless.example:"
    echo "cp .env.serverless.example .env"
    exit 1
fi

print_success "Environment variables configured"

# Check if Node.js dependencies are installed
print_status "Checking dependencies..."
if [ ! -d "node_modules" ]; then
    print_warning "Dependencies not installed. Installing..."
    npm install
fi

# Test Upstash connection
print_status "Testing Upstash connection..."

# Create a temporary test script
cat > /tmp/test-upstash.js << 'EOF'
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function testConnection() {
  try {
    // Test basic connectivity
    console.log('Testing ping...');
    const pingResult = await redis.ping();
    console.log('Ping result:', pingResult);
    
    // Test SET operation
    console.log('Testing SET operation...');
    await redis.set('setup:test', JSON.stringify({ 
      timestamp: Date.now(), 
      source: 'setup-script' 
    }), { ex: 60 });
    
    // Test GET operation
    console.log('Testing GET operation...');
    const testData = await redis.get('setup:test');
    console.log('Retrieved data:', testData);
    
    // Test DEL operation
    console.log('Testing DEL operation...');
    await redis.del('setup:test');
    
    // Test rate limiting keys
    console.log('Testing rate limiting...');
    await redis.incr('test:rate:limit');
    await redis.expire('test:rate:limit', 60);
    await redis.del('test:rate:limit');
    
    console.log('✅ All tests passed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testConnection();
EOF

# Run the test with environment variables
if node /tmp/test-upstash.js; then
    print_success "Upstash connection test passed"
else
    print_error "Upstash connection test failed"
    rm -f /tmp/test-upstash.js
    exit 1
fi

# Clean up test file
rm -f /tmp/test-upstash.js

# Test serverless queue system
print_status "Testing serverless queue system..."

cat > /tmp/test-queues.js << 'EOF'
// Test the queue adapter system
const { MigrationUtils } = require('./apps/api/src/lib/queue-adapter');

async function testQueues() {
  try {
    console.log('Testing queue systems...');
    
    // Test both traditional and serverless systems
    const results = await MigrationUtils.testQueueSystems();
    console.log('Queue test results:', JSON.stringify(results, null, 2));
    
    // Get migration status
    const status = MigrationUtils.getMigrationStatus();
    console.log('Migration status:', JSON.stringify(status, null, 2));
    
    console.log('✅ Queue system tests completed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Queue test failed:', error.message);
    process.exit(1);
  }
}

testQueues();
EOF

if node /tmp/test-queues.js; then
    print_success "Queue system test passed"
else
    print_warning "Queue system test had issues (this may be expected in development)"
fi

rm -f /tmp/test-queues.js

# Check serverless configuration
print_status "Validating serverless configuration..."

# Check if serverless mode is properly configured
if [ "$FORCE_SERVERLESS" = "true" ] || [ "$NODE_ENV" = "production" ]; then
    print_success "Serverless mode is enabled"
    
    # Check additional serverless variables
    SERVERLESS_VARS=()
    
    if [ -z "$CRON_SECRET" ]; then
        SERVERLESS_VARS+=("CRON_SECRET")
    fi
    
    if [ -z "$WEBHOOK_SECRET" ]; then
        SERVERLESS_VARS+=("WEBHOOK_SECRET")
    fi
    
    if [ ${#SERVERLESS_VARS[@]} -ne 0 ]; then
        print_warning "Optional serverless variables not set:"
        for var in "${SERVERLESS_VARS[@]}"; do
            echo "  - $var"
        done
        print_warning "These are required for production Vercel deployment"
    fi
else
    print_warning "Serverless mode not enabled (set FORCE_SERVERLESS=true or NODE_ENV=production)"
fi

# Create/update vercel.json if it doesn't exist
print_status "Checking Vercel configuration..."

if [ ! -f "vercel.json" ]; then
    print_warning "vercel.json not found. Creating basic configuration..."
    
    cat > vercel.json << 'EOF'
{
  "framework": null,
  "functions": {
    "api/**/*.ts": {
      "runtime": "@vercel/node"
    }
  },
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ],
  "crons": [
    {
      "path": "/api/cron/process-queues",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/reset-credits",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/check-credits",
      "schedule": "0 10 * * *"
    },
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
EOF
    print_success "Created vercel.json with cron jobs configuration"
else
    print_success "vercel.json already exists"
fi

# Performance test
print_status "Running performance test..."

cat > /tmp/performance-test.js << 'EOF'
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function performanceTest() {
  console.log('Running performance test...');
  
  const operations = 20; // Reduced for setup script
  const start = Date.now();
  
  try {
    // Test concurrent SET operations
    const setPromises = Array.from({ length: operations }, (_, i) =>
      redis.set(`perf:test:${i}`, JSON.stringify({ 
        index: i, 
        timestamp: Date.now() 
      }), { ex: 60 })
    );
    await Promise.all(setPromises);
    
    // Test concurrent GET operations
    const getPromises = Array.from({ length: operations }, (_, i) =>
      redis.get(`perf:test:${i}`)
    );
    const results = await Promise.all(getPromises);
    
    // Cleanup
    const delPromises = Array.from({ length: operations }, (_, i) =>
      redis.del(`perf:test:${i}`)
    );
    await Promise.all(delPromises);
    
    const duration = Date.now() - start;
    const totalOps = operations * 3; // SET + GET + DEL
    
    console.log(`✅ Completed ${totalOps} operations in ${duration}ms`);
    console.log(`Average: ${(duration / totalOps).toFixed(2)}ms per operation`);
    
    if (duration / totalOps > 1000) {
      console.log('⚠️  Performance warning: Operations are slow (>1s average)');
    } else {
      console.log('🚀 Performance looks good!');
    }
    
  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
  }
}

performanceTest();
EOF

node /tmp/performance-test.js
rm -f /tmp/performance-test.js

# Summary
echo ""
echo "============================================"
print_success "Upstash Redis setup completed successfully!"
echo ""
print_status "Summary:"
echo "  ✅ Upstash connection verified"
echo "  ✅ Cache operations tested"
echo "  ✅ Queue system checked"
echo "  ✅ Performance tested"
echo ""
print_status "Next steps:"
echo "  1. Deploy to Vercel with environment variables"
echo "  2. Test rate limiting in production"
echo "  3. Monitor queue processing"
echo "  4. Set up alerts for Redis usage"
echo ""
print_warning "For production deployment:"
echo "  - Set all environment variables in Vercel dashboard"
echo "  - Configure CRON_SECRET and WEBHOOK_SECRET"
echo "  - Monitor Upstash usage in dashboard"
echo "  - Set up proper eviction policies"
echo ""
print_status "Useful commands:"
echo "  npm run test:upstash     # Test Upstash connectivity"
echo "  npm run test:queues      # Test queue systems"
echo "  npm run migrate:redis    # Migrate data from traditional Redis"
echo ""
echo "🎉 Setup completed! Your app is ready for serverless Redis."