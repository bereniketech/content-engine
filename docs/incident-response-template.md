# Incident Response Template & Procedures

## Overview
This document defines incident severity levels, escalation procedures, communication templates, and investigation checklists for the Content Engine platform.

---

## Part 1: Incident Severity Levels

### Severity 1 (Critical) - Immediate Page

**Duration**: Continuous on-call engineer paging  
**Scope**: Affects >10% of users or critical systems down  
**Error Budget Impact**: Significant burn

**Characteristics**:
- Complete service outage (API availability < 95%)
- Major data integrity issue (credit system errors, data loss)
- Security breach or authentication failure affecting users
- All signup blocked or abuse detection offline
- Database corruption or data replication failure

**Response Time Target**: 5 minutes  
**SLO Impact**: Yes - counts against availability SLO

**Examples**:
```
✓ API returning 503 for all endpoints
✓ Credit transactions failing with no rollback
✓ Signup completely blocked by error
✓ Security: Unauthorized access detected
✓ Database replication lag > 1 hour
```

**Escalation**: Page on-call engineer immediately → Page Engineering Manager (if not resolved in 15 min) → Page CTO (if not resolved in 30 min)

---

### Severity 2 (High) - Urgent Response

**Duration**: Alert team within 15 minutes  
**Scope**: Affects 1-10% of users or degrades major feature  
**Error Budget Impact**: Noticeable burn

**Characteristics**:
- Degraded service (API availability 95-99%)
- Elevated error rate (0.5-1%)
- Elevated latency (P99 800ms-1s)
- Partial feature failure (some endpoints returning errors)
- CAPTCHA bypass or detection failures
- Abuse spam wave not fully contained

**Response Time Target**: 15 minutes  
**SLO Impact**: May approach threshold

**Examples**:
```
✓ Authentication endpoint returning 500 for 5% of requests
✓ Database slow query making P99 = 1.2 seconds
✓ CAPTCHA provider timeout causing signup delays
✓ Credit debit operations failing for 1% of users
✓ Coordinated bot attack detected (>1000 attempts/hour)
```

**Escalation**: Create incident ticket → Notify on-call engineer in Slack → Page if no response in 10 min

---

### Severity 3 (Medium) - Standard Response

**Duration**: Alert team within 1 hour  
**Scope**: Affects <1% of users or non-critical systems  
**Error Budget Impact**: Minor

**Characteristics**:
- Slightly elevated error rate (<0.5%)
- Slightly elevated latency (P99 > 1s but < 1.5s)
- Single endpoint failing intermittently
- Non-critical feature degraded
- Monitoring alert triggered (false positive check)
- External dependency intermittent (rare 5xx responses)

**Response Time Target**: 1 hour  
**SLO Impact**: No

**Examples**:
```
✓ Search endpoint returning 503 for 0.1% of requests
✓ Non-critical analytics endpoint occasionally slow
✓ Dashboard loading delayed by 2 seconds
✓ Email service returning rare timeouts
✓ Cache miss rate elevated (non-critical data)
```

**Escalation**: Create ticket → Comment in team Slack → No page required

---

### Severity 4 (Low) - Future Planning

**Duration**: Track for next sprint  
**Scope**: No user impact or minimal user impact  
**Error Budget Impact**: None

**Characteristics**:
- Monitoring false alarm
- Test/staging system issue
- Non-critical infrastructure warning
- Upcoming capacity concern
- Technical debt accumulating
- Documentation or runbook needed

**Response Time Target**: Next business day  
**SLO Impact**: No

**Examples**:
```
✓ Staging environment disk warning
✓ Log storage exceeding threshold
✓ Test database needs maintenance
✓ Documentation needs updates
✓ Monitoring threshold may need adjustment
```

**Escalation**: Create low-priority ticket → Discuss in planning meeting

---

## Part 2: Escalation Procedures

### Initial Response (First 5 Minutes)

**For Severity 1**:
1. Page on-call engineer via PagerDuty (automatic from alert)
2. Page Engineering Manager (manual, after 1 minute)
3. Open incident channel #incident-sev1-<timestamp> on Slack
4. Post: "Severity 1 incident detected - [brief description]"
5. Start typing action items in thread as they emerge

**For Severity 2**:
1. Create ticket in incident system (auto-created from alert)
2. Post in #alerts-team-eng: "SEV2: [description] - [dashboard link]"
3. Don't page yet - allow 10 min response time
4. If no acknowledgment after 10 min → Page on-call

**For Severity 3**:
1. Create ticket in incident system
2. Comment in #alerts-team-eng (not high priority)
3. No immediate action - response within 1 hour

**For Severity 4**:
1. Create ticket in backlog
2. No notification needed

### Escalation Timeline

```
SEVERITY 1: Severity 1 Incident
├─ T+0:    Alert fires → Page on-call engineer
├─ T+1min: Engineering Manager paged if page sent
├─ T+5min: #incident-sev1 Slack channel created
├─ T+15min: CTO paged if not resolved
├─ T+30min: VP Engineering notified
└─ T+60min: Customer communication sent

SEVERITY 2: High Priority Issue  
├─ T+0:    Ticket created, alert posted to #alerts
├─ T+10min: On-call engineer paged if no response
├─ T+15min: Team notified in standup
└─ T+30min: Initial RCA started

SEVERITY 3: Standard Issue
├─ T+0:    Ticket created, Slack post
├─ T+60min: Investigation by assigned engineer
└─ T+4h: Resolution or scheduled fix

SEVERITY 4: Future Work
├─ T+next-business-day: Added to backlog
└─ T+next-planning: Prioritized
```

### Manager Notification Flow

**Incident Commander Role**:
- First responder (on-call engineer)
- Directs investigation and remediation
- Posts status updates to #incident-sev<N> channel

**Engineering Manager**:
- Notified at T+15 min for Severity 1
- Ensures sufficient resources allocated
- Handles external communication

**VP Engineering**:
- Notified at T+30 min for Severity 1
- Decides on full incident war room
- Escalates to CEO if needed

---

## Part 3: Communication Templates

### Severity 1 - Initial Notification

**Slack Message (to #incident-sev1-<timestamp>)**:
```
🚨 SEVERITY 1 INCIDENT DETECTED

Incident Commander: @<on-call engineer>
Impact: API returning 503 errors for 40% of requests
SLO: API Availability SLO violated
Time: 2026-04-28 14:32 UTC
Duration: 6 minutes

Current Status: INVESTIGATING

Actions Taken:
- ⏱ 0min: Alert fired, incident channel created
- ⏱ 1min: On-call engineer paged
- ⏱ 2min: Engineering Manager notified

Next: Initial triage + root cause identification

Please acknowledge and join investigation.
```

### Severity 1 - Status Update (Every 10 minutes)

**Slack Message**:
```
UPDATE: Severity 1 Incident - API Service Degradation

Duration: 24 minutes since 14:32 UTC
Error Rate: 40% (improved from 60% at start)

Current Investigation:
- Database identified as bottleneck (query time +500%)
- Slow query identified: SELECT * FROM transactions (no index)
- Index rebuild in progress

Remediation:
- Database team creating index (ETA 10 min)
- Load balancer scaling 50% more replicas (in progress)
- Will fully resolve once index complete

Next Update: 14:50 UTC

Actions for Responders:
@<database-engineer>: ETA on index completion?
@<devops>: Status on replica scaling?
```

### Severity 1 - Resolution Confirmation

**Slack Message**:
```
✅ INCIDENT RESOLVED: API Service Degradation

Duration: 37 minutes (14:32-15:09 UTC)
Root Cause: Missing database index on high-traffic table
Error Budget Impact: Used 0.32% of monthly budget

Resolution Steps:
1. Created index on transactions table (T+25 min)
2. Error rate dropped from 40% to 0.2% immediately
3. Performed rollback on experimental query optimization
4. Increased replica count 20% as preventative measure

Post-Mortem Scheduled: 2026-04-28 18:00 UTC
- Lead: @<incident-commander>
- All participants welcome

Tickets Created:
- TASK-2847: Add automated index monitoring
- TASK-2848: Code review for query optimization
- TASK-2849: Database capacity planning
```

### Severity 2 - Initial Notification

**Slack Message (to #alerts-team-eng)**:
```
⚠️ SEVERITY 2: Elevated Error Rate on Search Endpoint

Time: 2026-04-28 15:22 UTC
Metric: Search endpoint 500 error rate = 2.1%
Duration: 8 minutes
Impact: ~100 users affected per minute

Dashboard: [link to Grafana]
Logs: [link to logs]

Ticket: INC-3421
Assigned to: @<on-call engineer>

Status: Investigating - will provide update in 5 min
```

### Severity 2 - Resolution

**Slack Message**:
```
✅ RESOLVED: Search Endpoint Error Rate

Duration: 18 minutes (15:22-15:40 UTC)
Root Cause: External search service rate limiting
Error Rate Peak: 2.1%

Actions:
1. Increased rate limit quota with search provider
2. Implemented circuit breaker for graceful degradation
3. Added retry logic with exponential backoff

Follow-up:
- RCA scheduled for tomorrow
- Will implement local caching to reduce dependency
```

### Severity 3 - Notification

**Slack Message (to #alerts-team-eng)**:
```
ℹ️ SEVERITY 3: Occasional 503 on Analytics Endpoint

Metric: 0.3% error rate on /api/analytics
Detected: 2026-04-28 16:15 UTC
Impact: Minimal - non-critical endpoint

Ticket: INC-3422
Status: Created, not assigned - investigate in your own time

Dashboard: [link]
```

### External Customer Communication - Severity 1

**Email to Affected Customers** (sent after 10 minutes):
```
Subject: Service Degradation Notice - Investigating

Dear Customer,

We are currently investigating a service degradation that may affect your use of the Content Engine platform. Our team is actively working to resolve the issue.

Current Status:
- Time: 2026-04-28 14:32 UTC
- Affected Service: API endpoints
- Current Impact: ~40% of requests experiencing delays
- Our teams are actively investigating

Latest Updates: https://status.content-engine.io

We appreciate your patience and will provide an update within 30 minutes.

Best regards,
Content Engine Team
```

**Status Page Update** (immediate):
```
🟠 INVESTIGATING - API Service Degradation
Started: 2026-04-28 14:32 UTC
Duration: 25 minutes

We are investigating elevated error rates on our API service.
We will update this page every 10 minutes with progress.
```

**Email to Affected Customers** (when resolved):
```
Subject: Service Restored - Incident Summary

Dear Customer,

The service degradation that affected our platform has been resolved.

Incident Details:
- Start: 2026-04-28 14:32 UTC
- Resolution: 2026-04-28 15:09 UTC
- Duration: 37 minutes
- Root Cause: Database performance issue

Impact:
- Approximately 40% of API requests were affected
- Your service may have experienced delays or errors

Actions Taken:
- Optimized database queries and indices
- Implemented automatic scaling improvements
- Added preventative monitoring

We apologize for the disruption and appreciate your patience.
If you have questions, please contact our support team.

Best regards,
Content Engine Team
```

---

## Part 4: Investigation Checklist

### Severity 1 Investigation Checklist

**Immediate Triage (First 5 Minutes)**:
```
□ Verify incident is confirmed (not false alarm)
□ Determine: Is API down? Is data corrupted? Is security issue?
□ Check dashboard for affected component
  □ API error rate
  □ Database status
  □ Cache status
  □ External dependencies (Stripe, Twilio, Search)
□ Check recent deployments (within last 1 hour)
  □ Any recent changes that correlate with incident?
  □ Rollback if suspicious deployment identified
□ Check infrastructure metrics
  □ CPU, memory, disk usage (all services)
  □ Database connections count
  □ Network I/O
  □ Disk I/O
□ Determine: Quick fix available? (e.g., restart service)
□ If quick fix applied, verify metrics improving
```

**Data Integrity Check (if data corruption suspected)**:
```
□ Credit system: Run ledger reconciliation immediately
  □ Compare calculated balance vs. stored balance
  □ Check transaction log for gaps or duplicates
  □ Identify affected user accounts
□ User data: Sample verification
  □ Spot check 10 random user records
  □ Verify profile data consistency
  □ Check signup/deletion audit logs
□ Authentication: Verify sessions valid
  □ Check for unauthorized access attempts
  □ Verify session tokens valid
  □ Review auth log for anomalies
□ If corruption confirmed: Enable read-only mode
```

**Root Cause Investigation (Next 15 Minutes)**:
```
□ Recent Changes Review
  □ Last 5 deployments - code changes?
  □ Database migrations - schema changes?
  □ Configuration changes - any recent updates?
  □ Infrastructure changes - scaling, upgrades?
  □ Dependency updates - new versions?
□ Dependency Status Check
  □ Database: Connection pool saturation? Slow queries?
  □ Cache: Hit rate degradation? Evictions?
  □ Message queue: Backlog accumulating?
  □ External APIs: Slow responses? Rate limits hit?
  □ DNS: Resolution issues? TTL changes?
□ Application Logs Review
  □ Search for error patterns (stack traces)
  □ Identify spike time for log volume
  □ Filter logs by affected endpoints/users
  □ Check for timeout exceptions
  □ Review rate limiting triggers
□ Metrics Deep Dive
  □ Latency: Is processing slow or external calls?
  □ Error type: What's the specific error message?
  □ Database: Query duration breakdown
  □ CPU: Single service or system-wide?
  □ Memory: Leak or cache misconfiguration?
```

**Remediation (25+ Minutes)**:
```
□ Identify remediation options:
  Option A: Revert recent change? (Quickest)
  Option B: Restart service? (May clear transient state)
  Option C: Scale up resources? (If load-related)
  Option D: Database intervention? (Rebuild index, kill query)
  Option E: Circuit breaker / feature flag? (Controlled degradation)
□ Select lowest-risk option
□ Implement remediation
□ Monitor metrics for improvement
□ If not improving:
  □ Have plan B ready before attempting
  □ Communicate delay to stakeholders
  □ Continue investigation
□ Post-incident action items
  □ Identify monitoring gaps that could have caught earlier
  □ Identify prevention measures
  □ Schedule RCA meeting
```

### Severity 2 Investigation Checklist

**Rapid Assessment (First 5 Minutes)**:
```
□ Confirm issue exists (check metrics dashboard)
□ Identify affected service/endpoint
□ Check if recent deployment correlates
□ Check dependency status (external services)
□ Identify quick fix (rollback, restart, scale)
□ Post initial status to Slack
```

**Investigation (Next 15 Minutes)**:
```
□ Root cause analysis
  □ Recent code changes?
  □ Configuration changes?
  □ Infrastructure changes?
  □ Dependency issues?
□ Application logs
  □ Error pattern analysis
  □ Latency analysis
□ Database impact
  □ Slow query log
  □ Connection count
  □ Lock waits
```

**Resolution (Next 20 Minutes)**:
```
□ Implement fix or rollback
□ Verify metrics improving
□ Post resolution update
□ Create post-mortem ticket
```

### Post-Incident Checklist (After Resolution)

**Immediate (Within 1 Hour)**:
```
□ Send resolution communication to customers
□ Update status page
□ Notify all stakeholders incident is resolved
□ Document timeline in ticket
□ Identify if full RCA needed (SLO violated = yes)
```

**Short-term (Within 24 Hours)**:
```
□ Conduct post-mortem meeting
  □ Incident timeline walkthrough
  □ Root cause analysis
  □ Impact assessment
□ Identify action items
  □ Prevent recurrence
  □ Improve detection
  □ Improve mitigation speed
□ Create follow-up tickets
□ Update runbooks based on learnings
```

**Medium-term (Within 1 Week)**:
```
□ Complete action items
□ Update monitoring/alerting
□ Code review for changes
□ Training team on learnings
□ Document in incident history
```

---

## Part 5: RCA (Root Cause Analysis) Template

### RCA Document Structure

**Incident ID**: INC-3417  
**Date**: 2026-04-28  
**Duration**: 37 minutes  
**Severity**: 1  
**Impact**: 40% of API requests affected, 0.32% error budget consumed

### Executive Summary
Brief 2-3 sentence description of what happened and the fix.

### Timeline
```
14:32:00 UTC - Alert fires: API error rate > 20%
14:33:00 UTC - On-call engineer pages, incident channel created
14:35:00 UTC - Engineering Manager notified
14:38:00 UTC - Database identified as bottleneck
14:42:00 UTC - Root cause identified: missing index on transactions table
14:57:00 UTC - Index rebuild started
15:09:00 UTC - Index complete, metrics normalize
15:15:00 UTC - All-clear confirmation
```

### Root Cause
Clear statement of what failed and why:
- **Technical Cause**: Missing database index on `transactions.user_id` column
- **Why Introduced**: Index was removed during schema migration 3 weeks ago, but wasn't re-created because post-migration testing used limited dataset
- **Why Not Caught**: Query performance is similar on small datasets; didn't regress until traffic spike occurred

### Contributing Factors
- Lack of automated performance regression testing
- Post-deployment validation used limited dataset
- No monitoring for newly slow queries
- Database warning about missing indices was dismissed

### Impact Assessment
- Users Affected: ~15,000 (40% of active users during incident)
- Duration: 37 minutes
- Error Budget Consumed: 0.32% of monthly budget
- Customer Support Tickets: 8 (resolved with explanation)
- Revenue Impact: None (service degradation, no data loss)

### Resolution
1. Database team created missing index (5 minutes)
2. Index rebuild completed (13 minutes)
3. Error rate returned to <0.1% immediately
4. No rollback needed; permanent fix

### Prevention & Follow-up

**Immediate Actions**:
- TASK-2847: Implement automated index monitoring (assign to: DBA, due: 2026-05-05)
- TASK-2848: Code review query optimization changes (assign to: Backend Lead, due: 2026-05-01)
- TASK-2849: Database capacity planning audit (assign to: DevOps, due: 2026-05-15)

**Process Improvements**:
- Add performance regression testing to CI/CD pipeline
- Increase post-migration validation dataset to production-like scale
- Add database index monitoring to Grafana
- Monthly database schema audit

**Training**:
- Team: Database migration safety procedures
- Discuss at next team standup

### Lessons Learned
1. **Schema Migrations**: Post-deployment validation must use production-scale datasets
2. **Index Management**: Database indices should be monitored automatically
3. **Gradual Rollout**: Should have deployed schema change with canary deployment to catch performance regressions

### Timeline for Follow-up
- Day 1: Action item creation and assignment
- Day 3: Progress check on critical items
- End of week: Completion verification
- Next sprint: Implementation of monitoring/testing improvements

---

## Incident Severity Decision Tree

```
START: Alert or Issue Reported
│
├─ Is the issue confirmed (not false alarm)?
│  └─ No → Close ticket, no further action
│  └─ Yes → Continue
│
├─ Does it affect production users?
│  └─ No (staging/dev only) → Severity 4
│  └─ Yes → Continue
│
├─ Is it a security issue or data corruption?
│  └─ Yes → Severity 1 (immediate)
│  └─ No → Continue
│
├─ Can users not use the service at all?
│  └─ API availability < 95% OR >10% users affected → Severity 1
│  └─ API availability 95-99% OR 1-10% users affected → Severity 2
│  └─ API availability >99% AND <1% users affected → Severity 3
│  └─ No user impact → Severity 4
│
└─ END: Classify and escalate
```

---

## Key Contacts

| Role | Name | On-Call | Alert Method |
|------|------|---------|--------------|
| On-Call Engineer | (rotating) | Yes | PagerDuty |
| Engineering Manager | [Name] | Secondary | PagerDuty |
| VP Engineering | [Name] | Tertiary | Phone + Email |
| Database DBA | [Name] | No | Slack + Email |
| DevOps Lead | [Name] | No | Slack + Email |
| Security Officer | [Name] | On-call for security | Signal |

---

## Useful References

- **Incident Dashboard**: https://grafana.content-engine.local
- **Status Page**: https://status.content-engine.io
- **Runbooks**: docs/runbooks/
- **Architecture Diagram**: docs/architecture.md
- **Database Schema**: docs/database-schema.md
- **Deployment Guide**: docs/deployment.md

