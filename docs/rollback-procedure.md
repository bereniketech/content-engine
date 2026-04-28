# Production Rollback Procedure

**Date:** 2026-04-28  
**Stability Phase:** 3 (Production Readiness)  
**Purpose:** Quickly revert to previous stable version if critical issues detected

---

## Decision Tree: Should You Rollback?

```
CRITICAL ISSUE DETECTED
    |
    ├─ Is it a database issue?
    │  ├─ YES → Data corruption/migration failure → Section A (Database Rollback)
    │  └─ NO → Continue
    │
    ├─ Is it a code issue?
    │  ├─ Syntax error / missing import → Section B (Code Rollback)
    │  ├─ Logic error causing data loss → Section A (Database Rollback)
    │  └─ Performance issue → Section C (Partial Rollback)
    │
    ├─ Is it a configuration/secrets issue?
    │  ├─ YES → Fix config vars, no rollback needed
    │  └─ NO → Continue
    │
    └─ Severity assessment:
       ├─ Error rate > 10% for 5+ min → IMMEDIATE ROLLBACK
       ├─ P99 latency > 5s for 10+ min → Investigate first, then decide
       ├─ Data loss detected → IMMEDIATE DATABASE ROLLBACK
       ├─ Payment processing broken → IMMEDIATE ROLLBACK
       └─ Minor issue → Monitor and fix in next release
```

---

## Section A: Full Database Rollback

**When to use:** Database corruption, failed migration, or data loss

**Severity:** CRITICAL  
**Time to Execute:** 15-30 minutes  
**Data Loss Risk:** LOW (if backup used)  
**Steps:**

### Step 1: Assess Damage (2 minutes)

```bash
# 1. Check migration status
export DATABASE_URL=postgresql://...production...
psql $DATABASE_URL -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 3;"

# 2. Verify data integrity
psql $DATABASE_URL -c "
  SELECT table_name, COUNT(*) as row_count
  FROM information_schema.tables t
  LEFT JOIN (SELECT table_name, COUNT(*) FROM ...)
  WHERE table_schema = 'public'
  GROUP BY table_name
  ORDER BY row_count DESC;"

# 3. Check for obvious corruption
psql $DATABASE_URL -c "SELECT COUNT(*) FROM subscriptions WHERE user_id IS NULL;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM user_devices WHERE fingerprint_hash IS NULL;"

# Decision: Is rollback necessary?
# - Data loss (NULL key columns) → YES
# - Migration failed (schema mismatch) → YES
# - Performance degraded only → NO, wait and monitor
```

### Step 2: Stop Application Traffic (1 minute)

```bash
# 1. Scale down application to 0 replicas (stops new requests)
vercel scale down  # or equivalent for your deployment platform

# OR: Enable maintenance mode
curl -X POST https://api.content-engine.com/api/maintenance \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"enabled": true, "message": "Maintenance mode: database recovery in progress"}'

# 2. Monitor for active connections to clear
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
# Wait until count = 0 or ~5 sec max
```

### Step 3: Restore from Backup (5-10 minutes)

```bash
# 1. Find the latest pre-migration backup
ls -lt /backups/prod-pre-migration-*.sql | head -1
# Output: prod-pre-migration-20260428-120000.sql

BACKUP_FILE="/backups/prod-pre-migration-20260428-120000.sql"

# 2. Create new database connection to temp database (safety precaution)
createdb -h localhost -U postgres production_rollback

# 3. Restore backup to temp database
pg_restore -d production_rollback < $BACKUP_FILE
# Monitor this carefully — watch for errors

# 4. Verify restored data is correct
psql -d production_rollback -c "
  SELECT COUNT(*) as total_subscriptions,
         COUNT(DISTINCT user_id) as unique_users,
         MAX(created_at) as latest_creation
  FROM subscriptions;"

# 5. If correct, swap databases
# (This varies by hosting provider; example below for Supabase)
supabase db push --remote --dry-run  # Verify no issues
supabase db reset  # Reset to backup point

# If Supabase: use Web UI to restore snapshot
# Supabase → Backups → Restore Snapshot → [select pre-migration backup]
```

### Step 4: Verify Restoration (5 minutes)

```bash
# 1. Reconnect application to production database
export DATABASE_URL=postgresql://...production...

# 2. Verify schema matches expected version
psql $DATABASE_URL -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 5;"

# Expected output:
# version
# -------
# 20260427150000  (one migration back)
# 20260426100000
# ... (no new migration versions)

# 3. Quick data sanity checks
psql $DATABASE_URL -c "
  SELECT 
    (SELECT COUNT(*) FROM subscriptions) as sub_count,
    (SELECT COUNT(*) FROM users) as user_count,
    (SELECT COUNT(*) FROM content_assets) as asset_count;"

# 4. Test critical queries
psql $DATABASE_URL -c "
  SELECT user_id, status, COUNT(*)
  FROM subscriptions
  GROUP BY user_id, status
  HAVING COUNT(*) > 1;"
# Should return 0 rows (no duplicate subscriptions per user)
```

### Step 5: Revert Application Code (3 minutes)

```bash
# 1. Find the commit before the failed migration
git log --oneline production | head -5
# Output:
# a1b2c3d (HEAD) chore: apply migration 20260428
# x9y8z7w feat: add subscription constraint migration
# ...

# 2. Create a revert commit
git revert a1b2c3d
git commit -m "Revert: database migration rollback due to data corruption"

# 3. Push to trigger CI/CD redeployment
git push origin production

# 4. Monitor CI/CD
gh run watch
# Wait for: deployment completes ✓
```

### Step 6: Resume Application Traffic (2 minutes)

```bash
# 1. Scale application back up
vercel scale up  # or equivalent

# 2. Disable maintenance mode
curl -X POST https://api.content-engine.com/api/maintenance \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"enabled": false}'

# 3. Verify health checks pass
for i in {1..5}; do
  curl -s https://api.content-engine.com/health | jq .status
  sleep 2
done
# All should return "healthy"
```

### Step 7: Verify Metrics Normalize (5 minutes)

```bash
# 1. Check error rate returns to < 1%
curl https://prometheus/api/v1/query?query='rate(http_requests_total{status=~"5[0-9]{2}"}[5m])' | jq .

# 2. Check latency returns to baseline
curl https://prometheus/api/v1/query?query='histogram_quantile(0.95, http_request_duration_ms)' | jq .

# 3. Check database connection pool
curl https://prometheus/api/v1/query?query='db_connection_pool_active' | jq .

# 4. Verify no new Sentry errors
curl https://sentry.io/api/0/projects/[org]/[project]/events/?environment=production | jq '.data[] | select(.timestamp > "'$(date -u -d '5 minutes ago' +'%Y-%m-%dT%H:%M:%S')'")' | wc -l
# Should be close to 0
```

---

## Section B: Code Rollback (No Database Changes)

**When to use:** Syntax errors, logic bugs, missing dependencies  
**Severity:** HIGH  
**Time to Execute:** 5-10 minutes  
**Data Loss Risk:** NONE

### Step 1: Identify Problem Commit (2 minutes)

```bash
# 1. Check recent commits to production
git log --oneline production -n 10

# 2. Check Sentry for error patterns
# Sentry → Issues → Most Recent → Check timestamp and affected versions

# 3. Identify the problematic commit
# Example: a1b2c3d introduced new bug
git log --oneline -p a1b2c3d | head -50
# Review changes for obvious issues
```

### Step 2: Create Revert Commit (1 minute)

```bash
# 1. Revert the problematic commit
git revert a1b2c3d
# This creates a NEW commit that undoes changes
# (does not rewrite history)

# 2. Review the revert
git show HEAD
# Verify the changes are correct

# 3. Push to trigger deployment
git push origin main:production
```

### Step 3: Monitor Deployment (5 minutes)

```bash
# 1. Watch CI/CD pipeline
gh run watch

# 2. Check health endpoints after deployment
curl -s https://api.content-engine.com/health | jq .status

# 3. Verify error rate drops
sleep 10  # Wait for metrics to update
curl https://prometheus/api/v1/query?query='rate(http_requests_total{status=~"5[0-9]{2}"}[1m])' | jq .

# 4. Confirm Sentry error stop appearing
# Sentry → Issues → Verify no new events in last 2 min
```

### Step 4: Notify Team (1 minute)

```bash
# Post in #production-alerts
# "✅ Rollback complete. Reverted commit a1b2c3d. Error rate normalized. Investigating root cause."
```

---

## Section C: Partial Rollback (Selective Route Revert)

**When to use:** Specific route is broken, others are fine  
**Severity:** MEDIUM  
**Time to Execute:** 10-20 minutes  
**Complexity:** HIGH (use only if full rollback not practical)

### Step 1: Identify Affected Route (2 minutes)

```bash
# 1. Check Sentry error patterns
# Focus on error_code, affected_routes, user_impact

# Example: Only POST /api/content/generate is failing
# All other routes working fine

# 2. Verify it's not a cascading failure
# Check if dependencies of this route are also broken
curl -s https://api.content-engine.com/api/health | jq .components
```

### Step 2: Implement Feature Flag Disable (5 minutes)

```bash
# 1. Add feature flag to disable broken feature
# This is faster than code rollback if flag already exists

# Option A: Environment variable
export FEATURE_CONTENT_GENERATE_DISABLED=true
# Deploy new version with this env var set

# Option B: Database-backed feature flag (if implemented)
UPDATE feature_flags SET enabled = false WHERE name = 'content_generate';

# Option C: Redis-backed flag (if implemented)
redis-cli SET feature:content_generate disabled

# 2. Verify requests now return 503 Service Unavailable
curl -s -w "%{http_code}\n" https://api.content-engine.com/api/content/generate

# 3. If flag disabled: migrate users to fallback
# POST /api/content/generate → return 503 with fallback message
```

### Step 3: Communicate to Users (2 minutes)

```bash
# Post in-app notice
curl -X POST https://api.content-engine.com/api/notices \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "title": "Content Generation Temporarily Unavailable",
    "message": "We are fixing a critical issue. Try again in 15 minutes.",
    "severity": "warning"
  }'

# Post to Slack #outages
# "⚠️ Content generation temporarily disabled while we investigate critical bug"
```

### Step 4: Fix Root Cause in Non-Prod (During Downtime)

```bash
# While feature is disabled:

# 1. Create feature branch
git checkout -b fix/content-generate-bug

# 2. Reproduce issue in staging
npm run dev  # Run locally
# Trigger the bug scenario

# 3. Fix and test thoroughly
# - Review code
# - Add tests
# - Test in staging

# 4. Merge and deploy
git push origin fix/content-generate-bug
# Create PR, review, merge

# 5. Re-enable feature flag
export FEATURE_CONTENT_GENERATE_DISABLED=false
# Deploy new version
```

### Step 5: Re-enable and Monitor (3 minutes)

```bash
# 1. Remove the disabled flag
unset FEATURE_CONTENT_GENERATE_DISABLED
# Deploy new version

# 2. Test the fix
curl -s https://api.content-engine.com/api/content/generate \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d '{"topic": "test"}' | jq .

# 3. Monitor for errors
sleep 30
curl https://prometheus/api/v1/query?query='rate(http_requests_total{endpoint="/api/content/generate"}[1m])' | jq .

# 4. Post all-clear message
# Post in #outages: "✅ Content generation restored. Issue identified and fixed."
```

---

## Section D: Rollback Checklist

Use this checklist for ANY rollback scenario:

### Pre-Rollback (5 minutes)

- [ ] Confirm severity warrants rollback (error rate > 5% OR data loss OR revenue impact)
- [ ] Identify exact problem (commit hash, error type, affected component)
- [ ] Notify team on #production-alerts and Slack
- [ ] Begin incident timeline documentation
- [ ] Page on-call engineer if not already aware
- [ ] Start monitoring dashboard for current baseline

### During Rollback (15-30 minutes depending on type)

**For Code Rollback:**
- [ ] Create revert commit
- [ ] Review revert before pushing
- [ ] Push to production branch
- [ ] Monitor CI/CD deployment
- [ ] Watch error rate and latency metrics

**For Database Rollback:**
- [ ] Scale down application traffic
- [ ] Verify backup is available and testable
- [ ] Restore from backup to staging first (test)
- [ ] If successful, restore production
- [ ] Verify schema and data integrity
- [ ] Scale application back up

### Post-Rollback (10 minutes)

- [ ] Verify health checks pass
- [ ] Verify error rate < 1%
- [ ] Verify latency at baseline
- [ ] Confirm no new Sentry errors
- [ ] Manual test of critical user flows
- [ ] Post all-clear in #production-alerts
- [ ] Update incident timeline with resolution

### Post-Incident (24 hours)

- [ ] Schedule postmortem meeting
- [ ] Create GitHub issue for permanent fix
- [ ] Document root cause in this procedure
- [ ] Add new monitoring alert if applicable
- [ ] Update runbooks based on lessons learned
- [ ] Share postmortem findings with team

---

## Cache Clearing Instructions

**Required after rollback** to ensure stale data doesn't persist:

### Application Cache (In-Memory)

```bash
# If using Next.js ISR or Data Router caching:
# These clear automatically on redeployment

# Verify cache is cleared by:
# 1. Checking HTTP cache headers
curl -I https://api.content-engine.com/api/content/list | grep -i cache-control

# Expected headers:
# Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400
# OR
# Cache-Control: no-store  (for dynamic routes)
```

### Redis Cache (Session/Rate Limit)

```bash
# 1. Clear all Redis keys (safe only if no other apps share this instance)
redis-cli -u $UPSTASH_REDIS_REST_URL FLUSHDB

# 2. Verify keys cleared
redis-cli -u $UPSTASH_REDIS_REST_URL DBSIZE
# Should return: (integer) 0

# 3. Specific key cleanup (safer)
# Clear rate limit keys
redis-cli -u $UPSTASH_REDIS_REST_URL KEYS "rate_limit:*" | xargs -I {} redis-cli -u $UPSTASH_REDIS_REST_URL DEL {}

# Clear session keys
redis-cli -u $UPSTASH_REDIS_REST_URL KEYS "session:*" | xargs -I {} redis-cli -u $UPSTASH_REDIS_REST_URL DEL {}

# Clear wallet balance cache
redis-cli -u $UPSTASH_REDIS_REST_URL KEYS "wallet:*" | xargs -I {} redis-cli -u $UPSTASH_REDIS_REST_URL DEL {}
```

### CDN/Edge Cache (Vercel/Cloudflare)

```bash
# 1. Purge Vercel edge cache
vercel env pull
# Edit .env to update CACHE_INVALIDATION_TOKEN if needed

# 2. If using Cloudflare:
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      "https://api.content-engine.com/*"
    ]
  }'

# 3. Verify cache purge with:
curl -I https://api.content-engine.com/api/content/list | grep cf-cache-status
# Should NOT show "HIT" (cache was cleared)
```

### Database Query Cache (if applicable)

```bash
# 1. Clear any prepared statement cache
psql $DATABASE_URL -c "DISCARD PLANS;"

# 2. If using query result caching in application:
# DELETE FROM query_cache WHERE created_at < NOW() - INTERVAL '1 minute';

# 3. Verify fresh queries are running
# Check slow query log for recent queries
```

---

## Rollback Decision Examples

### Example 1: Syntax Error Post-Deployment

**Scenario:** Deploy contains `const x = ;` (missing value)

**Decision:** Code Rollback (Section B)

```bash
git revert a1b2c3d
git push origin main:production
# Wait 5 minutes for deployment
# Error rate drops to 0%
# ✓ Success
```

**Time:** 10 minutes

---

### Example 2: Migration Corrupts Data

**Scenario:** Migration sets `subscriptions.status = NULL` for 5000 rows

**Decision:** Database Rollback (Section A)

```bash
# 1. Discover issue in Sentry/logs
# 2. Scale down app (prevent more damage)
# 3. Restore from backup (prod-pre-migration-20260428-120000.sql)
# 4. Verify data integrity
# 5. Revert migration commit
# 6. Scale app back up
# 7. Verify health
```

**Time:** 20 minutes

**Customer Impact:** 1000 customers lose subscription access for 20 min → needs manual fix/credit

---

### Example 3: Single Route Broken (Content Generation)

**Scenario:** New code in `POST /api/content/generate` throws error

**Decision:** Partial Rollback (Section C)

```bash
# Option 1: Disable feature flag (faster)
FEATURE_CONTENT_GENERATE_DISABLED=true
# Deploy
# Users see "temporarily unavailable" message
# Fix code in background
# Re-enable when ready

# Option 2: Code rollback (safer but slower)
git revert a1b2c3d
# Deploy
```

**Time:** 5 minutes (feature flag) or 10 minutes (code rollback)

**Customer Impact:** Low (other features work, just generation unavailable for ~10 min)

---

## Critical Contacts

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| On-Call Engineer | [Name] | [+1-...] | @[slack-name] |
| CTO | [Name] | [+1-...] | @[slack-name] |
| Database Admin | [Name] | [+1-...] | @[slack-name] |
| Incident Commander | [Name] | [+1-...] | @[slack-name] |

---

## Recent Rollbacks (History)

| Date | Reason | Type | Duration | Result |
|------|--------|------|----------|--------|
| 2026-04-28 | (example) | Code | 8 min | Successful |
| --- | --- | --- | --- | --- |

---

**Last Updated:** 2026-04-28  
**Tested:** [To be filled after first deployment]  
**Next Review:** 2026-05-28
