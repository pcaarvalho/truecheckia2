# Vercel Environment Variables Setup Guide

This guide provides comprehensive instructions for setting up environment variables in Vercel for TrueCheckIA's hybrid serverless deployment.

## Quick Start

```bash
# Setup production environment
./scripts/setup-vercel-env.sh setup production --interactive

# Validate configuration
./scripts/validate-vercel-env.sh production

# Deploy to production
vercel --prod
```

## Overview

TrueCheckIA uses a hybrid architecture where both frontend and backend are deployed to Vercel:
- **Frontend**: React/Vite application (static build + serverless functions)
- **Backend**: Express API converted to Vercel serverless functions
- **Infrastructure**: Neon PostgreSQL + Upstash Redis + Resend + Stripe

## Environment Structure

### Production Environment
- **Purpose**: Live production deployment
- **Domain**: `yourdomain.com`
- **Database**: Neon Production branch
- **Redis**: Upstash Production database
- **Payment**: Stripe Live keys
- **Email**: Resend with production domain

### Preview Environment
- **Purpose**: Staging/PR preview deployments
- **Domain**: `*-preview.vercel.app`
- **Database**: Neon Preview branch
- **Redis**: Upstash Preview database
- **Payment**: Stripe Test keys
- **Email**: Resend with test domain

### Development Environment
- **Purpose**: Local development with Vercel dev
- **Domain**: `localhost:3000`
- **Database**: Local PostgreSQL or Neon Dev branch
- **Redis**: Local Redis or Upstash Dev database
- **Payment**: Stripe Test keys
- **Email**: Mailhog or Resend test

## Critical Variables by Environment

### Backend Variables (Required for API functions)

| Variable | Production | Preview | Development | Description |
|----------|------------|---------|-------------|-------------|
| `DATABASE_URL` | Neon Prod + pgbouncer | Neon Preview + pgbouncer | Local/Neon Dev | Main database connection |
| `DIRECT_URL` | Neon Prod direct | Neon Preview direct | Local/Neon Dev | Direct connection for migrations |
| `SHADOW_DATABASE_URL` | Neon Prod shadow | Neon Preview shadow | - | Shadow DB for migrations |
| `UPSTASH_REDIS_REST_URL` | Upstash Prod | Upstash Preview | - | Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Prod | Upstash Preview | - | Redis authentication |
| `REDIS_URL` | - | - | Local Redis | Local Redis connection |
| `OPENAI_API_KEY` | Live key | Test key | Test key | OpenAI API access |
| `JWT_SECRET` | Prod secret | Preview secret | Dev secret | JWT signing key |
| `JWT_REFRESH_SECRET` | Prod secret | Preview secret | Dev secret | Refresh token key |
| `WEBHOOK_SECRET` | Prod secret | Preview secret | Dev secret | Webhook authentication |
| `CRON_SECRET` | Prod secret | Preview secret | Dev secret | Cron job authentication |

### Frontend Variables (Required for Vite build)

| Variable | Production | Preview | Development | Description |
|----------|------------|---------|-------------|-------------|
| `VITE_API_BASE_URL` | `https://yourdomain.com/api` | `https://preview.vercel.app/api` | `http://localhost:4000/api` | API endpoint |
| `VITE_APP_URL` | `https://yourdomain.com` | `https://preview.vercel.app` | `http://localhost:5173` | Application URL |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Live key | Test key | Test key | Stripe frontend key |
| `VITE_ENV` | `production` | `preview` | `development` | Environment indicator |

### Payment Processing (Stripe)

| Variable | Production | Preview | Development | Description |
|----------|------------|---------|-------------|-------------|
| `STRIPE_SECRET_KEY` | `sk_live_...` | `sk_test_...` | `sk_test_...` | Stripe backend key |
| `STRIPE_WEBHOOK_SECRET` | Live webhook | Test webhook | Test webhook | Webhook validation |
| `STRIPE_PRO_PRICE_ID` | Live price | Test price | Test price | Pro plan price |
| `STRIPE_ENTERPRISE_PRICE_ID` | Live price | Test price | Test price | Enterprise plan price |

### Email Service (Resend)

| Variable | Production | Preview | Development | Description |
|----------|------------|---------|-------------|-------------|
| `RESEND_API_KEY` | Live key | Test key | - | Resend API key |
| `RESEND_FROM_EMAIL` | `noreply@yourdomain.com` | `noreply@preview.com` | - | From email address |
| `SMTP_HOST` | - | - | `localhost` | Mailhog SMTP |
| `SMTP_PORT` | - | - | `1025` | Mailhog port |

## Setup Instructions

### 1. Prerequisites

```bash
# Install Vercel CLI
npm install -g vercel@latest

# Login to Vercel
vercel login

# Link your project
vercel link
```

### 2. Interactive Setup (Recommended)

```bash
# Production environment
./scripts/setup-vercel-env.sh setup production --interactive

# Preview environment
./scripts/setup-vercel-env.sh setup preview --interactive

# Development environment
./scripts/setup-vercel-env.sh setup development --interactive
```

### 3. Bulk Setup from Templates

```bash
# Non-interactive setup using templates
./scripts/setup-vercel-env.sh setup production
./scripts/setup-vercel-env.sh setup preview
./scripts/setup-vercel-env.sh setup development
```

### 4. Manual Setup via Vercel CLI

```bash
# Set individual variables
echo "your-database-url" | vercel env add DATABASE_URL production
echo "your-openai-key" | vercel env add OPENAI_API_KEY production --sensitive
echo "your-jwt-secret" | vercel env add JWT_SECRET production --sensitive

# Or use Vercel dashboard at vercel.com/your-team/your-project/settings/environment-variables
```

## Environment Templates

### Production Template
Use `.env.production.template` for production values:
- Live Stripe keys
- Production database URLs
- Production domain URLs
- Strong secrets (256+ bits)

### Preview Template
Use `.env.preview.template` for staging values:
- Test Stripe keys
- Preview database URLs
- Vercel preview URLs
- Different secrets from production

### Development Template
Use `.env.development.template` for local development:
- Local service URLs
- Test API keys
- Development secrets
- Debug flags enabled

## Validation and Testing

### Automatic Validation

```bash
# Validate all required variables
./scripts/validate-vercel-env.sh production
./scripts/validate-vercel-env.sh preview
./scripts/validate-vercel-env.sh development

# Skip connectivity tests
./scripts/validate-vercel-env.sh production --skip-connectivity

# Generate report only
./scripts/validate-vercel-env.sh production --report-only
```

### Manual Testing

```bash
# Test deployment locally
vercel dev

# Test production build
vercel build

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Health Checks

After deployment, verify these endpoints:
- `GET /api/health` - Backend health check
- `GET /api/v1/status` - API status
- `POST /api/auth/register` - Authentication flow
- `POST /api/analysis/check` - Core functionality

## Security Best Practices

### Secret Management
- Use `--sensitive` flag for all secrets
- Generate unique secrets for each environment
- Use 256-bit (64 character) secrets minimum
- Rotate secrets regularly

### Access Control
- Limit Vercel team access
- Use environment-specific API keys
- Monitor access logs
- Implement audit trails

### Domain Security
- Configure CORS origins properly
- Use HTTPS only in production
- Implement proper CSP headers
- Validate all environment URLs

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check if all VITE_ variables are set
   vercel env ls | grep VITE_
   
   # Validate frontend variables
   ./scripts/validate-vercel-env.sh production
   ```

2. **Database Connection Errors**
   ```bash
   # Check database URL format
   vercel env ls | grep DATABASE_URL
   
   # Test connection
   ./scripts/test-neon-connectivity.ts
   ```

3. **Redis Connection Errors**
   ```bash
   # Validate Upstash credentials
   vercel env ls | grep UPSTASH
   
   # Test connection
   ./scripts/test-upstash-connectivity.ts
   ```

4. **Authentication Issues**
   ```bash
   # Check JWT secrets are set
   vercel env ls | grep JWT_
   
   # Verify secrets are different per environment
   ./scripts/validate-vercel-env.sh production
   ```

### Debug Commands

```bash
# List all environment variables
vercel env ls

# Check specific variable
vercel env ls | grep VARIABLE_NAME

# Remove variable
vercel env rm VARIABLE_NAME production

# View deployment logs
vercel logs

# Check function logs
vercel logs --follow
```

### Emergency Procedures

1. **Production Issues**
   ```bash
   # Backup current config
   ./scripts/setup-vercel-env.sh backup production
   
   # Rollback to previous deployment
   vercel rollback
   
   # Emergency disable
   vercel env rm OPENAI_API_KEY production
   ```

2. **Security Breach**
   ```bash
   # Rotate all secrets immediately
   ./scripts/rotate-secrets.sh production
   
   # Update database passwords
   ./scripts/setup-neon-production.sh --rotate-password
   
   # Regenerate API keys
   ./scripts/regenerate-api-keys.sh
   ```

## Advanced Configuration

### Custom Domains
```bash
# Add custom domain
vercel domains add yourdomain.com

# Update CORS and frontend URLs
vercel env add FRONTEND_URL production
vercel env add CORS_ORIGINS production
vercel env add VITE_APP_URL production
```

### Multiple Environments
```bash
# Create staging environment
vercel env add DATABASE_URL staging
vercel env add FRONTEND_URL staging

# Deploy to staging
vercel --target staging
```

### Monitoring Integration
```bash
# Add Sentry
vercel env add SENTRY_DSN production
vercel env add VITE_SENTRY_DSN production

# Add PostHog
vercel env add VITE_POSTHOG_KEY production
```

## Automation Scripts

Available scripts in `/scripts/`:
- `setup-vercel-env.sh` - Environment setup automation
- `validate-vercel-env.sh` - Configuration validation
- `setup-neon-production.sh` - Database setup
- `setup-upstash.sh` - Redis setup
- `deploy-vercel.sh` - Deployment automation

## Next Steps

1. Complete environment setup for all three environments
2. Run validation scripts to ensure everything is configured correctly
3. Test deployment to preview environment first
4. Deploy to production and monitor health checks
5. Set up monitoring and alerting
6. Document any custom configuration for your team

## Support

For issues with this setup:
1. Check the validation logs in `vercel-env-validation.log`
2. Review the troubleshooting section above
3. Check Vercel deployment logs
4. Verify external service status (Neon, Upstash, Stripe, Resend)
5. Test connectivity using the provided scripts