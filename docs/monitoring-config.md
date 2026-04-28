# Production Monitoring Configuration

**Date:** 2026-04-28  
**Stability Phase:** 3 (Production Readiness)  
**Target Stability:** 9.5/10 with active monitoring

---

## Error Tracking: Sentry Configuration

### Setup (Already Configured)

Sentry is already integrated via `instrumentation.ts`:

```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs')
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV ?? 'production',
      enabled: Boolean(process.env.SENTRY_DSN),
    })
  }
}
```

### Environment Variables Required

```bash
# Sentry configuration
SENTRY_DSN=https://[examplePublicKey]@o[organizationId].ingest.sentry.io/[projectId]
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions sampled for performance monitoring
SENTRY_PROFILES_SAMPLE_RATE=0.1  # 10% of transactions profiled
```

### Sentry Dashboard Setup

**Log in to:** https://sentry.io

**Organization:** Content Engine

**Project:** Production

**Key Configuration:**
- Performance Monitoring: ENABLED (10% sampling)
- Error Tracking: ENABLED (100% sampling)
- Session Replay: ENABLED (1% sampling, for debugging UI issues)
- Release Tracking: ENABLED

### Event Capture Configuration

```javascript
// lib/error-tracking.ts (to be created in api routes)
import * as Sentry from "@sentry/nextjs";

// Automatic captures:
// - All unhandled exceptions
// - All rejected promises
// - API 5xx errors
// - Route timeouts

// Manual captures:
Sentry.captureException(error);
Sentry.captureMessage("Custom message", "warning");
Sentry.captureEvent({
  message: "Custom event",
  level: "info",
  tags: { operation: "generate", tier: "pro" },
  extra: { cost_credits: 50, duration_ms: 2341 },
});
```

### Required Tags for All Events

All Sentry events must include:

```javascript
Sentry.setTag("service", "content-engine");
Sentry.setTag("environment", "production");
Sentry.setTag("version", "1.0.0");

// Per request:
Sentry.setTag("user_id", userId);
Sentry.setTag("request_id", requestId);
Sentry.setTag("tier", userTier);  // free, pro, enterprise
Sentry.setTag("operation", operationType);  // generate, publish, etc.
```

### Alert Rules in Sentry

**Alert Rule 1: New Error Spike**
- Condition: Error count increases by 100% in 5 minutes
- Action: Send notification to #production-alerts Slack channel

**Alert Rule 2: High Error Rate**
- Condition: Error rate > 5% in any 5-minute window
- Action: Page on-call engineer via PagerDuty

**Alert Rule 3: Specific Error Type Critical**
- Condition: Any error tagged with severity=critical appears
- Action: Immediate page on-call engineer

---

## Performance Metrics & Monitoring

### Metrics to Monitor (Priority Order)

#### 1. API Latency (Hot Path - Highest Priority)

**Metric:** HTTP request duration

| Percentile | Threshold | Alert Level |
|------------|-----------|------------|
| P50 (median) | < 200ms | Normal |
| P95 | < 500ms | Alert if > 1s |
| P99 | < 1000ms | Critical if > 2s |

**Collection Method:**
```javascript
// Middleware captures latency for all routes
// export at: metrics/api_latency_ms

// Prometheus query:
histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))
histogram_quantile(0.99, rate(http_request_duration_ms_bucket[5m]))
```

**Breakdown by Route:**
- `POST /api/content/generate` - target: p95 < 2s (generation is slow by design)
- `GET /api/content/list` - target: p95 < 200ms
- `POST /api/webhooks/razorpay` - target: p95 < 100ms
- `POST /api/publish/*` - target: p95 < 500ms

#### 2. Error Rate (4xx, 5xx - Critical)

**Metric:** Error response count / total requests

| Status Code | Rate Threshold | Alert Level |
|------------|---------------|------------|
| 4xx (Client Errors) | < 2% | Alert if > 5% |
| 5xx (Server Errors) | < 1% | **Alert if > 1%** |
| Specific: 429 (Rate Limited) | < 0.5% | Alert if > 1% |

**Collection Method:**
```javascript
// Prometheus queries:
// 5xx error rate
rate(http_requests_total{status=~"5[0-9]{2}"}[5m]) / rate(http_requests_total[5m])

// 4xx error rate
rate(http_requests_total{status=~"4[0-9]{2}"}[5m]) / rate(http_requests_total[5m])

// 429 rate limit responses
rate(http_requests_total{status="429"}[5m])
```

**Alert Configuration:**
```yaml
- alert: HighServerErrorRate
  expr: (rate(http_requests_total{status=~"5[0-9]{2}"}[5m]) / rate(http_requests_total[5m])) > 0.01
  for: 2m
  annotations:
    summary: "Server error rate > 1% ({{ $value | humanizePercentage }})"
    severity: critical
```

#### 3. Rate Limit Hits (429 Responses - Fraud Prevention)

**Metric:** Count of 429 responses per minute

| Rate | Threshold | Alert Level |
|------|-----------|------------|
| Normal | < 10/min | OK |
| Elevated | 10-100/min | Monitor |
| Abuse | > 100/min | Alert |
| Extreme Abuse | > 1000/min | **Critical - Page on-call** |

**Collection Method:**
```javascript
// Prometheus:
rate(http_requests_total{status="429"}[1m])

// Upstash Redis:
redis-cli KEYS "rate_limit:*" | wc -l
redis-cli GET "rate_limit:abuse_detected"
```

**Alert Configuration:**
```yaml
- alert: RateLimitAbuse
  expr: rate(http_requests_total{status="429"}[1m]) > 1000  # 1000+ 429s per minute
  for: 1m
  annotations:
    summary: "Rate limit abuse detected ({{ $value }}/min requests)"
    severity: critical
    action: "Check IP logs, enable CAPTCHA for suspicious IPs"
```

#### 4. CAPTCHA Verification Rate

**Metric:** CAPTCHA success rate

| Rate | Status | Action |
|------|--------|--------|
| > 90% | Normal | Monitor |
| 70-90% | Degraded | Investigate CAPTCHA provider |
| < 70% | Critical | Alert on-call, check Google Recaptcha status |

**Collection Method:**
```javascript
// Track in API route:
// POST /api/auth/verify-captcha

const captchaMetrics = {
  successes: 0,
  failures: 0,
  timeouts: 0,
};

// Export metrics:
captcha_verifications_total{status="success"}
captcha_verifications_total{status="failure"}
captcha_verifications_total{status="timeout"}
captcha_verification_latency_ms
```

**Alert Configuration:**
```yaml
- alert: LowCaptchaSuccessRate
  expr: (rate(captcha_verifications_total{status="success"}[5m]) / 
         rate(captcha_verifications_total[5m])) < 0.7
  for: 5m
  annotations:
    summary: "CAPTCHA success rate < 70%"
    severity: warning
    action: "Check Google Recaptcha service status, verify API keys"
```

#### 5. Credit Deduction Success/Failure Rate

**Metric:** Wallet credit transaction outcomes

| Outcome | Rate | Alert Level |
|---------|------|------------|
| Successful | > 99% | Normal |
| Failed (Insufficient Credits) | 1-5% | Monitor (expected behavior) |
| Failed (Database Error) | < 0.1% | **Alert if > 0.5%** |
| Pending (Retry Needed) | < 0.1% | Monitor |

**Collection Method:**
```javascript
// Track in routes that deduct credits:
// POST /api/content/generate
// POST /api/webhooks/razorpay (refund)

const creditMetrics = {
  deductions_success: 0,
  deductions_insufficient: 0,
  deductions_failed: 0,
  deductions_amount_total: 0,
};

// Export metrics:
wallet_deductions_total{status="success"}
wallet_deductions_total{status="insufficient_credits"}
wallet_deductions_total{status="failure"}
wallet_deductions_total{status="pending"}
wallet_credits_deducted_total
wallet_refunds_processed_total{status="success"|"failure"}
```

**Alert Configuration:**
```yaml
- alert: CreditDeductionFailures
  expr: (rate(wallet_deductions_total{status="failure"}[5m]) / 
         rate(wallet_deductions_total[5m])) > 0.005
  for: 2m
  annotations:
    summary: "Credit deduction failure rate > 0.5%"
    severity: critical
    action: "Check database connection, verify wallet logic"

- alert: RefundFailures
  expr: rate(wallet_refunds_processed_total{status="failure"}[5m]) > 0
  for: 1m
  annotations:
    summary: "Refund failure detected ({{ $value }} events/min)"
    severity: critical
    action: "Immediate investigation required, customer impact"
```

#### 6. Webhook Processing Latency

**Metric:** Webhook handler execution time

| Endpoint | P95 Threshold | P99 Threshold | Alert Level |
|----------|--------------|--------------|------------|
| Razorpay | < 500ms | < 1s | Critical if > 2s |
| GitHub | < 100ms | < 200ms | Alert if > 500ms |
| Sentry | < 100ms | < 200ms | Alert if > 500ms |

**Collection Method:**
```javascript
// Middleware for /api/webhooks/* routes:
webhook_processing_duration_ms{provider="razorpay|github|sentry"}
webhook_processing_errors_total{provider, error_type}
webhook_delivery_lag_seconds  // Time from event creation to our receipt
```

**Alert Configuration:**
```yaml
- alert: WebhookProcessingLatency
  expr: histogram_quantile(0.99, webhook_processing_duration_ms{provider="razorpay"}) > 1000
  for: 5m
  annotations:
    summary: "Razorpay webhook P99 latency > 1s"
    severity: warning
    action: "Check database write performance, verify idempotency cache"

- alert: WebhookProcessingFailures
  expr: rate(webhook_processing_errors_total[5m]) > 0.01
  for: 2m
  annotations:
    summary: "Webhook processing failures > 1% ({{ $value | humanizePercentage }})"
    severity: critical
    action: "Check database, auth, and external service connectivity"
```

---

## Alert Thresholds & Escalation

### Alert Severity Levels

| Level | Meaning | Response Time | Escalation |
|-------|---------|---------------|-----------|
| **Info** | Informational only | None | None |
| **Warning** | Monitor closely, may require action | 1 hour | Slack #production-alerts |
| **Alert** | Action required within 15 min | 15 minutes | Slack #oncall + page on-call |
| **Critical** | Immediate action required | < 5 minutes | **Page on-call immediately** + incident channel |

### Critical Alert Thresholds (Page On-Call)

```yaml
Critical Alerts:
  1. Server Error Rate > 1% for > 2 minutes
     → Immediate investigation of 5xx errors
     
  2. P99 Latency > 2 seconds for > 5 minutes
     → Check database slow queries, API provider status
     
  3. Rate Limit Abuse (> 1000 429s/min) for > 1 minute
     → Enable CAPTCHA for offending IPs, block if necessary
     
  4. Credit Deduction Failures > 0.5% for > 2 minutes
     → Customer revenue impact, immediate fix needed
     
  5. Refund Processing Failures (any occurrence)
     → Customer refund stuck, must be resolved manually
     
  6. Database Connection Pool > 80% utilized
     → Risk of connection exhaustion, potential cascade failure
     
  7. CAPTCHA Success Rate < 70%
     → Sign-up flow broken, check Google Recaptcha service
     
  8. Sentry Error Spike (100%+ increase in 5 min)
     → New bug introduced, possible bad deployment
```

### Warning Alert Thresholds (Slack Notification)

```yaml
Warning Alerts:
  1. P95 Latency > 500ms for > 5 minutes
     → Investigate performance issue, may be normal load
     
  2. Error Rate (4xx + 5xx) > 3% for > 5 minutes
     → Monitor for patterns, may be user error
     
  3. Redis Latency > 50ms for > 2 minutes
     → Check Upstash Redis load, may need scaling
     
  4. Database Query > 1 second (slow query log)
     → Query optimization opportunity
     
  5. Webhook Latency > 500ms for > 5 minutes
     → Check external service status, may be degradation
     
  6. Memory Usage > 80% on server
     → Monitor for memory leak, may need restart
```

### Escalation Procedure

**1. Alert Fires (Automated)**
   - Sentry captures event with high severity
   - PagerDuty sends push notification to on-call engineer
   - Slack #production-alerts channel receives notification

**2. Acknowledgement (< 5 minutes)**
   - On-call engineer acknowledges in PagerDuty
   - Updates Slack with initial investigation status

**3. Investigation (< 15 minutes)**
   - Pull logs from Sentry/Datadog
   - Check database slow query log
   - Review recent deployments
   - Test critical endpoints manually

**4. Escalation (If unresolved > 15 minutes)**
   - Page backup on-call engineer (secondary)
   - Contact CTO for high-level decisions
   - Create incident channel: #incident-YYYYMMDD-HHmm
   - Begin incident timeline documentation

**5. Resolution & Postmortem**
   - Document root cause
   - Create action items
   - Schedule postmortem (within 24 hours for critical)

---

## Monitoring Dashboard (Grafana/Datadog)

### Key Panels to Display

**1. Request Rate & Latency (Top Left)**
- Line chart: requests/sec (all endpoints)
- Line chart: P95, P99 latency trend
- Update: 30-second intervals

**2. Error Rate & 5xx Count (Top Right)**
- Line chart: % error rate (4xx vs 5xx)
- Gauge: Current 5xx count per minute
- Update: 30-second intervals
- Alert threshold: 1% for 5xx

**3. Rate Limiting Activity (Middle Left)**
- Bar chart: 429 responses by IP
- Table: Top IP addresses hitting rate limit
- Update: 1-minute intervals
- Alert threshold: 1000/min

**4. Credit Deductions (Middle Right)**
- Gauge: Success rate (should be 99%+)
- Line chart: Daily total credits deducted
- Table: Recent failed deductions with reasons
- Update: 5-minute intervals

**5. Webhook Health (Bottom Left)**
- Table: Razorpay webhook latency P50/P95/P99
- Count: Failed webhook deliveries
- Update: 1-minute intervals

**6. System Health (Bottom Right)**
- Gauge: Database connection pool utilization
- Gauge: Redis memory usage
- Gauge: Application uptime %
- Update: 30-second intervals

---

## Metrics Collection (Prometheus)

### Instrumentation Points

All metrics exported to Prometheus with 30-second scrape interval:

```yaml
# HTTP Requests
http_requests_total{method, endpoint, status}
http_request_duration_ms{method, endpoint, le}  # histogram
http_request_size_bytes{method, endpoint}
http_response_size_bytes{method, endpoint}

# Errors
errors_total{type, severity}  # CRITICAL, WARNING, INFO
sentry_events_captured_total{severity}

# Content Generation
content_generation_duration_ms{tier, input_type, status}
content_generation_tokens_used{tier, provider}
content_generation_cost_credits{tier}

# Wallet/Credits
wallet_deductions_total{status}
wallet_refunds_processed_total{status}
wallet_credits_remaining{tier}

# Rate Limiting
rate_limit_events_total{ip, endpoint}
rate_limit_blocked_count{ip}

# CAPTCHA
captcha_verifications_total{status}
captcha_verification_latency_ms

# Webhooks
webhook_deliveries_total{provider, status}
webhook_processing_duration_ms{provider}

# Database
db_connection_pool_active
db_connection_pool_max
db_query_duration_ms{query_name}
db_rows_affected{operation}

# Redis
redis_command_duration_ms{command}
redis_memory_usage_bytes
redis_keyspace_hits_total
redis_keyspace_misses_total

# System
process_memory_bytes
process_cpu_percentage
server_uptime_seconds
```

---

## Health Check Endpoints

### Implement Health Check Routes

```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    components: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      ai_provider: await checkAIProvider(),
    },
  });
}

// app/api/health/db/route.ts
async function checkDatabase() {
  try {
    const { data } = await supabase
      .from("subscriptions")
      .select("count")
      .limit(1);
    return { status: "healthy", latency_ms: 25 };
  } catch (e) {
    return { status: "unhealthy", error: e.message };
  }
}

// app/api/health/redis/route.ts
async function checkRedis() {
  try {
    const start = Date.now();
    await redis.ping();
    const latency = Date.now() - start;
    return { status: "healthy", latency_ms: latency };
  } catch (e) {
    return { status: "unhealthy", error: e.message };
  }
}
```

---

## Monitoring Setup Checklist

- [ ] Sentry project created and DSN configured
- [ ] SENTRY_DSN environment variable set in production
- [ ] Prometheus scrape config targets content-engine application
- [ ] Grafana datasource connected to Prometheus
- [ ] Dashboard JSON imported and configured
- [ ] PagerDuty integration with alert rules configured
- [ ] Slack webhook configured for #production-alerts channel
- [ ] Health check endpoints implemented and tested
- [ ] All critical alerts configured and armed
- [ ] On-call rotation configured in PagerDuty
- [ ] Incident response runbook shared with team
- [ ] First-responder training completed

---

## Monitoring Success Criteria

✅ All metrics collecting data successfully
✅ Dashboard displays live production metrics
✅ Alert rules armed and tested
✅ No false positives in alerts
✅ On-call engineer can respond to alerts within SLA
✅ Root cause identifiable from dashboard within 5 minutes
✅ Critical issues paged within 1 minute of threshold breach
