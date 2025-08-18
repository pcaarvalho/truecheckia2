#!/bin/bash

# ==========================================
# QUICK VERCEL ENVIRONMENT SETUP
# ==========================================
# One-command setup for TrueCheckIA Vercel environments
# This script guides you through the complete setup process

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Function to print colored output
print_header() {
    echo -e "${CYAN}=====================================\\n$1\\n=====================================${NC}"
}

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[→]${NC} $1"
}

print_info() {
    echo -e "${CYAN}[ℹ]${NC} $1"
}

# Function to prompt yes/no
prompt_yes_no() {
    local question="$1"
    local default="${2:-n}"
    
    if [[ "$default" == "y" ]]; then
        echo -n "$question [Y/n]: "
    else
        echo -n "$question [y/N]: "
    fi
    
    read -r answer
    
    if [[ -z "$answer" ]]; then
        answer="$default"
    fi
    
    [[ "$answer" =~ ^[Yy]$ ]]
}

# Function to check prerequisites
check_prerequisites() {
    print_header "CHECKING PREREQUISITES"
    
    local all_good=true
    
    # Check Node.js
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        print_status "Node.js is installed: $node_version"
    else
        print_error "Node.js is not installed"
        all_good=false
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        local npm_version=$(npm --version)
        print_status "npm is installed: $npm_version"
    else
        print_error "npm is not installed"
        all_good=false
    fi
    
    # Check Vercel CLI
    if command -v vercel &> /dev/null; then
        local vercel_version=$(vercel --version)
        print_status "Vercel CLI is installed: $vercel_version"
    else
        print_warning "Vercel CLI is not installed"
        if prompt_yes_no "Install Vercel CLI now?"; then
            npm install -g vercel@latest
            print_status "Vercel CLI installed"
        else
            print_error "Vercel CLI is required"
            all_good=false
        fi
    fi
    
    # Check if logged in to Vercel
    if vercel whoami &> /dev/null; then
        local user=$(vercel whoami)
        print_status "Logged in to Vercel as: $user"
    else
        print_warning "Not logged in to Vercel"
        if prompt_yes_no "Login to Vercel now?"; then
            vercel login
            print_status "Logged in to Vercel"
        else
            print_error "Vercel login is required"
            all_good=false
        fi
    fi
    
    # Check if project is linked
    if [[ -f "$PROJECT_ROOT/.vercel/project.json" ]]; then
        print_status "Project is linked to Vercel"
    else
        print_warning "Project is not linked to Vercel"
        if prompt_yes_no "Link project to Vercel now?"; then
            cd "$PROJECT_ROOT"
            vercel link
            print_status "Project linked to Vercel"
        else
            print_error "Project linking is required"
            all_good=false
        fi
    fi
    
    if [[ "$all_good" == "true" ]]; then
        print_status "All prerequisites are met!"
        return 0
    else
        print_error "Some prerequisites are missing. Please fix them before continuing."
        return 1
    fi
}

# Function to show setup options
show_setup_options() {
    print_header "SETUP OPTIONS"
    
    echo "Choose your setup approach:"
    echo ""
    echo "1. 🚀 Quick Setup (Recommended)"
    echo "   - Sets up all three environments"
    echo "   - Uses interactive mode for sensitive values"
    echo "   - Includes validation and testing"
    echo ""
    echo "2. 🎯 Custom Setup"
    echo "   - Choose specific environments"
    echo "   - Configure options per environment"
    echo ""
    echo "3. 📋 Template Only"
    echo "   - Just copy environment templates"
    echo "   - Manual configuration required"
    echo ""
    echo "4. 🔧 Advanced Setup"
    echo "   - Full control over all options"
    echo "   - For experienced users"
    echo ""
    
    echo -n "Select option (1-4): "
    read -r choice
    
    case "$choice" in
        1) quick_setup ;;
        2) custom_setup ;;
        3) template_setup ;;
        4) advanced_setup ;;
        *) 
            print_error "Invalid choice: $choice"
            show_setup_options
            ;;
    esac
}

# Function for quick setup
quick_setup() {
    print_header "QUICK SETUP - ALL ENVIRONMENTS"
    
    print_info "This will set up all three environments with interactive prompts for sensitive values."
    print_warning "Make sure you have all required credentials ready:"
    echo "- Database URLs (Neon PostgreSQL)"
    echo "- Redis credentials (Upstash)"
    echo "- OpenAI API key"
    echo "- Stripe keys (test and live)"
    echo "- Resend API key"
    echo "- Custom domain (if applicable)"
    echo ""
    
    if ! prompt_yes_no "Continue with quick setup?" "y"; then
        show_setup_options
        return
    fi
    
    # Setup each environment
    local environments=("development" "preview" "production")
    
    for env in "${environments[@]}"; do
        print_step "Setting up $env environment"
        
        # Backup existing
        if "$SCRIPT_DIR/setup-vercel-env.sh" backup "$env" 2>/dev/null; then
            print_status "Backed up existing $env variables"
        fi
        
        # Setup with interactive mode
        if "$SCRIPT_DIR/setup-vercel-env.sh" setup "$env" --interactive; then
            print_status "$env environment setup completed"
        else
            print_error "$env environment setup failed"
            return 1
        fi
        
        # Validate
        if "$SCRIPT_DIR/validate-vercel-env.sh" "$env" --skip-connectivity; then
            print_status "$env environment validation passed"
        else
            print_warning "$env environment validation had warnings"
        fi
        
        echo ""
    done
    
    print_status "Quick setup completed successfully!"
    show_next_steps
}

# Function for custom setup
custom_setup() {
    print_header "CUSTOM SETUP"
    
    echo "Select environments to set up:"
    echo ""
    
    local setup_dev=false
    local setup_preview=false
    local setup_prod=false
    
    if prompt_yes_no "Setup development environment?"; then
        setup_dev=true
    fi
    
    if prompt_yes_no "Setup preview environment?"; then
        setup_preview=true
    fi
    
    if prompt_yes_no "Setup production environment?"; then
        setup_prod=true
    fi
    
    local interactive=false
    if prompt_yes_no "Use interactive mode for sensitive values?" "y"; then
        interactive=true
    fi
    
    # Setup selected environments
    if [[ "$setup_dev" == "true" ]]; then
        setup_environment "development" "$interactive"
    fi
    
    if [[ "$setup_preview" == "true" ]]; then
        setup_environment "preview" "$interactive"
    fi
    
    if [[ "$setup_prod" == "true" ]]; then
        setup_environment "production" "$interactive"
    fi
    
    print_status "Custom setup completed!"
    show_next_steps
}

# Function to setup individual environment
setup_environment() {
    local env="$1"
    local interactive="$2"
    
    print_step "Setting up $env environment"
    
    local args=("setup" "$env")
    if [[ "$interactive" == "true" ]]; then
        args+=("--interactive")
    fi
    
    if "$SCRIPT_DIR/setup-vercel-env.sh" "${args[@]}"; then
        print_status "$env setup completed"
        
        # Validate
        if "$SCRIPT_DIR/validate-vercel-env.sh" "$env" --skip-connectivity; then
            print_status "$env validation passed"
        else
            print_warning "$env validation had warnings"
        fi
    else
        print_error "$env setup failed"
        return 1
    fi
}

# Function for template setup
template_setup() {
    print_header "TEMPLATE SETUP"
    
    print_info "This will show you the environment templates for manual configuration."
    
    echo "Available templates:"
    echo "- .env.production.template"
    echo "- .env.preview.template"
    echo "- .env.development.template"
    echo ""
    
    print_info "To manually configure:"
    echo "1. Copy values from templates"
    echo "2. Set in Vercel dashboard or CLI:"
    echo "   vercel env add VARIABLE_NAME environment"
    echo "3. Use --sensitive flag for secrets"
    echo ""
    
    if prompt_yes_no "Open template files now?"; then
        for template in "$PROJECT_ROOT"/.env.*.template; do
            echo "=== $(basename "$template") ==="
            cat "$template"
            echo ""
        done
    fi
    
    print_info "Manual setup instructions:"
    echo "1. Go to: https://vercel.com/dashboard"
    echo "2. Select your project"
    echo "3. Go to Settings → Environment Variables"
    echo "4. Add variables for each environment"
    echo "5. Run validation: ./scripts/validate-vercel-env.sh [environment]"
}

# Function for advanced setup
advanced_setup() {
    print_header "ADVANCED SETUP"
    
    echo "Advanced options:"
    echo ""
    echo "1. Environment-specific configuration"
    echo "2. Secret rotation setup"
    echo "3. Monitoring and alerts"
    echo "4. Custom domain configuration"
    echo "5. Database migration setup"
    echo ""
    
    echo -n "Select option (1-5): "
    read -r choice
    
    case "$choice" in
        1) environment_specific_config ;;
        2) secret_rotation_setup ;;
        3) monitoring_setup ;;
        4) domain_configuration ;;
        5) database_migration_setup ;;
        *) 
            print_error "Invalid choice"
            advanced_setup
            ;;
    esac
}

# Function for environment-specific configuration
environment_specific_config() {
    print_step "Environment-specific configuration"
    
    echo "This allows you to configure each environment with different settings."
    echo ""
    
    local environments=("development" "preview" "production")
    
    for env in "${environments[@]}"; do
        if prompt_yes_no "Configure $env environment?"; then
            echo ""
            echo "=== $env Configuration ==="
            
            # Show current variables
            print_step "Current variables for $env:"
            vercel env ls | grep "$env" || echo "No variables set"
            echo ""
            
            if prompt_yes_no "Update $env environment?"; then
                setup_environment "$env" "true"
            fi
        fi
    done
}

# Function for secret rotation setup
secret_rotation_setup() {
    print_step "Secret rotation setup"
    
    echo "Setting up automatic secret rotation for security."
    echo ""
    
    if prompt_yes_no "Show current secrets status?"; then
        for env in development preview production; do
            echo "=== $env Secrets ==="
            vercel env ls | grep -E "(SECRET|TOKEN|KEY)" | grep "$env" || echo "No secrets found"
            echo ""
        done
    fi
    
    if prompt_yes_no "Rotate secrets now?"; then
        echo -n "Select environment (development/preview/production): "
        read -r env
        
        if [[ "$env" =~ ^(development|preview|production)$ ]]; then
            "$SCRIPT_DIR/rotate-secrets.sh" "$env" --interactive
        else
            print_error "Invalid environment: $env"
        fi
    fi
    
    print_info "Schedule regular secret rotation (recommended every 90 days)"
}

# Function for monitoring setup
monitoring_setup() {
    print_step "Monitoring and alerts setup"
    
    echo "Setting up monitoring for your Vercel deployment."
    echo ""
    
    if prompt_yes_no "Setup Sentry error tracking?"; then
        echo -n "Enter Sentry DSN: "
        read -r sentry_dsn
        
        if [[ -n "$sentry_dsn" ]]; then
            echo "$sentry_dsn" | vercel env add SENTRY_DSN production
            echo "$sentry_dsn" | vercel env add VITE_SENTRY_DSN production
            print_status "Sentry configured"
        fi
    fi
    
    if prompt_yes_no "Setup PostHog analytics?"; then
        echo -n "Enter PostHog key: "
        read -r posthog_key
        echo -n "Enter PostHog host: "
        read -r posthog_host
        
        if [[ -n "$posthog_key" ]]; then
            echo "$posthog_key" | vercel env add VITE_POSTHOG_KEY production
            echo "$posthog_host" | vercel env add VITE_POSTHOG_HOST production
            print_status "PostHog configured"
        fi
    fi
    
    print_info "Monitor your deployment at:"
    echo "- Vercel Dashboard: https://vercel.com/dashboard"
    echo "- Function Logs: vercel logs --follow"
    echo "- Health Check: https://yourdomain.com/api/health"
}

# Function for domain configuration
domain_configuration() {
    print_step "Custom domain configuration"
    
    echo "Setting up custom domain for production."
    echo ""
    
    echo -n "Enter your custom domain (e.g., yourdomain.com): "
    read -r domain
    
    if [[ -n "$domain" ]]; then
        print_step "Adding domain to Vercel"
        vercel domains add "$domain" || print_warning "Domain may already be added"
        
        print_step "Updating environment variables"
        echo "https://$domain" | vercel env add FRONTEND_URL production
        echo "https://$domain/api" | vercel env add VITE_API_BASE_URL production
        echo "https://$domain" | vercel env add VITE_APP_URL production
        echo "https://$domain,https://www.$domain" | vercel env add CORS_ORIGINS production
        
        print_status "Domain configuration updated"
        print_info "Don't forget to:"
        echo "- Configure DNS records"
        echo "- Update Stripe webhook URLs"
        echo "- Test SSL certificate"
    fi
}

# Function for database migration setup
database_migration_setup() {
    print_step "Database migration setup"
    
    echo "Configuring database migrations for Vercel deployment."
    echo ""
    
    if prompt_yes_no "Setup Neon database branches?"; then
        "$SCRIPT_DIR/setup-neon-production.sh"
    fi
    
    if prompt_yes_no "Run database migrations?"; then
        echo "Select environment:"
        echo "1. Development"
        echo "2. Preview"
        echo "3. Production"
        echo -n "Choice (1-3): "
        read -r choice
        
        case "$choice" in
            1) 
                print_step "Running development migrations"
                DATABASE_URL=$(vercel env ls | grep "DATABASE_URL.*development" | awk '{print $2}') npm run db:migrate
                ;;
            2)
                print_step "Running preview migrations"
                DATABASE_URL=$(vercel env ls | grep "DATABASE_URL.*preview" | awk '{print $2}') npm run db:migrate
                ;;
            3)
                print_step "Running production migrations"
                DATABASE_URL=$(vercel env ls | grep "DATABASE_URL.*production" | awk '{print $2}') npm run db:migrate
                ;;
            *)
                print_error "Invalid choice"
                ;;
        esac
    fi
}

# Function to show next steps
show_next_steps() {
    print_header "NEXT STEPS"
    
    print_status "Environment setup completed! Here's what to do next:"
    echo ""
    
    echo "1. 🧪 Test your configuration:"
    echo "   vercel dev                    # Test locally"
    echo "   vercel --prod                 # Deploy to production"
    echo ""
    
    echo "2. 🔍 Validate environments:"
    echo "   ./scripts/validate-vercel-env.sh production"
    echo "   ./scripts/validate-vercel-env.sh preview"
    echo "   ./scripts/validate-vercel-env.sh development"
    echo ""
    
    echo "3. 🚀 Deploy your application:"
    echo "   vercel                        # Deploy to preview"
    echo "   vercel --prod                 # Deploy to production"
    echo ""
    
    echo "4. 🔒 Security recommendations:"
    echo "   ./scripts/rotate-secrets.sh production    # Rotate secrets"
    echo "   # Schedule regular secret rotation (90 days)"
    echo ""
    
    echo "5. 📊 Monitor your deployment:"
    echo "   vercel logs --follow          # Watch logs"
    echo "   https://yourdomain.com/api/health  # Health check"
    echo ""
    
    echo "6. 📖 Read the documentation:"
    echo "   docs/VERCEL_ENV_SETUP.md"
    echo "   docs/VERCEL_ENV_TROUBLESHOOTING.md"
    echo ""
    
    print_info "Need help? Check the troubleshooting guide or run validation scripts."
}

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Quick setup script for TrueCheckIA Vercel environments"
    echo ""
    echo "Options:"
    echo "  --quick       Run quick setup without prompts"
    echo "  --check       Check prerequisites only"
    echo "  -h, --help    Show this help message"
    echo ""
    echo "Interactive Mode (default):"
    echo "  - Guided setup process"
    echo "  - Choose setup type"
    echo "  - Configure environments"
    echo ""
    echo "Examples:"
    echo "  $0            # Interactive setup"
    echo "  $0 --quick    # Quick automated setup"
    echo "  $0 --check    # Check prerequisites only"
}

# Main function
main() {
    local quick_mode=false
    local check_only=false
    
    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --quick)
                quick_mode=true
                shift
                ;;
            --check)
                check_only=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # Show welcome message
    print_header "TRUECHECKIA VERCEL SETUP"
    echo "Welcome to the TrueCheckIA Vercel environment setup wizard!"
    echo "This script will help you configure all necessary environment variables."
    echo ""
    
    # Check prerequisites
    if ! check_prerequisites; then
        exit 1
    fi
    
    if [[ "$check_only" == "true" ]]; then
        print_status "Prerequisites check completed successfully!"
        exit 0
    fi
    
    echo ""
    
    # Run setup
    if [[ "$quick_mode" == "true" ]]; then
        quick_setup
    else
        show_setup_options
    fi
    
    echo ""
    print_status "Setup completed! Your TrueCheckIA Vercel deployment is ready."
}

# Run main function with all arguments
main "$@"