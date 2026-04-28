---
task: 030
feature: stability-roadmap
status: pending
model: haiku
supervisor: software-cto
agent: observability-engineer
depends_on: [task-029]
---

# Task 030: Monitor production metrics and establish SLOs

## Skills
- .kit/skills/observability/prometheus-configuration/SKILL.md
- .kit/skills/observability/slo-implementation/SKILL.md

## Agents
- @observability-engineer

## Commands
- /verify

---

## Objective
Monitor key production metrics 24/7, establish SLOs for availability and latency, set up SLI tracking, and create runbooks for common production issues.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `monitoring/slos.yml` | SLO definitions and SLI targets |
| `monitoring/runbooks/` | On-call runbooks for common incidents |
| `docs/PRODUCTION_METRICS.md` | Metric definitions and dashboards |

---

## Dependencies
- Depends on: task-029 (production deployment complete)

---

## Code Templates

### `monitoring/slos.yml`

```yaml
# Service Level Objectives for Content Engine

slos:
  - name: availability
    description: "API availability (successful responses)"
    target: 99.5%
    sli:
      - metric: http_requests_total{status=~"2.."}
      - metric: http_requests_total
    window: 30d

  - name: latency
    description: "P95 request latency"
    target: 500ms
    sli:
      - metric: histogram_quantile(0.95, http_request_duration_ms)
    window: 30d

  - name: error_rate
    description: "Errors below 1%"
    target: 99%
    sli:
      - metric: rate(http_requests_total{status!~"[45][0-9]{2}"}[5m]) / rate(http_requests_total[5m])
    window: 30d
```

### `monitoring/runbooks/high-error-rate.md`

```markdown
# Runbook: High Error Rate

## Alert
- **Threshold:** Error rate > 1% for 2+ minutes
- **Severity:** Critical
- **On-Call:** Page immediately

## Diagnosis

1. Check recent deployments
   \`\`\`bash
   gh run list --limit 5
   \`\`\`

2. Check error logs
   \`\`\`bash
   tail -f logs/production.log | grep ERROR | head -50
   \`\`\`

3. Check database health
   \`\`\`sql
   SELECT COUNT(*) FROM pg_stat_statements WHERE mean_exec_time > 1000;
   \`\`\`

4. Check rate limiter status
   \`\`\`bash
   redis-cli INFO stats
   \`\`\`

## Resolution

### If database is slow:
- Check active connections: \`SELECT count(*) FROM pg_stat_activity;\`
- Kill idle connections: \`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state='idle' AND query_start < NOW() - INTERVAL '10 min';\`

### If rate limiter is erroring:
- Restart rate limiter service: \`systemctl restart rate-limiter\`
- Check Redis connectivity: \`redis-cli ping\`

### If code error:
- Trigger rollback: \`git push origin main:production --force\` (coordinate with team)
- Verify rollback: \`curl https://api.example.com/health\`

## Post-Incident

1. Log incident in PostMortem system
2. Review error logs for root cause
3. Create bug fix task if needed
4. Update runbook if new patterns discovered
```

### `monitoring/runbooks/high-latency.md`

```markdown
# Runbook: High P95 Latency

## Alert
- **Threshold:** P95 latency > 500ms for 5+ minutes
- **Severity:** Warning
- **On-Call:** Page after 10 minutes

## Diagnosis

1. Check Prometheus dashboard
   - P50, P95, P99 latencies
   - Request rate
   - Error rate

2. Check database performance
   \`\`\`sql
   SELECT query, calls, mean_exec_time FROM pg_stat_statements 
   ORDER BY mean_exec_time DESC LIMIT 10;
   \`\`\`

3. Check Redis latency
   \`\`\`bash
   redis-cli --latency
   \`\`\`

4. Check application logs for slow operations
   \`\`\`bash
   grep "duration:" logs/production.log | sort -t: -k2 -rn | head -10
   \`\`\`

## Resolution

### If database queries are slow:
- Add missing indexes
- Analyze query plans: \`EXPLAIN ANALYZE <query>\`
- Scale database if CPU/memory high

### If Redis is slow:
- Check Redis memory: \`redis-cli INFO memory\`
- Evict old keys if memory full
- Consider upgrading Redis instance

### If application code is slow:
- Profile with flame graphs
- Optimize hot code paths
- Consider caching expensive computations

## Post-Incident

1. Document slow query patterns
2. Create performance optimization task
3. Update monitoring thresholds if false positives
```

### `docs/PRODUCTION_METRICS.md`

```markdown
# Production Metrics Reference

## Key Metrics

### Request-Level Metrics
- **http_requests_total** — Total requests received (counter)
- **http_request_duration_ms** — Request duration histogram
- **http_requests_in_progress** — Concurrent requests (gauge)

### Error Metrics
- **http_requests_total{status="5xx"}** — Server errors
- **http_requests_total{status="4xx"}** — Client errors
- **error_rate** — Percentage of failing requests (derived)

### Database Metrics
- **db_connection_pool_active** — Active connections (gauge)
- **db_connection_pool_max** — Pool size limit (gauge)
- **db_query_duration_ms** — Query execution time (histogram)

### Cache Metrics
- **redis_command_duration_ms** — Redis op latency (histogram)
- **redis_commands_total** — Redis ops count (counter)
- **cache_hit_rate** — Cache efficiency (gauge)

### Rate Limiting Metrics
- **rate_limit_events_total** — Rate limit triggers (counter)
- **rate_limiter_errors_total** — Rate limiter failures (counter)

## Dashboards

### Overview Dashboard
- Request rate (requests/sec)
- Error rate (%)
- P50, P95, P99 latencies
- Active users

### Performance Dashboard
- Database query times (top 10)
- Redis latency
- Cache hit rate
- DB connection pool utilization

### SLO Dashboard
- Availability % (target: 99.5%)
- Latency P95 (target: 500ms)
- Error rate (target: <1%)

## Alerts

### Critical (Page immediately)
- Error rate > 1% for 2+ min
- Rate limiter errors detected
- Database unreachable

### Warning (Page after 10 min)
- P95 latency > 500ms for 5+ min
- DB pool > 80% for 2+ min
- Redis latency > 50ms for 2+ min

## On-Call Schedule

- **Primary:** [Name] (Mon-Fri)
- **Secondary:** [Name] (24/7 backup)
- **Escalation:** [Manager] (after 15 min, critical only)

Runbooks: see monitoring/runbooks/ directory
```

---

## Acceptance Criteria
- [ ] SLO definitions created (availability 99.5%, latency <500ms, error rate <1%)
- [ ] SLI metrics tracking in Prometheus
- [ ] Runbooks created for critical alerts (high error rate, high latency, DB issues)
- [ ] On-call schedule documented
- [ ] Production metrics dashboard operational
- [ ] Alert notifications working (Slack/PagerDuty)
- [ ] Team trained on runbooks
- [ ] `/verify` passes

---

## Implementation Steps
1. Create `monitoring/slos.yml` with SLO/SLI definitions
2. Create runbooks directory and common incident responses
3. Document all production metrics in PRODUCTION_METRICS.md
4. Test alert notifications
5. Set up on-call schedule and escalation policy
6. Train team on runbooks
7. Run `/verify`

---

## Handoff to Next Task
_(fill via /task-handoff)_
