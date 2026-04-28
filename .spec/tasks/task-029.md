---
task: 029
feature: stability-roadmap
status: pending
model: haiku
supervisor: software-cto
agent: devops-infra-expert
depends_on: [task-027, task-028]
---

# Task 029: Deploy to production and configure monitoring

## Skills
- .kit/skills/devops/terminal-cli-devops/SKILL.md
- .kit/skills/observability/prometheus-configuration/SKILL.md

## Agents
- @devops-infra-expert

## Commands
- /verify

---

## Objective
Deploy Phase 1–2 code changes to production, verify deployment success, configure monitoring dashboards, and set up on-call alerting for critical metrics.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `DEPLOYMENT.md` | Deployment checklist and runbook |
| `.github/workflows/deploy-production.yml` | CI/CD deployment workflow |
| `monitoring/dashboards/content-engine.json` | Prometheus/Grafana dashboard |
| `monitoring/alerts.yml` | Alert rules for critical metrics |

---

## Dependencies
- Depends on: task-027 (load tests passed)
- Depends on: task-028 (security audit passed)

---

## Code Templates

### `DEPLOYMENT.md`

```markdown
# Production Deployment Runbook

## Pre-Deployment Checklist

- [ ] All Phase 1–2 tasks completed and merged to main
- [ ] Load tests passed (p95 < 500ms, error rate < 1%)
- [ ] Security audit cleared (all 9 checks passed)
- [ ] Database migrations tested on staging
- [ ] Backup taken of production database
- [ ] Communication sent to team (deployment window)

## Deployment Steps

### 1. Pre-deployment (15 min)

\`\`\`bash
# Verify main branch is clean
git status
# Output should show: "nothing to commit"

# Verify all tests pass
npm test
npm run type-check
npm run lint

# Tag the release
git tag -a v1.0.0-stable -m "Production deployment: all phases complete"
git push origin v1.0.0-stable
\`\`\`

### 2. Deploy Code (5 min)

\`\`\`bash
# Push to production branch (triggers CI/CD)
git push origin main:production

# Monitor deployment in GitHub Actions
gh run watch
# Wait for: all checks ✅
\`\`\`

### 3. Run Migrations (10 min)

\`\`\`bash
# Connect to production database
export DATABASE_URL=postgresql://...production...

# Apply migrations
npx supabase migration up

# Verify migrations succeeded
psql $DATABASE_URL -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 5;"
\`\`\`

### 4. Verify Deployment (10 min)

\`\`\`bash
# Health check
curl https://api.example.com/health | jq .

# Smoke tests
npm run smoke-tests

# Check logs for errors
tail -f logs/production.log | grep -i error | head -20
\`\`\`

### 5. Post-Deployment (5 min)

\`\`\`bash
# Verify monitoring is active
curl https://prometheus/api/v1/query?query=up | jq .

# Check alert status
curl https://alertmanager/api/v1/alerts | jq '.data[] | select(.state=="firing")'
# Expected: No firing alerts

# Notify team
# "Deployment complete. All metrics green. Monitoring production."
\`\`\`

## Rollback Procedure (If Needed)

\`\`\`bash
# If critical issue discovered, rollback immediately
git revert <commit-hash>
git push origin main:production

# Revert migrations if needed
# (Be careful: may require data migration)
\`\`\`

## Success Criteria

- ✅ All code deployed and running
- ✅ No errors in logs (p95 response time, error rate)
- ✅ Health check returns 200
- ✅ Smoke tests pass
- ✅ All rate limiters working
- ✅ Monitoring and alerts configured
- ✅ On-call paging functional
```

### `.github/workflows/deploy-production.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [production]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test -- --coverage
      
      - name: Type check
        run: npm run type-check
      
      - name: Deploy to production
        run: |
          npm run build
          npm run deploy:production
        env:
          PRODUCTION_URL: ${{ secrets.PRODUCTION_URL }}
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      
      - name: Health check
        run: |
          curl -f https://api.example.com/health || exit 1
      
      - name: Notify Slack
        if: success()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "✅ Production deployment successful",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "✅ Production deployed\nVersion: ${{ github.ref }}"
                  }
                }
              ]
            }
```

### `monitoring/dashboards/content-engine.json` (Grafana)

```json
{
  "dashboard": {
    "title": "Content Engine Production",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[1m])"
          }
        ]
      },
      {
        "title": "P95 Latency (ms)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_ms)"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~'[45][0-9]{2}'}[1m]) / rate(http_requests_total[1m])"
          }
        ]
      },
      {
        "title": "DB Connection Pool",
        "targets": [
          {
            "expr": "db_connection_pool_active"
          }
        ]
      },
      {
        "title": "Redis Latency (ms)",
        "targets": [
          {
            "expr": "redis_command_duration_ms"
          }
        ]
      },
      {
        "title": "Rate Limit Events",
        "targets": [
          {
            "expr": "rate_limit_events_total"
          }
        ]
      }
    ]
  }
}
```

### `monitoring/alerts.yml`

```yaml
groups:
  - name: content-engine
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~'[45][0-9]{2}'}[5m]) / rate(http_requests_total[5m]) > 0.01
        for: 2m
        annotations:
          summary: "High error rate detected (>1%)"
          severity: critical

      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_ms) > 500
        for: 5m
        annotations:
          summary: "P95 latency > 500ms"
          severity: warning

      - alert: DBPoolExhaustion
        expr: db_connection_pool_active / db_connection_pool_max > 0.8
        for: 2m
        annotations:
          summary: "DB connection pool 80%+ utilized"
          severity: warning

      - alert: RedisLatency
        expr: redis_command_duration_ms > 50
        for: 2m
        annotations:
          summary: "Redis latency > 50ms"
          severity: warning

      - alert: RateLimiterFailure
        expr: rate_limiter_errors_total > 0
        for: 1m
        annotations:
          summary: "Rate limiter errors detected"
          severity: critical
```

---

## Acceptance Criteria
- [ ] Code deployed to production successfully
- [ ] All health checks pass
- [ ] No errors in logs
- [ ] Monitoring dashboards configured and showing data
- [ ] Alert rules configured and armed
- [ ] On-call routing configured
- [ ] Team notified of production deployment
- [ ] Deployment marked as successful in release notes
- [ ] `/verify` passes

---

## Implementation Steps
1. Create `DEPLOYMENT.md` with full runbook
2. Create `.github/workflows/deploy-production.yml` with CI/CD pipeline
3. Create Grafana dashboard JSON
4. Create Prometheus alert rules YAML
5. Review deployment checklist
6. Execute pre-deployment steps
7. Push to production branch (triggers CI/CD)
8. Monitor deployment in GitHub Actions
9. Run post-deployment verification
10. Run `/verify`

---

## Handoff to Next Task
_(fill via /task-handoff)_
