# Neon Security Configuration Checklist

## Database Security Settings

### 1. Network Security
- ✅ Enable IP Allowlist (Production only)
- ✅ Force SSL connections (`sslmode=require`)
- ✅ Use connection pooling with pgbouncer
- ✅ Set connection timeouts (15s recommended)

### 2. Authentication
- ✅ Use strong passwords (auto-generated)
- ✅ Rotate database passwords quarterly
- ✅ Use separate credentials for Preview/Production
- ✅ Store credentials in Vercel Environment Variables

### 3. Connection Limits
```sql
-- Recommended Neon settings:
-- Max connections: 100 (Free tier limit)
-- Pool size: 25 connections
-- Pool timeout: 20 seconds
-- Idle timeout: 600 seconds
```

### 4. Monitoring Setup
- ✅ Enable slow query logging
- ✅ Set up connection monitoring alerts
- ✅ Monitor database size and growth
- ✅ Track query performance metrics

### 5. Backup Strategy
- ✅ Point-in-time recovery (7 days retention)
- ✅ Regular manual snapshots before major deploys
- ✅ Test restore procedures monthly
- ✅ Document recovery procedures

### 6. Access Control
- ✅ Principle of least privilege
- ✅ No direct database access in production
- ✅ All access through application layer
- ✅ Regular access audits

## Environment-Specific Settings

### Production
- Database: truecheckia-production
- Branch: main
- SSL: Required
- IP Allowlist: Vercel IPs only
- Connection Pool: 25 connections

### Preview
- Database: truecheckia-production
- Branch: preview
- SSL: Required
- IP Allowlist: Open (for testing)
- Connection Pool: 10 connections

## Performance Optimization

### Connection String Optimization
```bash
# Production
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require&pgbouncer=true&connect_timeout=15&pool_timeout=20&application_name=truecheckia-prod"

# Preview
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require&pgbouncer=true&connect_timeout=15&pool_timeout=20&application_name=truecheckia-preview"
```

### Query Performance
- Use prepared statements
- Implement query caching
- Monitor slow queries (>100ms)
- Optimize N+1 query patterns
- Use database indexes effectively

## Monitoring Alerts

### Critical Alerts
- Connection pool exhaustion (>80%)
- Slow queries (>1s)
- Failed connections (>5%)
- Database size approaching limits

### Warning Alerts
- High CPU usage (>70%)
- Memory usage (>80%)
- Query duration increase (>50ms)
- Connection count increase (>20 concurrent)