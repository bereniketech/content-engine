# Monitoring Dashboard & SLO Tracking

## Overview
This document defines the Grafana dashboard configuration, PromQL queries, and alert rules for monitoring Service Level Objectives across the Content Engine platform.

---

## Dashboard Structure

### Main Dashboard: "Content Engine SLOs"
- **Refresh Rate**: 30 seconds
- **Time Range**: Last 24 hours (variable for drill-down)
- **Rows**: 6 (one per SLO + system health)

---

## 1. API Availability Monitoring

### Dashboard Panel: "API Success Rate"

**PromQL Query**:
```promql
sum(rate(http_requests_total{status=~"2..|3.."}[5m]))
/
sum(rate(http_requests_total[5m])) * 100
```

**Display**:
- Gauge: Current rate with 99.9% line marked
- Graph: 24h historical trend
- Thresholds: Green (>99.9%), Yellow (>99%), Red (<99%)

### Dashboard Panel: "Error Rate by Endpoint"

**PromQL Query**:
```promql
sum(rate(http_requests_total{status="5.."}[5m])) by (endpoint)
/
sum(rate(http_requests_total[5m])) by (endpoint) * 100
```

**Display**:
- Table: Top 10 endpoints by error rate
- Columns: Endpoint, Error Rate %, Trend, Status

### Dashboard Panel: "Availability SLO Status"

**PromQL Query**:
```promql
(
  sum(increase(http_requests_total{status=~"2..|3.."}[1h]))
  /
  sum(increase(http_requests_total[1h])) * 100
)
```

**Display**:
- Stat: Current hour availability %
- Progress bar to 99.9% target
- Previous hour comparison

### Alert Rule: "API Availability SLO Violation"

```yaml
alert: APIAvailabilitySLOViolation
expr: |
  (sum(rate(http_requests_total{status=~"2..|3.."}[5m])) /
   sum(rate(http_requests_total[5m])) * 100) < 99
for: 5m
annotations:
  summary: "API Availability below SLO ({{ $value }}%)"
  description: "API availability dropped below 99% for 5 minutes"
severity: critical
```

### Alert Rule: "API Availability Warning"

```yaml
alert: APIAvailabilityWarning
expr: |
  (sum(rate(http_requests_total{status=~"2..|3.."}[5m])) /
   sum(rate(http_requests_total[5m])) * 100) < 99.5
for: 15m
annotations:
  summary: "API Availability approaching SLO"
  description: "API availability < 99.5% for 15 minutes"
severity: warning
```

---

## 2. API Latency Monitoring

### Dashboard Panel: "P99 Latency"

**PromQL Query**:
```promql
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
) * 1000
```

**Display**:
- Gauge: Current P99 in milliseconds with 1000ms line
- Graph: 24h historical trend with bands for P50, P95, P99, P99.9
- Thresholds: Green (<1000ms), Yellow (<1500ms), Red (>=2000ms)

### Dashboard Panel: "Latency by Endpoint"

**PromQL Query**:
```promql
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint)
) * 1000
```

**Display**:
- Table: Top 10 endpoints by P99 latency
- Columns: Endpoint, P99 (ms), P95 (ms), P50 (ms), Trend

### Dashboard Panel: "Latency Distribution"

**PromQL Query**:
```promql
rate(http_request_duration_seconds_bucket[5m])
```

**Display**:
- Heatmap: Request distribution across latency buckets
- Color intensity: Request volume at each latency percentile
- Time: 24h historical view

### Dashboard Panel: "Database Query Latency"

**PromQL Query**:
```promql
histogram_quantile(0.99,
  sum(rate(db_query_duration_seconds_bucket[5m])) by (le)
) * 1000
```

**Display**:
- Graph: Database latency trend (overlay on API latency)
- Shows correlation between DB and API performance

### Alert Rule: "P99 Latency SLO Violation"

```yaml
alert: P99LatencySLOViolation
expr: |
  histogram_quantile(0.99,
    sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
  ) > 1
for: 5m
annotations:
  summary: "P99 Latency above SLO ({{ $value }}s)"
  description: "P99 API latency exceeded 1 second for 5 minutes"
severity: critical
```

### Alert Rule: "P99 Latency Warning"

```yaml
alert: P99LatencyWarning
expr: |
  histogram_quantile(0.99,
    sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
  ) > 0.8
for: 15m
annotations:
  summary: "P99 Latency trending towards SLO violation"
  description: "P99 latency > 800ms for 15 minutes"
severity: warning
```

---

## 3. Error Rate Monitoring

### Dashboard Panel: "5xx Error Rate"

**PromQL Query**:
```promql
sum(rate(http_requests_total{status="5.."}[5m]))
/
sum(rate(http_requests_total{status!="429"}[5m])) * 100
```

**Display**:
- Gauge: Current rate with 1% line marked
- Graph: 24h trend with SLO band
- Thresholds: Green (<1%), Yellow (<0.5%), Red (>2%)

### Dashboard Panel: "Error Rate by Type"

**PromQL Query**:
```promql
sum(rate(http_requests_total{status="5.."}[5m])) by (status)
/
sum(rate(http_requests_total{status!="429"}[5m])) * 100
```

**Display**:
- Pie chart: Distribution of error types (500, 502, 503, 504, timeouts)
- Table: Error code counts and rates

### Dashboard Panel: "Application Exceptions"

**PromQL Query**:
```promql
sum(rate(app_exceptions_total[5m])) by (exception_type)
```

**Display**:
- Graph: Exception rate trend by type
- Critical exceptions highlighted
- Correlation with error rate increases

### Dashboard Panel: "Dependency Health"

**PromQL Query**:
```promql
(sum(rate(dependency_requests_total{status="2.."}[5m])) by (dependency) /
 sum(rate(dependency_requests_total[5m])) by (dependency) * 100)
```

**Display**:
- Status table: Database, Cache, External APIs
- Availability % for each dependency
- Last error timestamp

### Alert Rule: "Error Rate SLO Violation"

```yaml
alert: ErrorRateSLOViolation
expr: |
  (sum(rate(http_requests_total{status="5.."}[5m])) /
   sum(rate(http_requests_total{status!="429"}[5m])) * 100) > 1
for: 5m
annotations:
  summary: "Error rate above SLO ({{ $value }}%)"
  description: "5xx error rate exceeded 1% for 5 minutes"
severity: critical
```

---

## 4. CAPTCHA Gating Monitoring

### Dashboard Panel: "CAPTCHA Enforcement Rate"

**PromQL Query**:
```promql
sum(rate(captcha_challenges_sent_total[5m]))
/
sum(rate(signup_requests_total[5m])) * 100
```

**Display**:
- Gauge: Current enforcement % with 95% line
- Graph: 24h trend
- Thresholds: Green (>95%), Yellow (>90%), Red (<90%)

### Dashboard Panel: "CAPTCHA Verification Results"

**PromQL Query**:
```promql
sum(rate(captcha_verification_total[5m])) by (result)
```

**Display**:
- Stacked bar: Pass, Fail, Timeout, Error distributions
- Percentages for each outcome
- Trend over time

### Dashboard Panel: "CAPTCHA Performance"

**PromQL Query**:
```promql
histogram_quantile(0.99,
  sum(rate(captcha_verification_duration_seconds_bucket[5m])) by (le)
) * 1000
```

**Display**:
- Gauge: Verification latency
- Graph: P50, P95, P99 latencies
- Provider latency vs. our processing time

### Dashboard Panel: "False Positive/Negative Rate"

**PromQL Query**:
```promql
sum(rate(captcha_false_positives_total[1h])) /
sum(rate(captcha_verification_total[1h])) * 100
```

**Display**:
- Table: False positive %, False negative %
- Goal: FP < 2%, FN < 1%
- Trend comparison to previous week

### Alert Rule: "CAPTCHA Enforcement Below SLO"

```yaml
alert: CAPTCHAEnforcementSLOViolation
expr: |
  (sum(rate(captcha_challenges_sent_total[5m])) /
   sum(rate(signup_requests_total[5m])) * 100) < 95
for: 10m
annotations:
  summary: "CAPTCHA enforcement below SLO ({{ $value }}%)"
  description: "CAPTCHA enforcement < 95% for 10 minutes"
severity: critical
```

---

## 5. Credit System Monitoring

### Dashboard Panel: "Credit Ledger Accuracy"

**PromQL Query**:
```promql
sum(rate(credit_transactions_verified_total[5m]))
/
sum(rate(credit_transactions_total[5m])) * 100
```

**Display**:
- Gauge: Current accuracy % with 99.99% baseline
- Graph: Daily accuracy over 30 days
- Thresholds: Green (99.99%), Yellow (99.9%), Red (<99.9%)

### Dashboard Panel: "Credit Transaction Status"

**PromQL Query**:
```promql
sum(rate(credit_transactions_total[5m])) by (status)
```

**Display**:
- Stacked area: Success, Failed, Pending, Rolled Back
- Absolute counts and percentages
- Trend over time

### Dashboard Panel: "Reconciliation Results"

**PromQL Query**:
```promql
credit_balance_discrepancies_total
```

**Display**:
- Gauge: Detected discrepancies (target: 0)
- Table: Last 10 reconciliation runs with variance
- Timestamp of last successful audit

### Dashboard Panel: "Credit Operation Latency"

**PromQL Query**:
```promql
histogram_quantile(0.99,
  sum(rate(credit_operation_duration_seconds_bucket[5m])) by (le)
) * 1000
```

**Display**:
- Graph: Debit/Credit operation latencies
- P99 < 600ms target
- Operation type breakdown

### Alert Rule: "Credit Accuracy Issue Detected"

```yaml
alert: CreditSystemAccuracyIssue
expr: |
  credit_balance_discrepancies_total > 0
for: 1m
annotations:
  summary: "Credit ledger discrepancy detected ({{ $value }} errors)"
  description: "Reconciliation found ledger inconsistencies - immediate investigation required"
severity: critical
```

### Alert Rule: "Credit Transaction Failure Rate Elevated"

```yaml
alert: CreditTransactionFailureRate
expr: |
  (sum(rate(credit_transactions_failed_total[5m])) /
   sum(rate(credit_transactions_total[5m])) * 100) > 0.1
for: 5m
annotations:
  summary: "Credit transaction failures elevated ({{ $value }}%)"
  description: "Transaction failure rate exceeded 0.1%"
severity: warning
```

---

## 6. Signup Anti-Abuse Monitoring

### Dashboard Panel: "Abuse Detection Rate"

**PromQL Query**:
```promql
sum(rate(abuse_attempts_detected_total[5m]))
/
sum(rate(signup_attempts_total[5m])) * 100
```

**Display**:
- Gauge: Current detection % with 99% line
- Graph: 24h trend
- Thresholds: Green (>99%), Yellow (>97%), Red (<95%)

### Dashboard Panel: "Abuse Signals by Type"

**PromQL Query**:
```promql
sum(rate(abuse_signals_triggered_total[5m])) by (signal_type)
```

**Display**:
- Bar chart: IP reputation, Email validation, Behavioral, Device fingerprint, CAPTCHA, Rate limit
- Percentage contribution to total blocks
- Trend over 7 days

### Dashboard Panel: "False Positive/Negative Analysis"

**PromQL Query**:
```promql
{
  false_positives: sum(rate(abuse_false_positives_total[1h])) / sum(rate(abuse_attempts_total[1h])) * 100,
  false_negatives: sum(rate(abuse_false_negatives_total[1h])) / sum(rate(abuse_attempts_total[1h])) * 100
}
```

**Display**:
- Dual gauge: FP rate (target <0.5%), FN rate (target <1%)
- Historical trend (7 days)
- Model performance degradation alerts

### Dashboard Panel: "Attack Pattern Recognition"

**PromQL Query**:
```promql
sum(rate(suspicious_ip_attempts_total[5m]))
and
(sum(rate(suspicious_ip_attempts_total[5m])) > 100)
```

**Display**:
- Map visualization: Geographic distribution of blocked IPs
- Table: Top 20 attacking IPs with attempt count
- ASN/ISP information

### Dashboard Panel: "ML Model Health"

**PromQL Query**:
```promql
abuse_detection_model_accuracy
```

**Display**:
- Gauge: Current model accuracy
- Last training/update timestamp
- Prediction latency (P99)
- Drift detection alert

### Alert Rule: "Abuse Detection Rate Below SLO"

```yaml
alert: AbuseDetectionSLOViolation
expr: |
  (sum(rate(abuse_attempts_detected_total[5m])) /
   sum(rate(signup_attempts_total[5m])) * 100) < 99
for: 10m
annotations:
  summary: "Abuse detection rate below SLO ({{ $value }}%)"
  description: "Detection rate < 99% for 10 minutes - possible model degradation"
severity: critical
```

### Alert Rule: "High False Positive Rate"

```yaml
alert: HighFalsePositiveRate
expr: |
  (sum(rate(abuse_false_positives_total[1h])) /
   sum(rate(abuse_attempts_total[1h])) * 100) > 1
for: 15m
annotations:
  summary: "Abuse detection false positive rate elevated ({{ $value }}%)"
  description: "FP rate exceeded 1% threshold - may require model retraining"
severity: warning
```

---

## System Health Dashboard

### Overview Panel: "SLO Status Summary"

**Display**:
- 6 status cards (one per SLO)
- Color: Green (met), Yellow (warning), Red (violated)
- Current value vs. target
- Error budget remaining %

### Panel: "Error Budget Consumption"

**PromQL Queries**:
```promql
# API Availability Error Budget
100 - (sum(rate(http_requests_total{status=~"2..|3.."}[1h])) /
        sum(rate(http_requests_total[1h])) * 100)

# API Latency Error Budget  
100 - (sum(rate(http_request_duration_seconds_bucket{le="1"}[1h])) /
        sum(rate(http_request_duration_seconds_bucket{le="+Inf"}[1h])) * 100)

# Error Rate Error Budget
sum(rate(http_requests_total{status="5.."}[1h])) /
sum(rate(http_requests_total{status!="429"}[1h])) * 100
```

**Display**:
- 6 progress bars: Monthly error budget consumption
- Color: Green (0-50%), Yellow (50-80%), Red (80-100%)
- Days remaining at current burn rate

### Panel: "Incident Timeline"

**Display**:
- List: Recent incidents with duration, impact, resolution status
- Annotations on relevant metric graphs
- Root cause tags

---

## Weekly SLO Review Process

### Automated Report Generation
**Time**: Every Monday 9:00 AM UTC  
**Report Contents**:

1. **SLO Achievement Summary**
   ```
   API Availability:    99.92% (PASS, used 0.08% budget)
   API Latency P99:     847ms   (PASS, under 1000ms)
   Error Rate:          0.67%   (PASS, under 1%)
   CAPTCHA Enforcement: 96.2%   (PASS, over 95%)
   Credit Accuracy:     100%    (PASS, no discrepancies)
   Abuse Detection:     99.3%   (PASS, over 99%)
   ```

2. **Error Budget Status**
   ```
   Period: April 21-27, 2026
   API Availability Budget: 42.3 min/month remaining (98.1% consumed)
   Error Rate Budget: 12 errors remaining in period
   ```

3. **Incident Summary**
   - Number of incidents: 2
   - Total downtime: 4 minutes
   - MTTR (Mean Time To Resolution): 6 minutes
   - Root causes identified

4. **Trend Analysis**
   - Week-over-week comparison
   - Latency trends (improving/degrading)
   - Error rate patterns
   - Abuse attempt volume trends

5. **Action Items**
   - SLO at risk (yellow alerts)
   - Threshold adjustment recommendations
   - Infrastructure scaling needs

### Monthly SLO Review Meeting
**Time**: First Monday of month, 2:00 PM UTC  
**Duration**: 60 minutes  
**Attendees**: Engineering Lead, DevOps, Product Lead

**Agenda**:
1. Discuss critical incidents from month
2. Review error budget consumption
3. Identify root causes requiring fixes
4. Prioritize SLO improvements
5. Adjust targets based on infrastructure changes
6. Next month's focus areas

**Outputs**:
- Updated SLO status document
- Prioritized remediation work
- Infrastructure investment decisions

---

## Dashboard Access & Permissions

### Grafana Setup
- **URL**: https://grafana.content-engine.local
- **Default Refresh**: 30 seconds (adjustable: 5s, 15s, 30s, 1m, 5m)
- **Time Range Shortcuts**: Last 1h, 6h, 24h, 7d, 30d

### User Roles
- **Viewer**: View-only access to dashboards
- **Editor**: Can modify dashboards, manage alerts
- **Admin**: Full access, manage data sources, users

### Alert Routing
- **Critical Alerts**: Page on-call engineer via PagerDuty
- **Warning Alerts**: Slack #alerts channel
- **Info Events**: Email to team@content-engine.io

---

## PromQL Tips & Maintenance

### Common Query Patterns

**Calculate percentage**:
```promql
(numerator / denominator) * 100
```

**Get rate with 5-minute window**:
```promql
rate(metric_total[5m])
```

**Get percentile (P99)**:
```promql
histogram_quantile(0.99, metric_bucket)
```

**Filter by label**:
```promql
metric{status="5..", endpoint="/api/signup"}
```

**Sum across dimensions**:
```promql
sum(metric) by (label1, label2)
```

### Dashboard Maintenance Schedule
- **Daily**: Verify alert rules firing correctly
- **Weekly**: Review error budget consumption
- **Monthly**: Assess SLO targets for accuracy
- **Quarterly**: Major dashboard updates, threshold adjustments

