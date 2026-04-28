# Incident Response Procedures

## Overview

This document defines the incident response framework for the Content Engine platform, including:
- Severity classification (P0-P4) with SLAs
- Escalation procedures and on-call rotation
- Communication flows for customers, team, and stakeholders
- Timeline expectations for response and resolution
- Playbooks for critical incidents

---

## Part 1: Severity Classification & SLAs

### P0 (Critical) - Immediate Page

**When to assign P0**:
- Complete service outage (API availability < 95%)
- Major data integrity issue (credit system errors, data loss)
- Security breach or authentication failure affecting users
- Signup completely blocked
- Database corruption or replication failure

**Characteristics**:
- Impact: >10% of users or all critical systems affected
- SLO Impact: Counts against availability SLO
- User-facing: Yes

**SLA Targets**:
- Initial Response: 5 minutes
- Incident Commander assigned: 5 minutes
- Engineering Manager notified: 15 minutes
- CTO notified: 30 minutes
- Customer notification sent: 30 minutes
- Target Resolution: Within 2 hours

**Examples**:
- API returning 503 for >50% of requests
- Credit transactions failing with no rollback
- Signup completely blocked by error
- Unauthorized access detected
- Database replication lag > 1 hour

**Escalation Path**:
```
T+0:    Alert fires → On-call engineer paged (PagerDuty)
T+5:    Create incident Slack channel #incident-p0-<timestamp>
T+15:   Engineering Manager paged if not resolved
T+30:   VP Engineering paged if not resolved
T+60:   CEO notification if still critical
```

---

### P1 (High) - Urgent Response

**When to assign P1**:
- Degraded service (API availability 95-99%)
- 1-10% of users affected by major feature failure
- Elevated error rate (0.5-1%)
- Elevated latency (P99 800ms-1.5s)
- CAPTCHA bypass or detection failures
- Abuse spam wave not fully contained

**Characteristics**:
- Impact: 1-10% of users or major feature degraded
- SLO Impact: May approach or violate threshold
- User-facing: Yes, but partial

**SLA Targets**:
- Initial Response: 15 minutes
- Investigation started: 20 minutes
- Status update posted: 25 minutes
- Target Resolution: Within 1 hour

**Examples**:
- Authentication endpoint returning 500 for 5% of requests
- Database slow query making P99 = 1.2 seconds
- CAPTCHA provider timeout causing signup delays
- Credit debit operations failing for 1% of users
- Bot attack detected (>1000 attempts/hour)

**Escalation Path**:
```
T+0:    Ticket created, alert posted to #alerts-team-eng
T+10:   Post "SEV1 - [brief description]" to Slack
T+15:   Page on-call engineer if no acknowledgment
T+25:   Post status update
```

---

### P2 (Medium) - Standard Response

**When to assign P2**:
- Slightly elevated error rate (<0.5%)
- Slightly elevated latency (P99 > 1s but < 1.5s)
- Single endpoint failing intermittently
- Non-critical feature degraded
- External dependency intermittent

**Characteristics**:
- Impact: <1% of users or non-critical systems
- SLO Impact: No
- User-facing: Minimal

**SLA Targets**:
- Initial Response: 1 hour
- Investigation started: 2 hours
- Target Resolution: Within 4 hours

**Examples**:
- Search endpoint returning 503 for 0.1% of requests
- Analytics endpoint occasionally slow
- Email service returning rare timeouts
- Cache miss rate elevated

**Escalation Path**:
```
T+0:    Ticket created, post to #alerts-team-eng
T+60:   Investigation begins by assigned engineer
T+240:  Target resolution or escalation
```

---

### P3 (Low) - Future Planning

**When to assign P3**:
- Monitoring false alarm
- Test/staging system issue
- Non-critical infrastructure warning
- Upcoming capacity concern
- Documentation or runbook needed

**Characteristics**:
- Impact: No user impact or minimal
- SLO Impact: No
- User-facing: No

**SLA Targets**:
- Response: Next business day
- Planning: Next sprint

**Examples**:
- Staging environment disk warning
- Log storage exceeding threshold
- Documentation needs updates
- Monitoring threshold may need adjustment

---

## Part 2: Escalation Procedures

### On-Call Rotation

**Structure**:
- Primary on-call engineer: 24/7 rotation (weekly)
- Secondary on-call: Manager/senior engineer
- On-call contact via: PagerDuty (automatic for P0/P1)

**Handoff Process**:
- Every Monday at 9 AM UTC
- Outgoing engineer briefs incoming engineer
- Confirm Slack status is updated
- Verify PagerDuty is updated
- Document any ongoing issues in handoff ticket

### Initial Escalation (First 5 Minutes)

**P0 Response**:
1. Alert fires (automatic PagerDuty page)
2. On-call engineer acknowledges page (PagerDuty)
3. Create incident Slack channel: `#incident-p0-<YYYYMMDD-HHMM>`
4. Post initial message with:
   - Brief description
   - Incident Commander name
   - Suspected impact
   - Dashboard/log links
5. Immediately begin triage (see Investigation section)

**P1 Response**:
1. Alert fires (posted to #alerts-team-eng)
2. On-call engineer acknowledges in Slack thread
3. Create ticket in incident system
4. If no response in 10 minutes → Page on-call engineer

**P2 Response**:
1. Alert posted to #alerts-team-eng
2. No immediate action required
3. Assignment to on-call for next available time

### Manager Notification

**For P0 - Severity 1**:
- T+15 min: Engineering Manager paged if still ongoing
- T+30 min: VP Engineering paged
- T+60 min: CEO optionally notified

**For P1 - Severity 2**:
- T+30 min: Engineering Manager notified if ongoing
- Inform about status and ETA

**For P2+**:
- No automatic management notification

---

## Part 3: Communication Flow

### Internal Communication - Incident Channel

**P0 Incident Channel Updates** (every 10 minutes):

```
🚨 INCIDENT UPDATE - [Service Name]

Status: [INVESTIGATING / MITIGATING / MONITORING / RESOLVED]
Duration: [X minutes]
Impact: [% users affected, affected endpoints]
Error Rate: [current vs. baseline]

Current Work:
- [specific action being taken]
- [status on remediation]

Blockers:
- [if any external dependencies needed]

Next Actions:
- [what's being done next]
- [timeline to next status]

Team, please acknowledge and join investigation. 👇
```

**Resolution Message**:

```
✅ INCIDENT RESOLVED - [Service Name]

Duration: [X minutes, specific time range]
Root Cause: [brief 1-sentence summary]
Error Budget Impact: [% if applies]

Resolution Steps Taken:
1. [action 1]
2. [action 2]
3. [action 3]

Post-Mortem Scheduled: [date/time]
Incident Commander: @[name]

Thanks to all responders for quick action.
```

### Customer Communication

**P0 - Initial Notification** (send within 10 minutes):

```
Subject: Service Degradation Notice - We Are Investigating

Dear [Customer Name],

We are currently investigating a service degradation affecting the 
Content Engine platform. Our team is actively working to resolve the issue.

Current Status:
- Started: [time in UTC]
- Affected Services: [list services]
- Current Impact: [% or description]
- Team Status: Actively investigating

We will provide an update within 30 minutes at:
https://status.content-engine.io

Thank you for your patience.

Best regards,
Content Engine Team
```

**P0 - Update Message** (every 30 minutes):

```
Subject: Service Degradation Update - [Time]

The investigation into the service degradation continues.

Current Status:
- Duration: [X minutes]
- Root Cause: [if identified]
- Remediation: [current fix attempt]
- ETA to Resolution: [time or "within X minutes"]

Latest updates: https://status.content-engine.io

We appreciate your patience.
```

**P0 - Resolution Message** (immediately after resolution):

```
Subject: Service Restored - Incident Summary

The service degradation has been resolved.

Incident Details:
- Start: [UTC time]
- Resolution: [UTC time]
- Duration: [X minutes]
- Root Cause: [technical summary]

Actions Taken:
- [fix 1]
- [fix 2]

We apologize for the disruption. If you have questions, please 
contact support@content-engine.io.

Best regards,
Content Engine Team
```

### Status Page Updates

**P0 - Incident Start**:
```
🔴 INVESTIGATING - [Service Name]
Started: [UTC time]

We are investigating elevated error rates on [service].
More information at https://status.content-engine.io
```

**P0 - Under Mitigation**:
```
🟡 DEGRADED - [Service Name]
Started: [UTC time]

We have identified the root cause and are implementing a fix.
ETA to resolution: [time]
```

**P0 - Resolved**:
```
🟢 RESOLVED - [Service Name]
Duration: [X minutes, time range]
Root Cause: [brief summary]

Service has been restored to normal operations.
```

---

## Part 4: Investigation & Remediation

### Immediate Triage (First 5 Minutes)

**Questions to Answer**:
1. Is this a real incident or false alarm?
2. What is the affected service/component?
3. What is the blast radius (% of users, endpoints affected)?
4. Is there data corruption or security impact?
5. Were there recent deployments that could have caused this?

**Quick Checks**:
- [ ] Metrics dashboard - CPU, memory, disk on all services
- [ ] Recent deployments - within last 1 hour?
- [ ] Database status - connections, query performance, replication lag
- [ ] Cache status - hit rate, eviction rate
- [ ] External dependencies - Stripe, Razorpay, email service status
- [ ] Recent configuration changes

**Quick Fixes to Try First**:
- Restart affected service (if degradation but not outage)
- Clear cache if cache-related issue
- Scale up if load-related
- Rollback last deployment if timing correlates

### Root Cause Analysis

**For Database Issues**:
1. Check slow query log for newly slow queries
2. Check for missing indices on frequently queried columns
3. Check connection pool saturation
4. Check for table locks or deadlocks
5. Verify replication lag (if applicable)
6. Check query execution plans

**For API/Application Issues**:
1. Check recent code deployments
2. Review error logs for stack traces
3. Check for memory leaks or resource exhaustion
4. Check for dependency timeouts
5. Check for rate limiting triggers
6. Check configuration changes

**For Infrastructure Issues**:
1. Check CPU/memory/disk utilization
2. Check network I/O and packet loss
3. Check disk I/O and queue depth
4. Check system logs for errors
5. Check for kernel panics or system events

### Remediation Options

**Option A: Rollback** (Fastest, if deployment-related)
- Time: 2-5 minutes
- Risk: Low (known good state)
- Prefer this if issue correlates with recent deployment

**Option B: Restart Service** (Fast, if transient state issue)
- Time: 1-3 minutes
- Risk: Medium (may lose in-flight requests)
- Use only if safe (stateless services preferred)

**Option C: Scale Up** (Medium, if load-related)
- Time: 2-5 minutes
- Risk: Low (adds capacity)
- Combine with investigation to find root cause

**Option D: Feature Flag** (Medium, if feature-related)
- Time: 2-3 minutes
- Risk: Low (graceful degradation)
- Use to disable problematic feature while investigating

**Option E: Database Intervention** (Slower, if database-related)
- Time: 5-15 minutes
- Risk: Medium (requires expertise)
- Examples: rebuild index, kill slow query, stop replication

**Option F: Partial Outage** (Last resort)
- Time: 2 minutes
- Risk: High (intentional degradation)
- Use only if alternative is worse outage
- Enable read-only mode or circuit breaker

### Monitoring During Remediation

After implementing a fix:
1. Monitor error rate (should decrease within 30 seconds)
2. Monitor latency (should return to baseline)
3. Monitor affected users (should stop seeing errors)
4. Watch for side effects (cache issues, data inconsistencies)
5. If no improvement in 5 minutes, try next option

---

## Part 5: Common Incident Playbooks

### Playbook 1: Database Connection Exhaustion

**Symptoms**:
- Errors: "too many connections" or "connection pool exhausted"
- Applications hang or timeout
- Metrics: Connection count at or near max
- Error rate: Sudden spike in 502/503 errors

**Detection**:
- Alert: Database connection count > 80% of max
- Logs: "maximum number of connections exceeded"

**Immediate Actions**:
1. Check which applications are consuming connections
   ```sql
   SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;
   ```
2. Identify long-running transactions
   ```sql
   SELECT pid, now() - query_start, query FROM pg_stat_activity WHERE query_start < now() - interval '5 minutes';
   ```
3. Kill idle/long connections (carefully)
   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
   WHERE state = 'idle' AND query_start < now() - interval '10 minutes';
   ```

**Remediation Options**:
- A. Increase max_connections in PostgreSQL config (requires restart)
- B. Increase connection pool size in applications
- C. Implement connection pooling (PgBouncer)
- D. Kill idle connections (temporary measure)
- E. Scale application instances (reduces per-instance load)

**Investigation**:
- Were there recent code changes that affected connection handling?
- Is query performance degraded (holding connections longer)?
- Did traffic spike?
- Are there connection leaks in application code?

**Prevention**:
- Set alert threshold at 70% to catch early
- Implement connection pooling middleware
- Add connection lifecycle monitoring
- Review application code for connection leaks

---

### Playbook 2: Credit System Inconsistency

**Symptoms**:
- Users report missing or incorrect credits
- Credit balance doesn't match transaction history
- Double charges or failed charges not reversed
- Audit log shows discrepancies

**Detection**:
- Alert: Ledger reconciliation fails
- Manual report: User complaint
- Monitoring: Balance mismatch detected

**Immediate Actions**:
1. Enable read-only mode for credit system
   ```
   POST /api/admin/credits/read-only
   ```
2. Run reconciliation query
   ```sql
   SELECT user_id, 
     SUM(amount) as transaction_total,
     balance as stored_balance,
     SUM(amount) - balance as discrepancy
   FROM credits_transactions
   GROUP BY user_id
   HAVING SUM(amount) != balance;
   ```
3. Identify affected users and scope
4. Take detailed backup of transactions table
5. Page DBA to database

**Investigation**:
- Were there recent deployments to payment processing?
- Check transaction logs for duplicates
- Check for failed transaction cleanup
- Review database transaction logs for anomalies
- Check for concurrent writes to same user credits

**Remediation**:
- Identify corrupted accounts
- Manually correct balances (with detailed audit trail)
- Replay failed transactions if needed
- Notify affected users with explanation
- Re-enable credit system when validated

**Prevention**:
- Implement credit transaction idempotency keys
- Add checksums to transactions
- Implement double-entry bookkeeping
- Add real-time ledger reconciliation
- Test failure scenarios in staging

---

### Playbook 3: Rate Limit Misconfiguration

**Symptoms**:
- Legitimate users getting 429 Too Many Requests errors
- API calls rejected even from low-traffic accounts
- Mobile app users unable to use service
- Burst traffic causes widespread 429s

**Detection**:
- Alert: >5% of requests returning 429
- User complaints: "I'm blocked but not making many requests"
- Logs: Excessive 429 responses

**Immediate Actions**:
1. Identify the affected rate limit rule
   - IP-based? User-based? Endpoint-based?
   - Check current limits vs. expected
2. Query rate limiter state
   ```
   GET /api/admin/rate-limits/current
   ```
3. Temporarily increase limit or disable if necessary
   ```
   POST /api/admin/rate-limits/override
   { "rule": "signup", "requests_per_minute": 100 }
   ```
4. Monitor for abuse after override

**Investigation**:
- Was the limit recently changed?
- Is the limit calculation correct (user vs. IP)?
- Are legitimate clients making too many requests?
- Is there a bot attack triggering limits?
- Are we miscounting requests (counting retries)?

**Remediation Options**:
- A. Increase limit threshold
- B. Change rate limit scope (IP to account-based)
- C. Implement token bucket vs. sliding window
- D. Add whitelist for trusted clients
- E. Implement adaptive rate limiting based on load

**Prevention**:
- Load test with realistic traffic patterns
- Have fallback limits in feature flags
- Monitor rate limit hit rates as metric
- Document expected usage patterns per endpoint
- Review limits in pre-deployment checklist

---

### Playbook 4: Webhook Signature Failures

**Symptoms**:
- Payment webhooks not being processed
- Unprocessed webhook queue backing up
- Logs: "Signature validation failed"
- Razorpay/Stripe webhook events not creating credits

**Detection**:
- Alert: >5 signature failures per minute
- Logs: webhook_signature_fail events
- Monitoring: Unprocessed webhook queue > 100 items

**Immediate Actions**:
1. Check webhook secret in environment
   ```
   echo $RAZORPAY_WEBHOOK_SECRET
   ```
2. Verify against Razorpay dashboard
   - Navigate to Razorpay Dashboard → Settings → API Keys
   - Compare secret value
3. Check recent deployments
   - Could env var have been corrupted?
4. Check webhook logs for signature format
   ```
   SELECT * FROM webhook_events 
   WHERE event_type = 'payment_received' 
   ORDER BY created_at DESC LIMIT 20;
   ```

**Investigation**:
- Is the secret correct in all environments?
- Were there recent configuration changes?
- Is there a replay attack (same signature, new timestamp)?
- Are there timezone issues in signature calculation?
- Check if Razorpay rotated their keys

**Remediation Options**:
- A. Rotate webhook secret (if compromised)
   1. Generate new secret in Razorpay Dashboard
   2. Update environment variable
   3. Deploy
   4. Reprocess failed webhooks
- B. Check IP whitelist (if IP-based validation)
   1. Verify Razorpay IP ranges
   2. Check firewall rules
- C. Block and retry failed webhooks
   1. Pause webhook processing
   2. Rotate secret if needed
   3. Replay unprocessed webhooks

**Prevention**:
- Store webhook secrets in encrypted vault
- Add signature validation tests
- Implement webhook replay protection (check timestamp)
- Monitor webhook latency
- Have manual webhook replay capability

---

### Playbook 5: CAPTCHA Service Outage

**Symptoms**:
- Signup form shows CAPTCHA error
- All signup attempts fail with "Please verify CAPTCHA"
- Logs: CAPTCHA provider timeout errors
- Error rate spike on /api/signup endpoint

**Detection**:
- Alert: CAPTCHA verification failures > 50%
- Status page: Google reCAPTCHA service status
- Logs: CAPTCHA provider error responses

**Immediate Actions**:
1. Check CAPTCHA service status
   - Check Google reCAPTCHA status page
   - Check hCaptcha status if using alternate
2. Verify API key in environment
   ```
   echo $CAPTCHA_SECRET_KEY
   ```
3. Test CAPTCHA endpoint manually
   ```
   curl https://www.google.com/recaptcha/api/siteverify \
     -d "secret=$CAPTCHA_SECRET_KEY&response=test"
   ```
4. Enable CAPTCHA bypass for internal testing
   ```
   POST /api/admin/captcha/bypass-enable
   ```

**Investigation**:
- Is the CAPTCHA provider having issues (check status page)?
- Is the API key still valid?
- Did rate limits get hit on CAPTCHA provider?
- Is network connectivity to CAPTCHA provider down?
- Are there DNS resolution issues?

**Remediation Options**:
- A. Switch to alternate CAPTCHA provider
   1. Update feature flag to use backup provider
   2. Monitor for success
- B. Disable CAPTCHA temporarily
   1. Enable bypass mode with manual review
   2. Increase abuse monitoring
   3. Add IP-based verification
- C. Implement client-side timeout
   1. If CAPTCHA slow, timeout after 10s
   2. Offer alternative verification (email code)
- D. Implement fallback flow
   1. CAPTCHA unavailable → phone verification
   2. OR email code verification

**Prevention**:
- Have backup CAPTCHA provider configured
- Implement CAPTCHA caching for same user
- Add CAPTCHA performance monitoring
- Test provider failover regularly
- Document manual bypass process

---

## Part 6: Post-Incident Process

### During Resolution (Immediately)

1. Post resolution message in incident channel
2. Send customer notification email
3. Update status page to resolved
4. Document timeline in ticket
5. Identify if full post-mortem needed

### Within 1 Hour

1. Declare incident officially resolved
2. Notify all stakeholders
3. Send detailed summary to management
4. Create post-mortem ticket (see postmortem-template.md)
5. Schedule post-mortem meeting (within 24 hours)

### Within 24 Hours

1. Conduct post-mortem meeting
2. Complete 5-why analysis
3. Identify preventative action items
4. Assign owners and due dates
5. Create follow-up tickets

### Within 1 Week

1. Complete action items from post-mortem
2. Deploy monitoring improvements
3. Update runbooks and documentation
4. Conduct team training on learnings
5. Close post-mortem ticket

---

## Part 7: Incident Decision Tree

```
START: Alert or Issue Reported
│
├─ Is the issue confirmed (not false alarm)?
│  └─ NO → Close ticket, document as false alarm
│  └─ YES → Continue
│
├─ Does it affect production users?
│  └─ NO (staging/dev only) → P3 - Standard handling
│  └─ YES → Continue
│
├─ Is it a security issue or data corruption?
│  └─ YES → P0 - Immediate escalation
│  └─ NO → Continue
│
├─ What's the impact scope?
│  ├─ >10% of users OR all critical services down → P0
│  ├─ 1-10% of users OR major feature degraded → P1
│  ├─ <1% of users OR non-critical feature → P2
│  └─ No user impact → P3
│
└─ Escalate and respond per severity level
```

---

## Part 8: Quick Reference

### P0 On-Call Responsibilities
- Page received: Acknowledge within 1 minute
- Investigation: Start within 5 minutes
- Status update: Every 10 minutes
- Escalation: If not resolved in 15 minutes

### Key Contacts
- **On-Call Engineer**: PagerDuty (primary responder)
- **Engineering Manager**: Secondary escalation (T+15 min)
- **VP Engineering**: Tertiary escalation (T+30 min)
- **Database DBA**: For database issues
- **DevOps Lead**: For infrastructure issues
- **Security Officer**: For security incidents

### Important Tools & Links
- **Incident Tracking**: Jira (incident ticket system)
- **Monitoring Dashboard**: Grafana
- **Logs**: CloudWatch/ELK Stack
- **Status Page**: https://status.content-engine.io
- **Runbooks**: /docs/runbooks/
- **Architecture**: /docs/architecture.md

### Response Time Summary
| Severity | Initial | Investigation | Target Resolution |
|----------|---------|----------------|--------------------|
| P0 | 5 min | 5 min | 2 hours |
| P1 | 15 min | 20 min | 1 hour |
| P2 | 1 hour | 2 hours | 4 hours |
| P3 | 1 day | 1-2 days | Next sprint |

---

## Document History
- **Created**: 2026-04-28
- **Last Updated**: 2026-04-28
- **Owner**: Platform Engineering Team
