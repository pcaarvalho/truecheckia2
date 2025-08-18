#!/bin/bash

# ==========================================
# VERCEL ENVIRONMENT VARIABLES VALIDATION SCRIPT
# ==========================================
# This script validates that all required environment variables are properly
# configured in Vercel and tests connectivity to external services

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/vercel-env-validation.log"

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1" | tee -a "$LOG_FILE"
}

print_step() {
    echo -e "${BLUE}[→]${NC} $1" | tee -a "$LOG_FILE"
}

# Function to check if Vercel CLI is installed
check_vercel_cli() {
    if ! command -v vercel &> /dev/null; then
        print_error "Vercel CLI is not installed"
        return 1
    fi
    print_status "Vercel CLI is available"
    return 0
}

# Function to check if user is logged in to Vercel
check_vercel_auth() {
    if ! vercel whoami &> /dev/null; then
        print_error "Not logged in to Vercel. Please run 'vercel login' first"
        return 1
    fi
    
    local user=$(vercel whoami)
    print_status "Logged in to Vercel as: $user"
    return 0
}

# Function to validate environment name
validate_environment() {
    local env="$1"
    if [[ ! "$env" =~ ^(production|preview|development)$ ]]; then
        print_error "Invalid environment: $env"
        print_error "Valid environments: production, preview, development"
        return 1
    fi
    return 0
}

# Function to get environment variable from Vercel
get_vercel_env() {
    local var_name="$1"
    local environment="$2"
    
    # Try to get the variable value
    vercel env ls | grep "^$var_name" | grep "$environment" | awk '{print $2}' 2>/dev/null || echo ""
}

# Function to check if variable exists in Vercel
check_var_exists() {
    local var_name="$1"
    local environment="$2"
    
    vercel env ls | grep -q "^$var_name.*$environment" 2>/dev/null
}

# Function to validate variable format
validate_var_format() {
    local var_name="$1"
    local var_value="$2"
    
    case "$var_name" in
        DATABASE_URL|DIRECT_URL|SHADOW_DATABASE_URL)
            if [[ ! "$var_value" =~ ^postgresql:// ]]; then
                print_error "$var_name: Invalid PostgreSQL URL format"
                return 1
            fi
            ;;
        UPSTASH_REDIS_REST_URL)
            if [[ ! "$var_value" =~ ^https://.*\.rest\.upstash\.io$ ]]; then
                print_error "$var_name: Invalid Upstash Redis URL format"
                return 1
            fi
            ;;
        REDIS_URL)
            if [[ ! "$var_value" =~ ^redis:// ]]; then
                print_error "$var_name: Invalid Redis URL format"
                return 1
            fi
            ;;
        OPENAI_API_KEY)
            if [[ ! "$var_value" =~ ^sk- ]]; then
                print_error "$var_name: Invalid OpenAI API key format"
                return 1
            fi
            ;;
        STRIPE_SECRET_KEY)
            if [[ ! "$var_value" =~ ^sk_(test_|live_) ]]; then
                print_error "$var_name: Invalid Stripe secret key format"
                return 1
            fi
            ;;
        STRIPE_PUBLISHABLE_KEY|VITE_STRIPE_PUBLISHABLE_KEY)
            if [[ ! "$var_value" =~ ^pk_(test_|live_) ]]; then
                print_error "$var_name: Invalid Stripe publishable key format"
                return 1
            fi
            ;;
        RESEND_API_KEY)
            if [[ ! "$var_value" =~ ^re_ ]]; then
                print_error "$var_name: Invalid Resend API key format"
                return 1
            fi
            ;;
        FRONTEND_URL|VITE_API_BASE_URL|VITE_APP_URL)
            if [[ ! "$var_value" =~ ^https?:// ]]; then
                print_error "$var_name: Invalid URL format"
                return 1
            fi
            ;;
        *_SECRET|*_TOKEN)
            if [[ ${#var_value} -lt 32 ]]; then
                print_warning "$var_name: Secret is shorter than recommended 32 characters"
            fi
            ;;
    esac
    
    return 0
}

# Function to validate required variables
validate_required_vars() {
    local environment="$1"
    local missing_vars=()
    local invalid_vars=()
    
    print_step "Validating required variables for $environment"
    
    # Define required variables by environment
    local required_vars=()
    
    # Common required variables
    required_vars+=(
        "DATABASE_URL"
        "OPENAI_API_KEY"
        "JWT_SECRET"
        "JWT_REFRESH_SECRET"
        "NODE_ENV"
        "FRONTEND_URL"
        "CORS_ORIGINS"
    )
    
    # Frontend variables
    required_vars+=(
        "VITE_API_BASE_URL"
        "VITE_APP_URL"
        "VITE_STRIPE_PUBLISHABLE_KEY"
        "VITE_ENV"
    )
    
    # Environment-specific variables
    case "$environment" in
        production|preview)
            required_vars+=(
                "UPSTASH_REDIS_REST_URL"
                "UPSTASH_REDIS_REST_TOKEN"
                "WEBHOOK_SECRET"
                "CRON_SECRET"
                "DIRECT_URL"
                "RESEND_API_KEY"
                "STRIPE_SECRET_KEY"
                "STRIPE_WEBHOOK_SECRET"
            )
            ;;
        development)
            # Development can use local services
            required_vars+=(
                "REDIS_URL"
            )
            ;;
    esac
    
    # Check each required variable
    for var in "${required_vars[@]}"; do
        if check_var_exists "$var" "$environment"; then
            print_status "$var is set"
            
            # Get value for format validation (only for non-sensitive vars)
            if [[ ! "$var" =~ (SECRET|TOKEN|KEY|PASSWORD) ]]; then
                local value
                value=$(get_vercel_env "$var" "$environment")
                if [[ -n "$value" ]]; then
                    if ! validate_var_format "$var" "$value"; then
                        invalid_vars+=("$var")
                    fi
                fi
            fi
        else
            print_error "$var is missing"
            missing_vars+=("$var")
        fi
    done
    
    # Report results
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        print_error "Missing required variables:"
        printf '  %s\n' "${missing_vars[@]}"
    fi
    
    if [[ ${#invalid_vars[@]} -gt 0 ]]; then
        print_error "Variables with invalid format:"
        printf '  %s\n' "${invalid_vars[@]}"
    fi
    
    if [[ ${#missing_vars[@]} -eq 0 && ${#invalid_vars[@]} -eq 0 ]]; then
        print_status "All required variables are properly configured"
        return 0
    else
        return 1
    fi
}

# Function to test database connectivity
test_database_connectivity() {
    local environment="$1"
    
    print_step "Testing database connectivity for $environment"
    
    # Create a temporary Node.js script to test connectivity
    local test_script="$PROJECT_ROOT/temp-db-test.js"
    
    cat > "$test_script" << 'EOF'
const { execSync } = require('child_process');

async function testDatabaseConnection() {
    try {
        // Get environment variables from Vercel
        const env = process.argv[2];
        
        // Get DATABASE_URL
        const dbUrlCmd = `vercel env ls | grep "^DATABASE_URL.*${env}" | awk '{print $2}'`;
        const databaseUrl = execSync(dbUrlCmd, { encoding: 'utf8' }).trim();
        
        if (!databaseUrl) {
            console.log('ERROR: DATABASE_URL not found');
            process.exit(1);
        }
        
        // Test connection using pg
        const { Client } = require('pg');
        const client = new Client({ connectionString: databaseUrl });
        
        await client.connect();
        const result = await client.query('SELECT NOW() as current_time');
        await client.end();
        
        console.log('SUCCESS: Database connection successful');
        console.log(`Current time: ${result.rows[0].current_time}`);
        
    } catch (error) {
        console.log(`ERROR: Database connection failed - ${error.message}`);
        process.exit(1);
    }
}

testDatabaseConnection();
EOF
    
    # Check if pg is available
    if npm list pg &> /dev/null || npm list -g pg &> /dev/null; then
        if node "$test_script" "$environment" 2>&1; then
            print_status "Database connectivity test passed"
        else
            print_error "Database connectivity test failed"
        fi
    else
        print_warning "pg module not available, skipping database connectivity test"
    fi
    
    # Clean up
    rm -f "$test_script"
}

# Function to test Redis connectivity
test_redis_connectivity() {
    local environment="$1"
    
    print_step "Testing Redis connectivity for $environment"
    
    if [[ "$environment" == "development" ]]; then
        # Test local Redis
        if command -v redis-cli &> /dev/null; then
            if redis-cli ping &> /dev/null; then
                print_status "Local Redis connectivity test passed"
            else
                print_error "Local Redis connectivity test failed"
            fi
        else
            print_warning "redis-cli not available, skipping Redis connectivity test"
        fi
    else
        # Test Upstash Redis
        local test_script="$PROJECT_ROOT/temp-redis-test.js"
        
        cat > "$test_script" << 'EOF'
const { execSync } = require('child_process');
const https = require('https');

async function testRedisConnection() {
    try {
        const env = process.argv[2];
        
        // Get Upstash Redis URL and token
        const urlCmd = `vercel env ls | grep "^UPSTASH_REDIS_REST_URL.*${env}" | awk '{print $2}'`;
        const tokenCmd = `vercel env ls | grep "^UPSTASH_REDIS_REST_TOKEN.*${env}" | awk '{print $2}'`;
        
        const redisUrl = execSync(urlCmd, { encoding: 'utf8' }).trim();
        const redisToken = execSync(tokenCmd, { encoding: 'utf8' }).trim();
        
        if (!redisUrl || !redisToken) {
            console.log('ERROR: Upstash Redis credentials not found');
            process.exit(1);
        }
        
        // Test connection with a simple PING
        const url = `${redisUrl}/ping`;
        const options = {
            headers: {
                'Authorization': `Bearer ${redisToken}`
            }
        };
        
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('SUCCESS: Upstash Redis connection successful');
                } else {
                    console.log(`ERROR: Upstash Redis connection failed - Status: ${res.statusCode}`);
                    process.exit(1);
                }
            });
        });
        
        req.on('error', (error) => {
            console.log(`ERROR: Upstash Redis connection failed - ${error.message}`);
            process.exit(1);
        });
        
        req.end();
        
    } catch (error) {
        console.log(`ERROR: Redis test failed - ${error.message}`);
        process.exit(1);
    }
}

testRedisConnection();
EOF
        
        if node "$test_script" "$environment" 2>&1; then
            print_status "Upstash Redis connectivity test passed"
        else
            print_error "Upstash Redis connectivity test failed"
        fi
        
        rm -f "$test_script"
    fi
}

# Function to test external API connectivity
test_external_apis() {
    local environment="$1"
    
    print_step "Testing external API connectivity for $environment"
    
    # Test OpenAI API
    local test_script="$PROJECT_ROOT/temp-api-test.js"
    
    cat > "$test_script" << 'EOF'
const { execSync } = require('child_process');
const https = require('https');

async function testOpenAI() {
    try {
        const env = process.argv[2];
        
        // Get OpenAI API key
        const keyCmd = `vercel env ls | grep "^OPENAI_API_KEY.*${env}" | awk '{print $2}'`;
        const apiKey = execSync(keyCmd, { encoding: 'utf8' }).trim();
        
        if (!apiKey) {
            console.log('WARNING: OPENAI_API_KEY not found');
            return;
        }
        
        // Test with a simple models list request
        const options = {
            hostname: 'api.openai.com',
            path: '/v1/models',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        };
        
        const req = https.request(options, (res) => {
            if (res.statusCode === 200) {
                console.log('SUCCESS: OpenAI API connection successful');
            } else {
                console.log(`ERROR: OpenAI API connection failed - Status: ${res.statusCode}`);
            }
        });
        
        req.on('error', (error) => {
            console.log(`ERROR: OpenAI API connection failed - ${error.message}`);
        });
        
        req.end();
        
    } catch (error) {
        console.log(`ERROR: OpenAI API test failed - ${error.message}`);
    }
}

testOpenAI();
EOF
    
    if node "$test_script" "$environment" 2>&1; then
        print_status "External API connectivity tests completed"
    else
        print_warning "Some external API tests failed"
    fi
    
    rm -f "$test_script"
}

# Function to generate environment report
generate_report() {
    local environment="$1"
    local report_file="$PROJECT_ROOT/vercel-env-report-$environment-$(date +%Y%m%d-%H%M%S).md"
    
    print_step "Generating environment report for $environment"
    
    cat > "$report_file" << EOF
# Vercel Environment Report - $environment

Generated on: $(date)
Environment: $environment

## Environment Variables Status

EOF
    
    # Get all variables for this environment
    vercel env ls | grep "$environment" | while read -r line; do
        local var_name=$(echo "$line" | awk '{print $1}')
        local var_env=$(echo "$line" | awk '{print $3}')
        
        if [[ "$var_env" == "$environment" ]]; then
            echo "- ✅ $var_name" >> "$report_file"
        fi
    done
    
    cat >> "$report_file" << EOF

## Validation Results

See validation log: $LOG_FILE

## Next Steps

1. Review any failed validations
2. Test deployment with: \`vercel --prod\` (for production)
3. Monitor application logs after deployment
4. Run health checks on deployed application

## Troubleshooting

If issues are found:
1. Check variable formats match requirements
2. Verify external service credentials
3. Test connectivity to databases and APIs
4. Review application logs for detailed errors

EOF
    
    print_status "Report generated: $report_file"
}

# Function to display usage
usage() {
    echo "Usage: $0 [ENVIRONMENT] [OPTIONS]"
    echo ""
    echo "Environments:"
    echo "  production    Validate production environment"
    echo "  preview       Validate preview/staging environment"
    echo "  development   Validate development environment"
    echo ""
    echo "Options:"
    echo "  --skip-connectivity    Skip connectivity tests"
    echo "  --report-only         Generate report without validation"
    echo "  -h, --help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 production"
    echo "  $0 preview --skip-connectivity"
    echo "  $0 development --report-only"
}

# Main function
main() {
    local environment="${1:-}"
    local skip_connectivity="false"
    local report_only="false"
    
    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-connectivity)
                skip_connectivity="true"
                shift
                ;;
            --report-only)
                report_only="true"
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                shift
                ;;
        esac
    done
    
    # Initialize log file
    echo "=== Vercel Environment Validation - $(date) ===" > "$LOG_FILE"
    
    print_status "TrueCheckIA Vercel Environment Validation"
    print_status "Environment: $environment"
    print_status "Log file: $LOG_FILE"
    
    # Validate environment
    if [[ -z "$environment" ]]; then
        print_error "Environment is required"
        usage
        exit 1
    fi
    
    validate_environment "$environment"
    
    # Check prerequisites
    if ! check_vercel_cli; then
        exit 1
    fi
    
    if ! check_vercel_auth; then
        exit 1
    fi
    
    local validation_passed="true"
    
    if [[ "$report_only" != "true" ]]; then
        # Run validations
        if ! validate_required_vars "$environment"; then
            validation_passed="false"
        fi
        
        if [[ "$skip_connectivity" != "true" ]]; then
            test_database_connectivity "$environment"
            test_redis_connectivity "$environment"
            test_external_apis "$environment"
        fi
    fi
    
    # Generate report
    generate_report "$environment"
    
    if [[ "$validation_passed" == "true" ]]; then
        print_status "Environment validation completed successfully"
        print_status "Your $environment environment is ready for deployment!"
        exit 0
    else
        print_error "Environment validation failed"
        print_error "Please fix the issues above before deploying"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"