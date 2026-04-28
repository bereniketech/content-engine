---
task: 027
feature: stability-roadmap
status: pending
model: haiku
supervisor: software-cto
agent: devops-infra-expert
depends_on: [task-026]
---

# Task 027: Run load tests and verify rate limits under load

## Skills
- .kit/skills/testing-quality/k6-load-testing/SKILL.md
- .kit/skills/observability/prometheus-configuration/SKILL.md

## Agents
- @devops-infra-expert

## Commands
- /verify

---

## Objective
Execute load tests against staging environment and verify that all rate limits hold under load: IP signup limits (3/24h), user generation limits (30/min), webhook limits (100/min), and that database/Redis performance stays acceptable.

---

## Files

### Verify (no changes)
| File | What to check |
|------|---------------|
| `load-tests/results.json` | Test metrics and pass/fail results |
| Staging logs | Error rates, rate limit triggers, performance |
| Metrics dashboard | DB connection pool, Redis latency, response times |

---

## Dependencies
- Depends on: task-026 (load test environment set up)

---

## Code Templates

### Load Test Execution

```bash
# Run full load test against staging
artillery run load-tests/load-test.yml \
  --target https://staging.example.com \
  --output load-tests/results.json

# Monitor in another terminal
tail -f logs/app.log | grep -E "rate_limit|error|latency"
```

### Metrics Verification (SQL queries)

```sql
-- Check rate limit bucket entries (Redis/in-memory)
SELECT COUNT(*) FROM rate_limit_logs 
WHERE created_at > NOW() - INTERVAL '10 minutes'
GROUP BY endpoint, ip_address;

-- Check signup attempts per IP (should max at 3)
SELECT ip_address, COUNT(*) as signup_count 
FROM auth_logs 
WHERE event='signup' 
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
ORDER BY signup_count DESC
LIMIT 10;

-- Check generation requests per user (should max at 30/min)
SELECT user_id, COUNT(*) as gen_count_per_minute
FROM generation_logs
WHERE created_at > NOW() - INTERVAL '1 minute'
GROUP BY user_id
ORDER BY gen_count_per_minute DESC;

-- Check webhook rate limits
SELECT ip_address, COUNT(*) as webhook_count
FROM webhook_logs
WHERE created_at > NOW() - INTERVAL '1 minute'
GROUP BY ip_address
ORDER BY webhook_count DESC;
```

### Performance Verification

```bash
# Check database connection pool
curl https://staging.example.com/api/health | jq '.database.connections'
# Expected: < 20 (most of pool unused)

# Check Redis latency (from application metrics)
curl https://staging.example.com/api/metrics | jq '.redis.latency_p99_ms'
# Expected: < 50ms

# Check response times under load
artillery report load-tests/results.json --output load-tests/report.html
# Expected: p95 latency < 500ms, p99 < 1000ms

# Check error rate
grep "statusCode: [45]" load-tests/results.json | wc -l
# Expected: < 1% of total requests
```

---

## Acceptance Criteria
- [ ] Load test completes successfully
- [ ] IP signup limit holds at 3 per 24h (4+ attempts blocked with 429)
- [ ] User generation limit holds at 30/min (31+ blocked with 429)
- [ ] Webhook rate limit holds at 100/min per IP (101+ blocked with 429)
- [ ] No database connection pool exhaustion
- [ ] Redis operations complete within 50ms p99
- [ ] Refund RPC succeeds under load
- [ ] HTTP error rate < 1%
- [ ] P95 response latency < 500ms
- [ ] P99 response latency < 1000ms
- [ ] Results saved to `load-tests/results.json`
- [ ] HTML report generated: `load-tests/report.html`
- [ ] `/verify` passes

---

## Implementation Steps
1. Ensure staging environment is running and healthy: `curl https://staging/api/health`
2. Run load test: `artillery run load-tests/load-test.yml --target https://staging.example.com -o load-tests/results.json`
3. Monitor logs for 5 minutes while test runs
4. Generate HTML report: `artillery report load-tests/results.json -o load-tests/report.html`
5. Run verification queries (see Code Templates)
6. Check performance metrics via `/api/health` and `/api/metrics`
7. Review results and document any failures
8. Run `/verify`

---

## Test Cases

```bash
# Test 1: Load test runs and completes
timeout 360 artillery run load-tests/load-test.yml \
  --target http://localhost:3000 \
  --output load-tests/results.json
# Expected: Exit code 0, results.json created

# Test 2: IP rate limit (3 signups per 24h)
# During load test, 4th signup from same IP should return 429
grep "429" load-tests/results.json | \
  grep "/api/auth/signup" | \
  wc -l
# Expected: > 0 (some requests hit rate limit)

# Test 3: Generation rate limit (30/min)
# Requests beyond 30/min from same user should return 429
grep "429" load-tests/results.json | \
  grep "/api/content/generate" | \
  head -5
# Expected: Some 429 responses for generation endpoint

# Test 4: Error rate < 1%
TOTAL=$(grep "statusCode" load-tests/results.json | wc -l)
ERRORS=$(grep "statusCode: [45]" load-tests/results.json | wc -l)
RATE=$((ERRORS * 100 / TOTAL))
echo "Error rate: ${RATE}%"
# Expected: RATE < 1

# Test 5: Performance metrics
artillery report load-tests/results.json --output load-tests/report.html
# Expected: HTML report generated with p95 < 500ms
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| Rate limits not triggered | Increase arrivalRate or duration in load test |
| Error rate > 1% | Check logs for issues; may indicate infrastructure problem |
| P95 latency > 500ms | Check database/Redis performance; may need optimization |
| DB pool exhaustion | Increase pool size or reduce concurrent connections |
| Redis timeout | Increase Redis timeout or optimize queries |

---

## Success Metrics

### Must-Pass
- ✅ IP signup limit: 3 per 24h
- ✅ User generation limit: 30/min
- ✅ Webhook rate limit: 100/min per IP
- ✅ Error rate: <1%
- ✅ No DB/Redis failures

### Nice-to-Have
- ✅ P95 latency <300ms (excellent performance)
- ✅ P99 latency <500ms (good performance)
- ✅ Redis latency <20ms (fast caching)

---

## Handoff to Next Task
_(fill via /task-handoff)_
