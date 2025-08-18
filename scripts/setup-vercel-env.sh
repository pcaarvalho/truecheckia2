#!/bin/bash

# ==========================================
# VERCEL ENVIRONMENT VARIABLES SETUP SCRIPT
# ==========================================
# This script automates the setup of environment variables in Vercel
# for TrueCheckIA's production, preview, and development environments

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
LOG_FILE="$PROJECT_ROOT/vercel-env-setup.log"

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1" | tee -a "$LOG_FILE"
}

# Function to check if Vercel CLI is installed
check_vercel_cli() {
    if ! command -v vercel &> /dev/null; then
        print_error "Vercel CLI is not installed. Installing..."
        npm install -g vercel@latest
        print_status "Vercel CLI installed successfully"
    else
        print_status "Vercel CLI is available"
    fi
}

# Function to check if user is logged in to Vercel
check_vercel_auth() {
    if ! vercel whoami &> /dev/null; then
        print_error "Not logged in to Vercel. Please run 'vercel login' first"
        exit 1
    fi
    
    local user=$(vercel whoami)
    print_status "Logged in to Vercel as: $user"
}

# Function to validate environment name
validate_environment() {
    local env="$1"
    if [[ ! "$env" =~ ^(production|preview|development)$ ]]; then
        print_error "Invalid environment: $env"
        print_error "Valid environments: production, preview, development"
        exit 1
    fi
}

# Function to read environment variables from template
read_env_template() {
    local env="$1"
    local template_file="$PROJECT_ROOT/.env.$env.template"
    
    if [[ ! -f "$template_file" ]]; then
        print_error "Template file not found: $template_file"
        exit 1
    fi
    
    print_status "Reading template file: $template_file"
    
    # Extract variable names (ignore comments and empty lines)
    grep -E '^[A-Z_]+=.*' "$template_file" | cut -d'=' -f1 || true
}

# Function to prompt for variable value
prompt_for_value() {
    local var_name="$1"
    local current_value="$2"
    local is_secret="$3"
    
    if [[ "$is_secret" == "true" ]]; then
        echo -n "Enter value for $var_name (hidden): "
        read -s value
        echo
    else
        echo -n "Enter value for $var_name [$current_value]: "
        read value
        if [[ -z "$value" && -n "$current_value" ]]; then
            value="$current_value"
        fi
    fi
    
    echo "$value"
}

# Function to check if variable contains sensitive data
is_sensitive_var() {
    local var_name="$1"
    case "$var_name" in
        *SECRET*|*TOKEN*|*KEY*|*PASSWORD*|*PASS*)
            echo "true"
            ;;
        *)
            echo "false"
            ;;
    esac
}

# Function to set environment variable in Vercel
set_vercel_env() {
    local var_name="$1"
    local var_value="$2"
    local environment="$3"
    local is_secret="$4"
    
    print_step "Setting $var_name for $environment environment"
    
    if [[ "$is_secret" == "true" ]]; then
        echo "$var_value" | vercel env add "$var_name" "$environment" --sensitive 2>&1 | grep -v "sensitive" || true
    else
        echo "$var_value" | vercel env add "$var_name" "$environment" 2>&1 || true
    fi
    
    if [[ $? -eq 0 ]]; then
        print_status "✓ $var_name set successfully"
    else
        print_warning "⚠ Failed to set $var_name (may already exist)"
    fi
}

# Function to setup environment from template
setup_environment() {
    local env="$1"
    local interactive="$2"
    
    print_step "Setting up $env environment variables"
    
    local template_file="$PROJECT_ROOT/.env.$env.template"
    local variables
    
    # Read variables from template
    variables=$(grep -E '^[A-Z_]+=.*' "$template_file" | cut -d'=' -f1)
    
    while IFS= read -r var_name; do
        [[ -z "$var_name" ]] && continue
        
        # Get default value from template
        local default_value
        default_value=$(grep "^$var_name=" "$template_file" | cut -d'=' -f2- | sed 's/^"//;s/"$//')
        
        # Check if variable is sensitive
        local is_secret
        is_secret=$(is_sensitive_var "$var_name")
        
        if [[ "$interactive" == "true" ]]; then
            # Interactive mode: prompt for each value
            local value
            value=$(prompt_for_value "$var_name" "$default_value" "$is_secret")
            
            if [[ -n "$value" ]]; then
                set_vercel_env "$var_name" "$value" "$env" "$is_secret"
            else
                print_warning "Skipping $var_name (no value provided)"
            fi
        else
            # Non-interactive mode: use default values where provided
            if [[ -n "$default_value" && "$default_value" != "your-"* && "$default_value" != "sk_test_"* ]]; then
                set_vercel_env "$var_name" "$default_value" "$env" "$is_secret"
            else
                print_warning "Skipping $var_name (requires manual configuration)"
            fi
        fi
    done <<< "$variables"
}

# Function to validate required variables
validate_required_vars() {
    local env="$1"
    
    print_step "Validating required variables for $env"
    
    local required_vars=(
        "DATABASE_URL"
        "OPENAI_API_KEY"
        "JWT_SECRET"
        "JWT_REFRESH_SECRET"
    )
    
    if [[ "$env" != "development" ]]; then
        required_vars+=(
            "UPSTASH_REDIS_REST_URL"
            "UPSTASH_REDIS_REST_TOKEN"
            "WEBHOOK_SECRET"
            "CRON_SECRET"
        )
    fi
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! vercel env ls | grep -q "$var.*$env"; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        print_error "Missing required variables for $env:"
        printf '%s\n' "${missing_vars[@]}"
        return 1
    else
        print_status "All required variables are set for $env"
        return 0
    fi
}

# Function to backup current environment variables
backup_env_vars() {
    local env="$1"
    local backup_file="$PROJECT_ROOT/vercel-env-backup-$env-$(date +%Y%m%d-%H%M%S).json"
    
    print_step "Backing up current $env environment variables"
    
    vercel env ls --environment="$env" --json > "$backup_file" 2>/dev/null || true
    
    if [[ -f "$backup_file" ]] && [[ -s "$backup_file" ]]; then
        print_status "Backup saved to: $backup_file"
    else
        print_warning "No existing variables to backup for $env"
    fi
}

# Function to list current environment variables
list_env_vars() {
    local env="$1"
    
    print_step "Current environment variables for $env:"
    
    if command -v vercel &> /dev/null; then
        vercel env ls | grep "$env" || print_warning "No variables found for $env"
    else
        print_error "Vercel CLI not available"
    fi
}

# Function to remove environment variables
remove_env_vars() {
    local env="$1"
    
    print_warning "This will remove ALL environment variables for $env environment"
    echo -n "Are you sure? (y/N): "
    read -r confirm
    
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        print_step "Removing environment variables for $env"
        
        # Get list of variables
        local vars
        vars=$(vercel env ls | grep "$env" | awk '{print $1}' || true)
        
        while IFS= read -r var_name; do
            [[ -z "$var_name" ]] && continue
            print_step "Removing $var_name"
            vercel env rm "$var_name" "$env" --yes 2>/dev/null || true
        done <<< "$vars"
        
        print_status "Environment variables removed for $env"
    else
        print_status "Operation cancelled"
    fi
}

# Function to display usage
usage() {
    echo "Usage: $0 [COMMAND] [ENVIRONMENT] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  setup      Setup environment variables from template"
    echo "  list       List current environment variables"
    echo "  validate   Validate required variables are set"
    echo "  backup     Backup current environment variables"
    echo "  remove     Remove all environment variables (dangerous!)"
    echo ""
    echo "Environments:"
    echo "  production    Production environment"
    echo "  preview       Preview/staging environment"
    echo "  development   Development environment"
    echo ""
    echo "Options:"
    echo "  -i, --interactive    Interactive mode (prompt for values)"
    echo "  -f, --force          Force overwrite existing variables"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup production -i"
    echo "  $0 list preview"
    echo "  $0 validate production"
    echo "  $0 backup development"
}

# Main function
main() {
    local command="${1:-}"
    local environment="${2:-}"
    local interactive="false"
    local force="false"
    
    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            -i|--interactive)
                interactive="true"
                shift
                ;;
            -f|--force)
                force="true"
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
    echo "=== Vercel Environment Setup - $(date) ===" > "$LOG_FILE"
    
    print_status "TrueCheckIA Vercel Environment Setup"
    print_status "Log file: $LOG_FILE"
    
    # Validate command
    case "$command" in
        setup|list|validate|backup|remove)
            ;;
        *)
            print_error "Invalid command: $command"
            usage
            exit 1
            ;;
    esac
    
    # Validate environment
    if [[ -n "$environment" ]]; then
        validate_environment "$environment"
    elif [[ "$command" != "help" ]]; then
        print_error "Environment is required"
        usage
        exit 1
    fi
    
    # Check prerequisites
    check_vercel_cli
    check_vercel_auth
    
    # Execute command
    case "$command" in
        setup)
            backup_env_vars "$environment"
            setup_environment "$environment" "$interactive"
            validate_required_vars "$environment"
            ;;
        list)
            list_env_vars "$environment"
            ;;
        validate)
            validate_required_vars "$environment"
            ;;
        backup)
            backup_env_vars "$environment"
            ;;
        remove)
            backup_env_vars "$environment"
            remove_env_vars "$environment"
            ;;
    esac
    
    print_status "Operation completed successfully"
}

# Run main function with all arguments
main "$@"