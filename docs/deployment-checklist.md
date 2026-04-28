# Production Deployment Checklist

**Date:** 2026-04-28  
**Stability Phase:** 3 (Production Readiness)  
**Target Stability:** 9.5/10

---

## Pre-Deployment Verification (48 hours before)

### Code Quality & Completeness
- [ ] All Phase 1–2 tasks completed (tasks 001–020)
- [ ] All code merged and reviewed on `main` branch
- [ ] Git log clean: `git log --oneline main | head -1`
- [ ] No uncommitted changes: `git status` shows clean tree
- [ ] Type checking passes: `npm run type-check` with 0 errors
- [ ] Linting passes: `npm run lint` with 0 errors
- [ ] All tests pass: `npm test -- --coverage` with >85% coverage on critical paths

### Database Migrations
- [ ] Migrations reviewed and tested on staging: `docs/MIGRATIONS-APPLIED.md`
- [ ] Subscriptions unique constraint migration created and tested
- [ ] FX rates table migration created and tested
- [ ] Database backup taken on production: `pg_dump > /backups/prod-$(date +%Y%m%d-%H%M%S).sql`
- [ ] Rollback scripts prepared and tested in staging
- [ ] Migration zero-downtime verification completed

### Load Testing & Performance
- [ ] Load tests passed at 100x scale (task-027)
  - [ ] P95 latency: < 500ms ✓
  - [ ] P99 latency: < 1s ✓
  - [ ] Error rate: < 1% ✓
- [ ] Rate limiters tested and verified under sustained load
- [ ] Database connection pool tuned and tested
- [ ] Cache hit rates verified (Redis/Supabase)

### Security Audit
- [ ] Full security audit completed (task-028)
- [ ] All 9 security checks passed
- [ ] CAPTCHA verification flow validated
- [ ] Webhook secret signing verified
- [ ] PCI-sensitive data audit passed (no sensitive data in logs)
- [ ] IP extraction verified (x-forwarded-for handling)

### Environment Configuration
- [ ] Production environment variables prepared (see section below)
- [ ] Secrets manager configured and tested
- [ ] Database URL verified and accessible
- [ ] AI provider keys (Anthropic/OpenAI) verified and tested
- [ ] Sentry DSN configured and tested
- [ ] Email provider (SendGrid/Resend) verified

### Team & Communication
- [ ] Deployment window announced to team (minimum 24 hours notice)
- [ ] On-call engineer assigned for 24 hours post-deployment
- [ ] Rollback procedure reviewed with team
- [ ] Incident response procedure documented and shared
- [ ] Slack notifications configured for deployment updates

---

## Environment Variables Setup (Production)

### Required Variables for Production Deployment

#### Supabase Configuration
```bash
# PostgreSQL connection (production instance)
DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/postgres
SUPABASE_SERVICE_ROLE_KEY=[service_role_key_from_supabase]
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon_key_from_supabase]
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=[publishable_key]
SUPABASE_DATABASE_PASSWORD=[database_password]
```

#### Application URLs
```bash
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://api.content-engine.com  # or your production domain
NEXT_PUBLIC_API_BASE=https://api.content-engine.com
```

#### AI Provider Keys
```bash
# Choose one as primary
AI_PROVIDER=anthropic  # or "openai"
ANTHROPIC_API_KEY=[claude_api_key]
OPENAI_API_KEY=[openai_api_key]
```

#### Image Generation
```bash
GEMINI_API_KEY=[google_gemini_api_key]
FAL_API_KEY=[fal_ai_api_key]
```

#### Error Tracking & Monitoring
```bash
SENTRY_DSN=https://[key]@[sentry-host]/[project-id]
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

#### Rate Limiting & Authentication
```bash
UPSTASH_REDIS_REST_URL=[upstash_redis_url]
UPSTASH_REDIS_REST_TOKEN=[upstash_redis_token]
NEXTAUTH_SECRET=[generated_secret_for_auth]
NEXTAUTH_URL=https://api.content-engine.com
```

#### Email & Communications
```bash
SENDGRID_API_KEY=[sendgrid_api_key]
EMAIL_FROM=noreply@content-engine.com
SLACK_WEBHOOK_URL=[slack_webhook_for_notifications]
```

#### Razorpay (Payment Processing)
```bash
RAZORPAY_KEY_ID=[razorpay_key_id]
RAZORPAY_KEY_SECRET=[razorpay_key_secret]
RAZORPAY_WEBHOOK_SECRET=[razorpay_webhook_secret]
```

#### Webhooks & External Services
```bash
WEBHOOK_SECRET=[webhook_signing_secret]
GITHUB_WEBHOOK_SECRET=[github_webhook_secret]
STRIPE_API_KEY=[stripe_api_key]  # if using Stripe
STRIPE_WEBHOOK_SECRET=[stripe_webhook_secret]
```

### Verification Commands
```bash
# Test Supabase connection
psql $DATABASE_URL -c "SELECT version();"

# Test Anthropic API
curl -H "Authorization: Bearer $ANTHROPIC_API_KEY" \
  https://api.anthropic.com/v1/models | jq '.data[0]'

# Test Sentry configuration
curl -X POST https://[sentry-host]/api/[project-id]/store/ \
  -H "X-Sentry-Auth: Bearer $SENTRY_DSN"

# Test Upstash Redis
redis-cli -u $UPSTASH_REDIS_REST_URL ping
```

---

## Database Migration Verification

### Pre-Migration Checks
```bash
# 1. Connect to production database
export DATABASE_URL=postgresql://...production...

# 2. Verify current migrations applied
psql $DATABASE_URL -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"

# 3. Take backup
pg_dump $DATABASE_URL > /backups/prod-pre-migration-$(date +%Y%m%d-%H%M%S).sql

# 4. Test migrations on staging database first
export DATABASE_URL_STAGING=postgresql://...staging...
psql $DATABASE_URL_STAGING < migrations/001_subscriptions_constraint.sql
psql $DATABASE_URL_STAGING < migrations/002_fx_rates_table.sql
```

### Migration Execution (Zero-Downtime)
```bash
# 1. Apply new migrations (use Supabase migrations framework)
supabase migration up

# 2. Verify migration success
psql $DATABASE_URL -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 2;"

# 3. Verify table structure
psql $DATABASE_URL -c "
  SELECT table_name, column_name, data_type
  FROM information_schema.columns
  WHERE table_name IN ('subscriptions', 'fx_rates', 'user_devices')
  ORDER BY table_name, ordinal_position;"

# 4. Check constraints
psql $DATABASE_URL -c "
  SELECT constraint_name, table_name, constraint_type
  FROM information_schema.table_constraints
  WHERE table_name IN ('subscriptions', 'fx_rates')
  ORDER BY table_name;"

# 5. Verify indexes exist
psql $DATABASE_URL -c "
  SELECT indexname, tablename
  FROM pg_indexes
  WHERE tablename IN ('user_devices', 'subscriptions');"
```

### Data Validation Post-Migration
```bash
# 1. Verify subscription data integrity
psql $DATABASE_URL -c "
  SELECT COUNT(*) as total, 
         COUNT(DISTINCT user_id) as unique_users,
         COUNT(CASE WHEN status IN ('active', 'trialing') THEN 1 END) as active_count
  FROM subscriptions;"

# 2. Check for NULL values in critical columns
psql $DATABASE_URL -c "
  SELECT COUNT(*) as null_count
  FROM subscriptions
  WHERE user_id IS NULL OR plan_id IS NULL OR status IS NULL;"

# 3. Verify FX rates table has initial data
psql $DATABASE_URL -c "
  SELECT currency_code, rate, updated_at
  FROM fx_rates
  ORDER BY updated_at DESC
  LIMIT 10;"
```

---

## Health Check Endpoints

### Primary Health Check
```bash
# Basic liveness check
curl -s https://api.content-engine.com/health | jq .

# Expected response:
{
  "status": "healthy",
  "timestamp": "2026-04-28T12:00:00Z",
  "version": "1.0.0",
  "components": {
    "database": "healthy",
    "redis": "healthy",
    "ai_provider": "healthy"
  }
}
```

### Component-Specific Health Checks
```bash
# Database connectivity
curl -s https://api.content-engine.com/api/health/db | jq .

# Redis connectivity
curl -s https://api.content-engine.com/api/health/redis | jq .

# AI Provider (Anthropic/OpenAI)
curl -s https://api.content-engine.com/api/health/ai | jq .

# Sentry error tracking
curl -s https://api.content-engine.com/api/health/sentry | jq .
```

### Health Check Success Criteria
```bash
# All health checks should return status: 200
for endpoint in health db redis ai sentry; do
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    https://api.content-engine.com/api/health/$endpoint)
  echo "Health check [$endpoint]: $status"
  [ "$status" = "200" ] || exit 1
done
echo "✓ All health checks passed"
```

---

## Rollback Procedure

### Immediate Rollback (If Critical Issue)
```bash
# 1. Assess severity
# - Database corruption? → restore from backup
# - Syntax errors? → revert commit
# - Performance degradation? → check logs for errors

# 2. Revert code to previous version
git log --oneline production | head -5
git revert <commit-hash>  # Create new commit that undoes changes
git push origin production

# 3. Monitor GitHub Actions for CI/CD completion
gh run watch

# 4. Verify rollback successful
curl -s https://api.content-engine.com/health | jq .status
```

### Database Rollback (If Migration Failed)
```bash
# 1. Restore from pre-migration backup
pg_restore -d postgres < /backups/prod-pre-migration-[timestamp].sql

# 2. Verify data integrity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM subscriptions;"
psql $DATABASE_URL -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;"

# 3. Revert code changes
git revert <migration-commit>
git push origin production

# 4. Clear application cache
curl -X POST https://api.content-engine.com/api/cache/clear \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Cache & CDN Invalidation
```bash
# 1. Clear Redis cache
redis-cli -u $UPSTASH_REDIS_REST_URL FLUSHDB

# 2. Purge Vercel edge cache
vercel env pull
vercel env set CACHE_PURGE_TIME=$(date +%s)

# 3. Clear browser caches (if using service worker)
# Users will need to refresh, or push new service worker
```

### Monitoring During Rollback
```bash
# 1. Monitor error rates
tail -f logs/production.log | grep -i error | head -20

# 2. Check Sentry for new errors
curl https://[sentry-host]/api/[project-id]/events/?environment=production | jq '.data[] | .level'

# 3. Verify rate limiters are working
redis-cli -u $UPSTASH_REDIS_REST_URL KEYS "rate_limit:*" | wc -l

# 4. Check API latency (should return to baseline)
curl -s -o /dev/null -w "Time: %{time_total}s\n" \
  https://api.content-engine.com/api/content/list
```

---

## Deployment Day Checklist (Day 10)

### Morning (Deployment Prep: 15 min)
- [ ] Read this checklist one final time
- [ ] Verify all pre-deployment checks are complete
- [ ] Final backup of production database
- [ ] Announce deployment window in team Slack
- [ ] Start monitoring dashboard (Grafana/Datadog)

### Mid-Morning (Code Deployment: 15 min)
```bash
# 1. Final code verification
git status  # Should be clean
npm test
npm run type-check

# 2. Tag the release
git tag -a v1.0.0-stable -m "Production deployment: Phase 1-2 complete, load tested, security audited"
git push origin v1.0.0-stable

# 3. Trigger deployment
git push origin main:production

# 4. Monitor CI/CD
gh run watch
# Watch for: all checks ✅
```

### Late Morning (Migrations: 20 min)
```bash
# Execute database migrations (see section above)
# Verify each step completes successfully
# Monitor application logs for any errors
```

### Early Afternoon (Verification: 20 min)
- [ ] Health checks pass (all 5 endpoints)
- [ ] Error rate normal (< 1%)
- [ ] Latency normal (p95 < 500ms)
- [ ] No critical Sentry alerts
- [ ] Database queries performing well

### Late Afternoon (Post-Deployment: 15 min)
- [ ] Smoke tests pass: `npm run test:smoke` (if exists)
- [ ] Manual testing of critical flows:
  - [ ] User signup works
  - [ ] Content generation completes
  - [ ] Payment processing functional
  - [ ] Webhook handling verified
- [ ] Team notifications sent
- [ ] On-call engineer briefed

### Evening (Monitoring: 30 min)
- [ ] Monitor production logs continuously
- [ ] Watch Sentry for new error patterns
- [ ] Verify rate limiters under normal load
- [ ] Check database slow queries log
- [ ] Confirm all alerts are armed and tested

---

## Success Criteria

Production deployment is successful when:

✅ **Code Deployed**
- All code merged and running on production
- Git tags created for this release
- CI/CD pipeline completed without errors

✅ **Health Checks Pass**
- All 5 health check endpoints return 200
- Database connectivity verified
- Redis cache operational
- AI provider API responding normally

✅ **Performance Metrics**
- API P95 latency < 500ms
- P99 latency < 1s
- Error rate < 1%
- 0 critical Sentry alerts

✅ **Functional Verification**
- User authentication working
- Content generation pipeline operational
- Payment processing functional
- Webhooks processing normally
- Rate limiters enforced

✅ **Monitoring Active**
- Sentry error tracking capturing events
- Prometheus metrics collecting data
- Grafana dashboards showing live data
- Alert rules armed and tested
- On-call escalation configured

✅ **Team Alignment**
- Team notified of deployment
- Release notes published
- On-call engineer informed
- Incident response procedures ready

---

## Troubleshooting Guide

| Issue | Diagnosis | Recovery |
|-------|-----------|----------|
| Health check 502 | Database connection failed | Verify DATABASE_URL, check Supabase status |
| High error rate (>5%) | New bugs or bad data migration | Check Sentry errors, review migration queries |
| P99 latency >2s | Database slow, missing indexes | Check DB query plan, run ANALYZE |
| Webhooks failing | Authentication or IP whitelisting | Verify webhook secrets, check server IP |
| Payment processing broken | Razorpay credentials invalid | Verify RAZORPAY_* env vars, test API key |
| Email not sending | SendGrid/Resend key expired | Verify EMAIL_* env vars, check provider |
| Rate limit blocking legitimate traffic | Threshold too low | Review UPSTASH_REDIS rules, adjust thresholds |

---

## Contacts & Escalation

- **On-Call Engineer:** [Engineer Name] ([phone] / [slack])
- **CTO/Tech Lead:** [CTO Name] ([phone] / [slack])
- **Incident Commander:** [Name] ([phone] / [slack])
- **Sentry Admin:** [Name] (for alert configuration)
- **Database Admin:** [Name] (for emergency rollback)

---

**Deployment Authorization:** _____________________ Date: _______

**Completed By:** _________________________ Time: __________ UTC

**Duration:** From __________ to __________ UTC
