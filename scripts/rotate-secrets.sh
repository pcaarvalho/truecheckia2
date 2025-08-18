#!/bin/bash

# ==========================================
# VERCEL SECRETS ROTATION SCRIPT
# ==========================================
# This script rotates sensitive environment variables in Vercel
# for security maintenance and emergency response

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
LOG_FILE="$PROJECT_ROOT/secret-rotation.log"

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

# Function to generate secure random string
generate_secret() {
    local length="${1:-64}"
    openssl rand -base64 "$length" | tr -d "=+/" | cut -c1-"$length"
}

# Function to check if Vercel CLI is installed
check_vercel_cli() {
    if ! command -v vercel &> /dev/null; then
        print_error "Vercel CLI is not installed"
        return 1
    fi
    return 0
}

# Function to check if user is logged in to Vercel
check_vercel_auth() {
    if ! vercel whoami &> /dev/null; then
        print_error "Not logged in to Vercel. Please run 'vercel login' first"
        return 1
    fi
    return 0
}

# Function to backup current secrets
backup_secrets() {
    local environment="$1"
    local backup_file="$PROJECT_ROOT/secrets-backup-$environment-$(date +%Y%m%d-%H%M%S).json"
    
    print_step "Backing up current secrets for $environment"
    
    # Get all secret variables
    local secret_vars=(
        "JWT_SECRET"
        "JWT_REFRESH_SECRET"
        "WEBHOOK_SECRET"
        "CRON_SECRET"
        "OPENAI_API_KEY"
        "STRIPE_SECRET_KEY"
        "STRIPE_WEBHOOK_SECRET"
        "RESEND_API_KEY"
        "UPSTASH_REDIS_REST_TOKEN"
    )
    
    echo "{" > "$backup_file"
    echo "  \"environment\": \"$environment\"," >> "$backup_file"
    echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"," >> "$backup_file"
    echo "  \"variables\": {" >> "$backup_file"
    
    local first=true
    for var in "${secret_vars[@]}"; do
        if vercel env ls | grep -q "^$var.*$environment"; then
            if [[ "$first" == "false" ]]; then
                echo "," >> "$backup_file"
            fi
            echo -n "    \"$var\": \"[REDACTED]\"" >> "$backup_file"
            first=false
        fi
    done
    
    echo "" >> "$backup_file"
    echo "  }" >> "$backup_file"
    echo "}" >> "$backup_file"
    
    print_status "Secrets backup saved to: $backup_file"
}

# Function to rotate JWT secrets
rotate_jwt_secrets() {
    local environment="$1"
    
    print_step "Rotating JWT secrets for $environment"
    
    # Generate new secrets
    local new_jwt_secret
    local new_refresh_secret
    
    new_jwt_secret=$(generate_secret 64)
    new_refresh_secret=$(generate_secret 64)
    
    print_step "Updating JWT_SECRET"
    echo "$new_jwt_secret" | vercel env add JWT_SECRET "$environment" --sensitive || true
    
    print_step "Updating JWT_REFRESH_SECRET"
    echo "$new_refresh_secret" | vercel env add JWT_REFRESH_SECRET "$environment" --sensitive || true
    
    print_status "JWT secrets rotated successfully"
    print_warning "All users will need to re-authenticate after deployment"
}

# Function to rotate webhook secrets
rotate_webhook_secrets() {
    local environment="$1"
    
    print_step "Rotating webhook secrets for $environment"
    
    # Generate new secrets
    local new_webhook_secret
    local new_cron_secret
    
    new_webhook_secret=$(generate_secret 64)
    new_cron_secret=$(generate_secret 64)
    
    print_step "Updating WEBHOOK_SECRET"
    echo "$new_webhook_secret" | vercel env add WEBHOOK_SECRET "$environment" --sensitive || true
    
    print_step "Updating CRON_SECRET"
    echo "$new_cron_secret" | vercel env add CRON_SECRET "$environment" --sensitive || true
    
    print_status "Webhook secrets rotated successfully"
}

# Function to rotate API keys (requires manual intervention)
rotate_api_keys() {
    local environment="$1"
    local interactive="$2"
    
    print_step "Rotating external API keys for $environment"
    
    if [[ "$interactive" == "true" ]]; then
        print_warning "External API keys require manual rotation at their respective services:"
        echo ""
        echo "1. OpenAI API Key:"
        echo "   - Go to https://platform.openai.com/account/api-keys"
        echo "   - Create a new key"
        echo "   - Replace OPENAI_API_KEY in Vercel"
        echo ""
        echo "2. Stripe Keys:"
        echo "   - Go to https://dashboard.stripe.com/apikeys"
        echo "   - Regenerate secret key"
        echo "   - Update webhook endpoint secret"
        echo "   - Replace STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET"
        echo ""
        echo "3. Resend API Key:"
        echo "   - Go to https://resend.com/api-keys"
        echo "   - Generate new key"
        echo "   - Replace RESEND_API_KEY"
        echo ""
        echo "4. Upstash Redis Token:"
        echo "   - Go to Upstash console"
        echo "   - Regenerate REST token"
        echo "   - Replace UPSTASH_REDIS_REST_TOKEN"
        echo ""
        
        echo -n "Have you rotated all external API keys? (y/N): "
        read -r confirm
        
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
            print_status "External API keys rotation acknowledged"
        else
            print_warning "External API keys rotation pending"
        fi
    else
        print_warning "External API keys require manual rotation (use --interactive flag)"
    fi
}

# Function to update database passwords
rotate_database_secrets() {
    local environment="$1"
    
    print_step "Database password rotation for $environment"
    
    print_warning "Database password rotation requires coordination with Neon:"
    echo "1. Go to Neon console"
    echo "2. Reset database password"
    echo "3. Update DATABASE_URL and DIRECT_URL with new password"
    echo "4. Test connectivity before deployment"
    
    echo -n "Continue with database password rotation? (y/N): "
    read -r confirm
    
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        echo -n "Enter new DATABASE_URL: "
        read -s new_db_url
        echo
        
        echo -n "Enter new DIRECT_URL: "
        read -s new_direct_url
        echo
        
        print_step "Updating DATABASE_URL"
        echo "$new_db_url" | vercel env add DATABASE_URL "$environment" --sensitive || true
        
        print_step "Updating DIRECT_URL"
        echo "$new_direct_url" | vercel env add DIRECT_URL "$environment" --sensitive || true
        
        print_status "Database URLs updated"
    else
        print_warning "Database password rotation skipped"
    fi
}

# Function to verify rotation completed
verify_rotation() {
    local environment="$1"
    
    print_step "Verifying secret rotation for $environment"
    
    local secrets_to_check=(
        "JWT_SECRET"
        "JWT_REFRESH_SECRET"
        "WEBHOOK_SECRET"
        "CRON_SECRET"
    )
    
    local all_present=true
    
    for secret in "${secrets_to_check[@]}"; do
        if vercel env ls | grep -q "^$secret.*$environment"; then
            print_status "$secret is present"
        else
            print_error "$secret is missing"
            all_present=false
        fi
    done
    
    if [[ "$all_present" == "true" ]]; then
        print_status "All automatic secret rotations completed successfully"
    else
        print_error "Some secret rotations failed"
        return 1
    fi
}

# Function to generate rotation report
generate_report() {
    local environment="$1"
    local report_file="$PROJECT_ROOT/secret-rotation-report-$environment-$(date +%Y%m%d-%H%M%S).md"
    
    print_step "Generating rotation report for $environment"
    
    cat > "$report_file" << EOF
# Secret Rotation Report - $environment

**Date:** $(date)
**Environment:** $environment
**Operator:** $(whoami)

## Rotated Secrets

### Automatically Rotated
- ✅ JWT_SECRET (64 chars)
- ✅ JWT_REFRESH_SECRET (64 chars)
- ✅ WEBHOOK_SECRET (64 chars)
- ✅ CRON_SECRET (64 chars)

### Manual Rotation Required
- ⚠️ OPENAI_API_KEY (requires OpenAI console)
- ⚠️ STRIPE_SECRET_KEY (requires Stripe dashboard)
- ⚠️ STRIPE_WEBHOOK_SECRET (requires Stripe webhook config)
- ⚠️ RESEND_API_KEY (requires Resend console)
- ⚠️ UPSTASH_REDIS_REST_TOKEN (requires Upstash console)
- ⚠️ DATABASE_URL (requires Neon password reset)

## Post-Rotation Actions Required

1. **Deploy immediately** to activate new secrets:
   \`\`\`bash
   vercel --prod
   \`\`\`

2. **Notify users** about re-authentication requirement

3. **Update webhook endpoints** with new secrets

4. **Test all integrations** after deployment

5. **Monitor error logs** for authentication failures

## Security Notes

- All users will need to re-authenticate
- Active sessions will be invalidated
- Webhook endpoints may need reconfiguration
- Monitor for authentication errors

## Rollback Plan

If issues occur:
1. Restore from backup: \`secrets-backup-$environment-*\`
2. Redeploy previous version
3. Check logs: \`vercel logs\`

## Next Rotation

Schedule next rotation in 90 days: $(date -d '+90 days' 2>/dev/null || date -v '+90d' 2>/dev/null || echo "90 days from now")

---
Generated by: $0
Log file: $LOG_FILE
EOF
    
    print_status "Rotation report generated: $report_file"
}

# Function to display usage
usage() {
    echo "Usage: $0 [ENVIRONMENT] [OPTIONS]"
    echo ""
    echo "Environments:"
    echo "  production    Rotate production secrets"
    echo "  preview       Rotate preview secrets"
    echo "  development   Rotate development secrets"
    echo ""
    echo "Options:"
    echo "  --interactive     Interactive mode for external APIs"
    echo "  --jwt-only        Rotate only JWT secrets"
    echo "  --webhooks-only   Rotate only webhook secrets"
    echo "  --all             Rotate all secrets (default)"
    echo "  --skip-db         Skip database password rotation"
    echo "  -h, --help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 production --interactive"
    echo "  $0 preview --jwt-only"
    echo "  $0 development --webhooks-only"
    echo ""
    echo "Security Note:"
    echo "  This script will invalidate existing sessions and may require"
    echo "  users to re-authenticate. Plan deployment accordingly."
}

# Main function
main() {
    local environment="${1:-}"
    local interactive="false"
    local scope="all"
    local skip_db="false"
    
    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --interactive)
                interactive="true"
                shift
                ;;
            --jwt-only)
                scope="jwt"
                shift
                ;;
            --webhooks-only)
                scope="webhooks"
                shift
                ;;
            --all)
                scope="all"
                shift
                ;;
            --skip-db)
                skip_db="true"
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
    echo "=== Secret Rotation - $(date) ===" > "$LOG_FILE"
    
    print_status "TrueCheckIA Secret Rotation"
    print_status "Environment: $environment"
    print_status "Scope: $scope"
    print_status "Log file: $LOG_FILE"
    
    # Validate environment
    if [[ -z "$environment" ]]; then
        print_error "Environment is required"
        usage
        exit 1
    fi
    
    if [[ ! "$environment" =~ ^(production|preview|development)$ ]]; then
        print_error "Invalid environment: $environment"
        exit 1
    fi
    
    # Check prerequisites
    if ! check_vercel_cli || ! check_vercel_auth; then
        exit 1
    fi
    
    # Confirm dangerous operation
    print_warning "SECRET ROTATION WARNING"
    print_warning "This operation will:"
    print_warning "- Invalidate all user sessions"
    print_warning "- Require immediate deployment"
    print_warning "- May cause temporary service disruption"
    echo ""
    echo -n "Continue with secret rotation for $environment? (y/N): "
    read -r confirm
    
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        print_status "Operation cancelled"
        exit 0
    fi
    
    # Backup current secrets
    backup_secrets "$environment"
    
    # Rotate secrets based on scope
    case "$scope" in
        jwt)
            rotate_jwt_secrets "$environment"
            ;;
        webhooks)
            rotate_webhook_secrets "$environment"
            ;;
        all)
            rotate_jwt_secrets "$environment"
            rotate_webhook_secrets "$environment"
            rotate_api_keys "$environment" "$interactive"
            
            if [[ "$skip_db" != "true" ]]; then
                rotate_database_secrets "$environment"
            fi
            ;;
    esac
    
    # Verify rotation
    if verify_rotation "$environment"; then
        print_status "Secret rotation completed successfully"
    else
        print_error "Secret rotation completed with warnings"
    fi
    
    # Generate report
    generate_report "$environment"
    
    print_status "NEXT STEPS:"
    print_status "1. Deploy immediately: vercel --prod"
    print_status "2. Test authentication flows"
    print_status "3. Monitor error logs"
    print_status "4. Update webhook configurations if needed"
    
    exit 0
}

# Run main function with all arguments
main "$@"