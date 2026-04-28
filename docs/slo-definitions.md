# Service Level Objectives (SLOs)

## Overview
This document defines the Service Level Objectives for critical systems in the Content Engine platform. SLOs represent the target level of service quality we commit to maintain, with associated error budgets for risk management.

## SLO Framework

### Error Budget Calculation
Error Budget = 100% - SLO Target
- Determines how much downtime/errors are acceptable in a period
- Guides remediation decisions and investment priorities

---

## 1. API Availability SLO

### Target
**99.9% uptime** (monthly: 43.2 minutes downtime allowed)

### Definition
- Percentage of successful HTTP responses (200-299, 3xx redirects)
- Excludes client errors (4xx) when valid request format
- Includes: authentication, authorization, rate limiting responses

### Error Budget
- Monthly: 43.2 minutes
- Weekly: 10.08 minutes
- Daily: 1.44 minutes

### Measured By
- HTTP request success rate
- Endpoint availability across all regions
- Response code distribution (5xx count)

### Calculation
```
API Availability % = (Successful Requests / Total Requests) * 100
where Successful = (2xx + 3xx responses)
```

### Thresholds
- Critical: < 99% (use error budget)
- Warning: < 99.5%
- Healthy: >= 99.9%

---

## 2. API Latency SLO

### Target
**P99 Latency < 1 second** (99th percentile)

### Definition
- End-to-end response time from request receipt to response transmission
- Measured at the API gateway level
- Includes: database queries, external API calls, processing logic

### Error Budget
- If 1% of requests exceed 1 second SLO is violated
- Monthly acceptable: ~27 minutes of high-latency requests
- Weekly acceptable: ~6.3 minutes of high-latency requests

### Measured By
- Request duration histograms (percentiles: P50, P95, P99, P99.9)
- Endpoint-specific latency baselines
- Geographically distributed measurements

### Calculation
```
Latency SLO Status = (Requests with response_time <= 1000ms / Total Requests) * 100
Target: >= 99%
```

### Thresholds
- Critical: P99 > 2 seconds
- Warning: P99 > 1.5 seconds
- Healthy: P99 < 1 second

### Service-Specific Targets
- Authentication endpoint: P99 < 500ms
- Content retrieval: P99 < 800ms
- Credit operations: P99 < 600ms
- Search/filter: P99 < 1.5 seconds

---

## 3. Error Rate SLO

### Target
**< 1% error rate** (excluding rate limit errors)

### Definition
- Percentage of requests resulting in server errors (5xx)
- Excludes: 429 rate limit responses, 400-499 client errors
- Includes: 500, 502, 503, 504, timeouts

### Error Budget
- Monthly: ~43.2 minutes of errors (4,320 errors if 100k req/min baseline)
- Weekly: ~10.08 minutes
- Tracks cumulative error count against baseline traffic

### Measured By
- 5xx error rate per endpoint
- Exception/panic counts in application
- Dependency failure rates (database, cache, external APIs)

### Calculation
```
Error Rate % = (5xx Responses / (Total Requests - Rate Limited Requests)) * 100
Target: < 1%
```

### Thresholds
- Critical: > 2% (immediate page)
- Warning: > 0.5%
- Healthy: < 1%

### Excluded from SLO
- 429 Too Many Requests (rate limiting)
- 400-404 Client errors
- 401 Unauthorized (invalid credentials)
- 403 Forbidden (insufficient permissions)

---

## 4. CAPTCHA Gating SLO

### Target
**> 95% enforcement rate** (valid CAPTCHA checks executed)

### Definition
- Percentage of signup/sensitive operations properly protected by CAPTCHA
- CAPTCHA validation called and verified before operation completion
- False positives/negatives tracked separately

### Error Budget
- Allows < 5% of operations to bypass CAPTCHA checks
- Monthly acceptable: ~2.16 minutes of unprotected operations
- Weekly acceptable: ~0.5 minutes unprotected

### Measured By
- CAPTCHA middleware trigger rate on signup endpoints
- Verification success/failure distribution
- Failed verification attempt counts
- Bypass detection rate

### Calculation
```
CAPTCHA Enforcement % = (Protected Operations / Total Operations) * 100
Target: >= 95%
```

### Thresholds
- Critical: < 90% enforcement
- Warning: < 93% enforcement
- Healthy: >= 95% enforcement

### False Positive/Negative Tracking
- Legitimate users challenged (false positive) - target < 2%
- Invalid users passed (false negative) - target < 1%

---

## 5. Credit System SLO

### Target
**> 99.99% accuracy** (0.01% error tolerance)

### Definition
- Transaction ledger accuracy and consistency
- Credit balance calculations reflect all operations
- No lost or duplicated credits
- Atomicity of debit/credit operations

### Error Budget
- Allows 1 error per 10,000 transactions
- Monthly acceptable errors: ~0.43 errors (practically: zero)
- Quarterly acceptable errors: ~1.3 errors

### Measured By
- Failed transaction counts
- Balance reconciliation audit results
- Credit ledger consistency checks
- Double-entry bookkeeping validation

### Calculation
```
Credit Accuracy % = (Correct Transactions / Total Transactions) * 100
where Correct = verified_balance == calculated_balance
Target: >= 99.99%
```

### Thresholds
- Critical: Any detected accuracy issue (immediate investigation)
- Warning: Any reconciliation variance
- Healthy: Perfect audit results

### Validation Method
- Daily ledger reconciliation at 2 AM UTC
- Weekly balance verification for random user samples (0.1%)
- Monthly full audit of all transactions
- Automatic rollback for failed operations

---

## 6. Signup Anti-Abuse SLO

### Target
**> 99% detection rate** (minimum security coverage)

### Definition
- Percentage of abusive signup attempts identified and blocked
- Covers: bot signups, credential stuffing, account takeover, automated attacks
- Measured against ground-truth labels from manual review

### Error Budget
- Allows < 1% of abuse to pass undetected
- Monthly acceptable false negatives: ~4.32 hours of undetected abuse
- Weekly acceptable: ~1.03 hours undetected

### Measured By
- Abuse detection rules trigger rate
- Machine learning model accuracy metrics
- False negative rate (abuse that passed)
- False positive rate (legitimate users blocked)

### Calculation
```
Detection Rate % = (Detected Abuse / Total Abuse Attempts) * 100
Target: >= 99%

False Negative Rate % = (Undetected Abuse / Total Abuse) * 100
Target: <= 1%

False Positive Rate % = (Incorrectly Blocked / Legitimate Attempts) * 100
Target: <= 0.5%
```

### Thresholds
- Critical: Detection rate < 95%
- Warning: Detection rate < 97%
- Healthy: Detection rate >= 99%

### Detection Methods Tracked
- IP reputation scoring
- Email domain validation
- Behavioral pattern analysis
- Device fingerprinting
- CAPTCHA challenge results
- Rate limiting violations

---

## SLO Review & Escalation

### Monthly SLO Review
- Compare actual metrics to targets
- Calculate error budget consumption
- Identify root causes of violations
- Recommend remediation actions

### Escalation Rules
| SLO | Status | Action |
|-----|--------|--------|
| Any | Critical | Page on-call engineer immediately |
| Any | Warning (sustained > 1 hour) | Create incident ticket, notify team lead |
| Any | Trending towards violation | Planning meeting, root cause analysis |

### Quarterly SLO Adjustment
- Review achievability vs. targets
- Adjust based on infrastructure improvements
- Document baseline changes
- Update monitoring thresholds

---

## Dependencies & Context

### Related Metrics
- Customer-facing latency (may differ from API latency)
- CDN cache hit rates
- Database query latencies
- External API availability
- Data replication lag

### System Constraints
- Single database instance (vertical scaling limit)
- Rate limiting at 10k req/min per user
- CAPTCHA provider uptime dependencies
- Credit system consistency requirements

### Trade-offs
- Stricter SLOs require more infrastructure cost
- Error budgets enable controlled rollouts
- Detection rate vs. false positive balance
- Real-time vs. eventual consistency

