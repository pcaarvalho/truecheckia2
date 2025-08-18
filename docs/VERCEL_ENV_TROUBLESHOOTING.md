# Vercel Environment Variables Troubleshooting Guide

This guide helps you diagnose and fix common issues with environment variables in TrueCheckIA's Vercel deployment.

## Quick Diagnostics

```bash
# Run comprehensive validation
./scripts/validate-vercel-env.sh production

# Check specific environment
vercel env ls | grep production

# View deployment logs
vercel logs --follow

# Test local environment
vercel dev
```

## Common Issues and Solutions

### 1. Build Failures

#### Issue: Frontend Build Fails
```
Error: Missing environment variables: VITE_API_BASE_URL
```

**Cause**: Frontend (Vite) environment variables not set in Vercel

**Solution**:
```bash
# Check if VITE_ variables are set
vercel env ls | grep VITE_

# Set missing variables
echo "https://yourdomain.com/api" | vercel env add VITE_API_BASE_URL production
echo "https://yourdomain.com" | vercel env add VITE_APP_URL production
echo "pk_live_your-key" | vercel env add VITE_STRIPE_PUBLISHABLE_KEY production
echo "production" | vercel env add VITE_ENV production
```

**Prevention**: Use the setup script to ensure all variables are configured:
```bash
./scripts/setup-vercel-env.sh setup production --interactive
```

#### Issue: TypeScript Build Fails
```
Error: Cannot find module '@/lib/env'
```

**Cause**: Environment validation files expecting specific variables

**Solution**: Check that all required variables are set and properly formatted:
```bash
# Validate environment
./scripts/validate-vercel-env.sh production

# Check variable formats
vercel env ls | grep -E "(URL|KEY|SECRET)"
```

### 2. Database Connection Issues

#### Issue: PostgreSQL Connection Failed
```
Error: connect ENOTFOUND host.neon.tech
```

**Cause**: Invalid database URL or connection parameters

**Solution**:
```bash
# Check database URL format
vercel env ls | grep DATABASE_URL

# Should be: postgresql://username:password@host:5432/database?sslmode=require&pgbouncer=true

# Test connection
./scripts/test-neon-connectivity.ts

# Update with correct URL
echo "postgresql://user:pass@host:5432/db?sslmode=require&pgbouncer=true" | \
  vercel env add DATABASE_URL production --sensitive
```

**Common URL Issues**:
- Missing `?sslmode=require` for Neon
- Missing `&pgbouncer=true` for production
- Wrong port (should be 5432)
- Expired password
- Wrong database name

#### Issue: Migration Failures
```
Error: Database migration failed - relation does not exist
```

**Cause**: Direct URL not set or shadow database missing

**Solution**:
```bash
# Set direct URL (without pgbouncer)
echo "postgresql://user:pass@host:5432/db?sslmode=require" | \
  vercel env add DIRECT_URL production --sensitive

# Set shadow database
echo "postgresql://user:pass@host:5432/shadow_db?sslmode=require" | \
  vercel env add SHADOW_DATABASE_URL production --sensitive

# Run migrations
npm run db:migrate
```

### 3. Redis Connection Issues

#### Issue: Redis Connection Failed
```
Error: Redis connection failed - ECONNREFUSED
```

**Cause**: Invalid Redis configuration or missing Upstash credentials

**For Development** (Local Redis):
```bash
# Check if local Redis is running
redis-cli ping

# Start Redis
docker-compose up -d redis

# Set Redis URL
echo "redis://localhost:6379" | vercel env add REDIS_URL development
```

**For Production/Preview** (Upstash):
```bash
# Check Upstash credentials
vercel env ls | grep UPSTASH

# Should have both URL and token:
# UPSTASH_REDIS_REST_URL: https://region.rest.upstash.io
# UPSTASH_REDIS_REST_TOKEN: your-token

# Test connection
./scripts/test-upstash-connectivity.ts

# Update credentials from Upstash console
echo "https://region.rest.upstash.io" | vercel env add UPSTASH_REDIS_REST_URL production
echo "your-token" | vercel env add UPSTASH_REDIS_REST_TOKEN production --sensitive
```

### 4. Authentication Issues

#### Issue: JWT Token Invalid
```
Error: Invalid JWT token
```

**Cause**: JWT secret not set or changed without redeployment

**Solution**:
```bash
# Check if JWT secrets are set
vercel env ls | grep JWT_

# Generate and set new secrets
./scripts/rotate-secrets.sh production --jwt-only

# Deploy immediately
vercel --prod
```

**Note**: Changing JWT secrets will invalidate all user sessions.

#### Issue: Webhook Authentication Failed
```
Error: Webhook signature verification failed
```

**Cause**: Webhook secret mismatch or not set

**Solution**:
```bash
# Check webhook secrets
vercel env ls | grep -E "(WEBHOOK_SECRET|CRON_SECRET)"

# Set webhook secrets
echo "$(openssl rand -base64 64 | tr -d '=+/')" | \
  vercel env add WEBHOOK_SECRET production --sensitive

echo "$(openssl rand -base64 64 | tr -d '=+')" | \
  vercel env add CRON_SECRET production --sensitive
```

### 5. Payment Processing Issues

#### Issue: Stripe Connection Failed
```
Error: No such API key
```

**Cause**: Invalid or missing Stripe keys

**Solution**:
```bash
# Check Stripe keys
vercel env ls | grep STRIPE_

# Verify key format
# Secret key: sk_test_... or sk_live_...
# Publishable key: pk_test_... or pk_live_...
# Webhook secret: whsec_...

# Update from Stripe dashboard
echo "sk_live_your-secret-key" | vercel env add STRIPE_SECRET_KEY production --sensitive
echo "pk_live_your-publishable-key" | vercel env add STRIPE_PUBLISHABLE_KEY production
echo "pk_live_your-publishable-key" | vercel env add VITE_STRIPE_PUBLISHABLE_KEY production
```

#### Issue: Webhook Signature Invalid
```
Error: Invalid Stripe webhook signature
```

**Cause**: Webhook secret mismatch

**Solution**:
1. Go to Stripe Dashboard → Webhooks
2. Find your endpoint webhook
3. Copy the signing secret
4. Update in Vercel:
```bash
echo "whsec_your-webhook-secret" | \
  vercel env add STRIPE_WEBHOOK_SECRET production --sensitive
```

### 6. Email Service Issues

#### Issue: Email Sending Failed
```
Error: SMTP connection failed
```

**For Development** (Mailhog):
```bash
# Check if Mailhog is running
curl http://localhost:8025

# Start Mailhog
docker-compose up -d mailhog

# Set SMTP variables
echo "localhost" | vercel env add SMTP_HOST development
echo "1025" | vercel env add SMTP_PORT development
```

**For Production/Preview** (Resend):
```bash
# Check Resend configuration
vercel env ls | grep RESEND_

# Verify API key format: re_...
# Update from Resend dashboard
echo "re_your-api-key" | vercel env add RESEND_API_KEY production --sensitive
echo "TrueCheckIA <noreply@yourdomain.com>" | \
  vercel env add RESEND_FROM_EMAIL production
```

### 7. OpenAI API Issues

#### Issue: OpenAI API Quota Exceeded
```
Error: You exceeded your current quota
```

**Solution**:
1. Check usage at https://platform.openai.com/usage
2. Add payment method or increase limits
3. Consider using different key for different environments

#### Issue: Invalid OpenAI API Key
```
Error: Incorrect API key provided
```

**Solution**:
```bash
# Verify key format: sk-...
# Update key from OpenAI dashboard
echo "sk-your-new-api-key" | vercel env add OPENAI_API_KEY production --sensitive

# Test API access
curl -H "Authorization: Bearer sk-your-key" https://api.openai.com/v1/models
```

### 8. CORS and URL Issues

#### Issue: CORS Errors in Browser
```
Error: CORS policy blocked request
```

**Cause**: Mismatched URLs or missing CORS origins

**Solution**:
```bash
# Check URL consistency
vercel env ls | grep -E "(FRONTEND_URL|CORS_ORIGINS|VITE_)"

# Ensure URLs match:
# FRONTEND_URL: https://yourdomain.com
# CORS_ORIGINS: https://yourdomain.com,https://www.yourdomain.com
# VITE_APP_URL: https://yourdomain.com
# VITE_API_BASE_URL: https://yourdomain.com/api

# Update CORS origins
echo "https://yourdomain.com,https://www.yourdomain.com" | \
  vercel env add CORS_ORIGINS production
```

### 9. Function Timeout Issues

#### Issue: Serverless Function Timeout
```
Error: Function execution time exceeded
```

**Cause**: Long-running operations or missing caching

**Solution**:
1. Check function configuration in `vercel.json`
2. Optimize database queries
3. Implement proper caching
4. Consider background job processing

```bash
# Check current timeout settings
cat vercel.json | grep -A 10 functions

# For analysis functions, ensure adequate timeout:
# "maxDuration": 30 (for AI processing)
```

### 10. Environment Mismatch Issues

#### Issue: Wrong Environment Variables Loaded
```
Error: Using test keys in production
```

**Cause**: Variables set for wrong environment

**Solution**:
```bash
# List variables by environment
vercel env ls | grep production
vercel env ls | grep preview
vercel env ls | grep development

# Remove wrong environment variables
vercel env rm VARIABLE_NAME wrong-environment

# Set for correct environment
echo "correct-value" | vercel env add VARIABLE_NAME correct-environment
```

## Debugging Commands

### Environment Inspection
```bash
# List all environment variables
vercel env ls

# Filter by environment
vercel env ls | grep production

# Check specific variable
vercel env ls | grep DATABASE_URL

# Export environment variables (for debugging)
vercel env pull .env.local
```

### Connectivity Tests
```bash
# Test database connectivity
./scripts/test-neon-connectivity.ts

# Test Redis connectivity
./scripts/test-upstash-connectivity.ts

# Test external APIs
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
```

### Deployment Debugging
```bash
# Check build logs
vercel logs

# Follow live logs
vercel logs --follow

# Check specific function logs
vercel logs api/auth/login.ts

# Local development
vercel dev --debug
```

### Health Checks
```bash
# Backend health
curl https://yourdomain.com/api/health

# API status
curl https://yourdomain.com/api/v1/status

# Frontend health
curl https://yourdomain.com/
```

## Emergency Procedures

### Complete Environment Reset
```bash
# Backup current environment
./scripts/setup-vercel-env.sh backup production

# Remove all variables (dangerous!)
vercel env ls | grep production | awk '{print $1}' | while read var; do
  vercel env rm "$var" production --yes
done

# Restore from template
./scripts/setup-vercel-env.sh setup production --interactive
```

### Rollback to Previous Configuration
```bash
# Find backup file
ls -la secrets-backup-production-*

# Manually restore critical variables from backup
# (Note: values are redacted in backup for security)

# Redeploy previous version
vercel rollback
```

### Security Incident Response
```bash
# Immediately rotate all secrets
./scripts/rotate-secrets.sh production --interactive

# Deploy with new secrets
vercel --prod

# Monitor logs for issues
vercel logs --follow
```

## Prevention Strategies

### 1. Use Validation Scripts
```bash
# Always validate before deployment
./scripts/validate-vercel-env.sh production

# Set up automated validation in CI/CD
```

### 2. Environment Templates
- Keep templates updated: `.env.{environment}.template`
- Document any custom variables
- Version control templates (without secrets)

### 3. Regular Maintenance
```bash
# Schedule secret rotation every 90 days
./scripts/rotate-secrets.sh production

# Review and update external API keys
# Monitor usage and quotas
```

### 4. Monitoring and Alerts
- Set up error tracking (Sentry)
- Monitor API quotas and limits
- Alert on authentication failures
- Track deployment success rates

### 5. Documentation
- Document any custom configuration
- Keep troubleshooting steps updated
- Maintain runbooks for common issues

## Getting Help

### Log Analysis
1. Check Vercel function logs: `vercel logs`
2. Review validation reports: `vercel-env-validation.log`
3. Examine setup logs: `vercel-env-setup.log`

### External Service Status
- Neon: https://status.neon.tech/
- Upstash: https://status.upstash.com/
- Stripe: https://status.stripe.com/
- Resend: https://status.resend.com/
- OpenAI: https://status.openai.com/

### Support Channels
1. Check this troubleshooting guide
2. Review validation script outputs
3. Test with provided diagnostic scripts
4. Check external service status pages
5. Contact service support if needed

Remember: Most environment variable issues are configuration related and can be resolved by carefully checking variable names, formats, and environment targeting.