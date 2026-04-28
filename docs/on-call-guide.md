# On-Call Guide

## Overview

This guide is for engineers on the Content Engine on-call rotation. It covers responsibilities, required tools and access, common debugging procedures, quick fixes, and escalation decision-making.

**TL;DR**: You're responsible for responding to P0/P1 incidents within SLA, owning the investigation, communicating status updates, and coordinating remediation.

---

## Part 1: On-Call Responsibilities

### Primary Responsibilities

**During Your On-Call Week**:
1. Respond to all P0 incidents within 5 minutes
2. Respond to P1 incidents within 15 minutes
3. Own incident investigation and remediation
4. Post status updates every 10 minutes during P0
5. Keep management informed of incident status
6. Lead post-mortem meeting after incident
7. Be available 24/7 (yes, really)

### What You're NOT Responsible For

- Solving all problems (escalate if stuck > 10 min)
- Working without breaks (coordinate with team if multi-hour incident)
- Making architectural decisions during incident (focus on resolution)
- Handling billing or customer service issues (unless security-related)
- Responding to non-incident Slack messages

### Incident Ownership

**As Incident Commander, you**:
- Are the single point of contact for incident status
- Coordinate between team members
- Make escalation and remediation decisions
- Communicate with management and customers
- Document timeline and post-incident action items
- May not be the person implementing the fix (others can help)

---

## Part 2: Required Access & Tools

### Before Your On-Call Week

**Request access to**:
- [ ] PagerDuty (on-call alert system)
- [ ] AWS Console (production environment)
- [ ] Database production cluster (read/write)
- [ ] Grafana (monitoring dashboards)
- [ ] CloudWatch / ELK Stack (application logs)
- [ ] Vercel Dashboard (deployment, feature flags, secrets)
- [ ] Jira (incident ticket creation)
- [ ] Slack #incident-response channel

### Important Tools

| Tool | Purpose | Access |
|------|---------|--------|
| PagerDuty | Incident alerts & escalation | Web/Mobile app |
| Grafana | Metrics & dashboards | https://grafana.content-engine.local |
| CloudWatch | Application logs | AWS Console |
| AWS Console | Infrastructure, databases | https://console.aws.amazon.com |
| Vercel | Deployments, feature flags, env vars | https://vercel.com/dashboard |
| Database Client | Query database | psql or DBeaver |
| Slack | Communication during incident | Desktop/Mobile |
| Jira | Create incident tickets | https://jira.company.com |

### Setting Up Your Environment

**Before on-call week starts**:
```bash
# Verify database access
psql -h prod-db.company.com -U oncall -d production

# Verify AWS access
aws ec2 describe-instances --region us-east-1

# Verify log access
# Test CloudWatch query in console

# Test Grafana dashboards
# Bookmark key dashboards

# Verify Slack access
# Join #incident-response and #alerts-team-eng channels
```

### Quick Access Links

Bookmark these in your browser:
- **Grafana Main Dashboard**: https://grafana.content-engine.local/d/production
- **Error Rate Dashboard**: https://grafana.content-engine.local/d/error-rate
- **Database Dashboard**: https://grafana.content-engine.local/d/database
- **AWS Console**: https://console.aws.amazon.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Status Page**: https://status.content-engine.io/edit (for updates)
- **Jira Incident Template**: https://jira.company.com/browse/INC

---

## Part 3: Incident Response Workflow

### When You Receive a Page

```
T+0:    PagerDuty alert arrives
        └─ Read alert title and description
        └─ Go to PagerDuty app and acknowledge within 30 seconds
        └─ Take screenshot of alert details

T+1:    Open browser and navigate to Grafana
        └─ Go to main production dashboard
        └─ Look for red/orange alerts
        └─ Take screenshots of affected metrics

T+2:    Assess severity
        └─ Is API responding? (test endpoint)
        └─ Are users affected?
        └─ What percentage of traffic affected?
        └─ Determine P0 vs P1 (see decision tree)

T+3:    Create Slack channel and post initial message
        └─ #incident-p0-YYYYMMDD-HHMM for P0
        └─ #incident-p1-YYYYMMDD-HHMM for P1
        └─ Include alert details and initial assessment

T+5:    Begin investigation (see Investigation Checklist below)
```

### Status Update Cadence

**For P0 incidents**:
- First update: T+5 min
- Every 10 min thereafter until resolution
- Format:
  ```
  UPDATE: [Service] - Status at T+X min
  
  Metric: [Error rate, latency, etc.]
  Impact: [Number of users/requests affected]
  Investigation: [What we're looking at]
  Hypothesis: [Current theory]
  Next action: [What we're doing next]
  
  ETA to resolution: [time or "investigating"]
  ```

**For P1 incidents**:
- First update: T+10 min
- Every 15-20 min thereafter
- Same format but less frequent

### Escalation During Incident

**If stuck for >10 minutes**:
- Post in Slack that you need help
- Page a senior engineer
- Describe what you've checked
- Ask specific question (not just "help")

**If not responding to fix in 30 min on P0**:
- Page Engineering Manager
- Manager will help coordinate more resources
- Don't wait until disaster, ask early

**If no progress in 60 min**:
- Page VP Engineering
- Declare war room (get everyone in video call)
- Switch to "minimize damage" vs "fix root cause"

---

## Part 4: Investigation Checklist

### Immediate Triage (First 5 Minutes)

**Reality Check**:
```
□ Is the alert real or false positive?
  □ Check Grafana dashboard directly
  □ Try calling API endpoint manually
  □ Check if data is propagating correctly
□ What's broken?
  □ Is it API, database, external service, or infrastructure?
  □ Which endpoint/service specifically?
  □ Is it affecting all requests or subset?
□ How many people are affected?
  □ Estimate % of users: 0.1%? 1%? 10%? 100%?
  □ Check support channel for complaints
  □ Monitor Twitter/status page for reports
□ Recent changes?
  □ Check deploy log: any deployment in last 1 hour?
  □ Check feature flags: any recent changes?
  □ Check database migrations: any recent schema changes?
```

**Quick Fixes to Try** (in order of risk):

1. **Restart the service** (lowest risk)
   ```bash
   # Via Vercel (if deployed there)
   vercel rollback  # Only if confident it's bad deployment
   
   # Or manually via dashboard
   # Restart pods in AWS
   ```

2. **Check feature flags** (very low risk)
   ```
   # Check Vercel environment variables
   # Look for recently changed flags
   # Toggle off any experimental features
   ```

3. **Scale up** (low risk if load-related)
   ```
   # Increase replica count via AWS
   # Or toggle auto-scaling higher threshold
   # This buys time while investigating
   ```

4. **Clear cache** (low risk)
   ```
   # Redis flush (if safe for your application)
   # CDN cache purge
   # Application cache clear
   ```

5. **Rollback last deployment** (low risk if recent)
   ```
   # Vercel: vercel rollback
   # Or git revert + redeploy
   # Only if confident deployment caused it
   ```

**Do NOT try without thinking**:
- Database migrations
- Credential rotations
- Removing database constraints
- Deleting tables/data

### Root Cause Investigation (Next 15 Minutes)

**Check Each Category**:

**1. Application Code**:
```
□ Recent deployments (check Vercel/GitHub releases)
□ Code changes that could cause errors
□ Check application error logs
  □ Stack traces showing what failed
  □ Error rate spike (when did it start?)
  □ Specific services affected
□ Check feature flags
  □ What was toggled recently?
  □ Can you toggle it back?
```

**2. Database**:
```
□ Connection pool saturation?
  SELECT COUNT(*) FROM pg_stat_activity;
  
□ Slow queries?
  SELECT query, mean_time FROM pg_stat_statements 
  ORDER BY mean_time DESC LIMIT 10;
  
□ Lock waits?
  SELECT * FROM pg_locks WHERE NOT granted;
  
□ Replication lag? (if applicable)
  SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) as replication_lag;
  
□ Table/index issues?
  SELECT schemaname, tablename, idx_scan FROM pg_stat_user_indexes 
  ORDER BY idx_scan ASC;
```

**3. External Dependencies**:
```
□ Stripe API status?
  □ Check status.stripe.com
  
□ Razorpay webhook delays?
  □ Check Razorpay dashboard
  
□ Email service?
  □ Check SendGrid/mailgun status
  
□ Search service?
  □ Check Algolia status or test search API
  
□ CAPTCHA service?
  □ Check Google reCAPTCHA status
  □ Check response latency
```

**4. Infrastructure**:
```
□ CPU usage across instances?
  □ > 90% = scaling or optimization needed
  
□ Memory usage?
  □ > 90% = potential OOM killer
  
□ Disk space?
  □ < 10% free = need to clean up
  
□ Network saturation?
  □ Check bandwidth in/out
  
□ Kernel events?
  □ Check system logs for OOM, panics
```

**5. Monitoring Gaps**:
```
□ Is the metric really broken?
  □ Or is it a monitoring/alerting issue?
  
□ Can you reproduce the error?
  □ Try calling the API yourself
  □ Check if users are actually complaining
  
□ Is alert tuned correctly?
  □ False positive rate?
```

### Using Logs Effectively

**Finding Errors in CloudWatch**:
```
# Filter by error patterns
fields @timestamp, @message, @logStream
| filter @message like /ERROR/
| stats count() by @logStream
| sort count() desc

# Find slow queries
fields @timestamp, queryTime, query
| filter queryTime > 1000
| stats avg(queryTime) by query
| sort avg(queryTime) desc

# Correlation analysis
fields @timestamp, errorRate, @duration
| stats avg(errorRate), avg(@duration) by bin(5m)
```

**Key Log Patterns to Search For**:
- `ERROR`, `Exception`, `failed`
- `timeout`, `deadline`
- `connection refused`, `connection timeout`
- `OOM`, `out of memory`
- `rate limit`, `429`
- `signature`, `authentication failed`

---

## Part 5: Common Issues & Quick Fixes

### Issue 1: API Errors (500, 502, 503)

**Likely Causes**:
- Database connection pool exhausted
- Recent deployment broke code
- Service crashed or hung
- Resource exhaustion (CPU/memory)

**Quick Diagnosis**:
```bash
# Check error rate and type
# Grafana: look for spike in 500 errors

# Check logs for specific error
# CloudWatch: filter for ERROR messages

# Check database
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check deployment timeline
# Vercel dashboard: recent deployments?

# Check application logs
# Does error correlate with recent change?
```

**Quick Fixes** (in order):
1. Rollback last deployment (if recent)
2. Restart service
3. Scale up if resource issue
4. Disable problematic feature flag
5. Investigate database/external dependency

---

### Issue 2: High Latency (P99 > 1s)

**Likely Causes**:
- Database queries too slow
- Garbage collection pauses
- Network latency to external service
- Excessive logging or processing
- Resource contention

**Quick Diagnosis**:
```
# Check latency metric
# Grafana: look at P99 latency trend

# Identify slow endpoints
# Check logs: which endpoints?

# Check database
# Slow query log: which queries?

# Check external dependencies
# Network calls taking long?
```

**Quick Fixes**:
1. Add database index if identified slow query
2. Reduce logging verbosity
3. Disable non-critical features
4. Scale up (more CPUs can help GC)
5. Check external service latency

---

### Issue 3: Database Unavailable

**Symptoms**: "Cannot connect to database" errors

**Quick Diagnosis**:
```bash
# Can you connect?
psql -h prod-db.company.com -d production

# Is database listening?
# Check AWS RDS dashboard

# Replication issues?
SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp()));

# Table locks?
SELECT * FROM pg_locks WHERE NOT granted;

# Low disk space?
SELECT pg_database_size('production') / 1024^3 as size_gb;
```

**Quick Fixes**:
1. Restart database connection pool on app side
2. Enable read-only mode if writes failing
3. Page DBA for database intervention
4. Check AWS RDS event logs

---

### Issue 4: Rate Limit False Positives

**Symptoms**: Legitimate users getting 429 errors

**Quick Diagnosis**:
```
# Check rate limit rules
GET /api/admin/rate-limits/current

# Which rule is firing?
# IP-based? User-based? Endpoint-based?

# Check real request rate
# CloudWatch: requests per minute?

# Recent changes?
# Did we deploy new rate limiting?
```

**Quick Fixes**:
1. Temporarily increase rate limit threshold
2. Switch from IP-based to user-based
3. Add whitelist for specific IPs
4. Disable rate limiting if preventing service

---

### Issue 5: Webhook Signature Failures

**Symptoms**: "Signature validation failed" errors

**Quick Diagnosis**:
```
# Check webhook secret
echo $RAZORPAY_WEBHOOK_SECRET

# Verify against provider dashboard
# Log in to Razorpay/Stripe dashboard
# Check configured webhook secret

# Check recent deployments
# Could secret have been corrupted?
```

**Quick Fixes**:
1. Verify secret matches provider
2. If wrong, rotate in provider dashboard
3. Update env var and redeploy
4. Manually replay failed webhooks
5. Page security if possible attack

---

### Issue 6: Credit System Errors

**Symptoms**: Users report missing credits, double charges

**Actions**:
1. **IMMEDIATELY enable read-only mode**
   ```
   POST /api/admin/credits/read-only
   ```

2. **Do NOT attempt manual fixes without DBA**
   - Credit system is critical
   - Any change could make worse
   - Page database engineer immediately

3. **Collect evidence**
   - Screenshot of user complaint
   - User ID affected
   - Transaction history screenshots
   - Error messages from logs

4. **Communicate with user**
   - Acknowledge issue
   - We're investigating
   - Will resolve within X hours
   - Don't admit fault ("investigating cause")

5. **Let DBA handle remediation**
   - Reconciliation queries
   - Balance corrections
   - Transaction replays if needed

---

## Part 6: Escalation Decision Tree

```
Is the issue resolved?
├─ YES → Post resolution message, move to post-mortem
└─ NO → Continue below

Have you identified the root cause?
├─ YES → Skip to remediation section
└─ NO → Continue investigating below

Have you spent > 10 minutes investigating?
├─ YES → Escalate - ask for help
│       └─ Post in Slack: "I'm stuck on [specific question]"
│       └─ Page senior engineer
└─ NO → Continue investigating

Is it a database issue?
├─ YES → Page database DBA
│       └─ Include logs and query analysis
└─ NO → Continue below

Is it an infrastructure issue?
├─ YES → Page DevOps/infrastructure engineer
│       └─ Include CPU/memory/disk metrics
└─ NO → Continue below

Is it a security issue?
├─ YES → Page security officer immediately
│       └─ Assume breach until proven otherwise
└─ NO → Continue below

Have you tried quick fixes?
├─ YES → Try next fix or escalate for help
└─ NO → Try quick fixes (see Common Issues section)

Time spent: 15+ minutes on P0?
├─ YES → Page Engineering Manager
│       └─ Manager helps coordinate additional resources
└─ NO → Continue investigating

Time spent: 30+ minutes on P0?
├─ YES → Page VP Engineering
│       └─ Likely need war room / additional escalation
└─ NO → Continue investigating
```

---

## Part 7: Communication During Incident

### Status Update Template

**P0 Status Update** (every 10 minutes):
```
🚨 INCIDENT UPDATE — [Service Name]

Duration: [X minutes since start]
Impact: [X% of users / X requests affected]
Error Rate: [current value vs normal baseline]
Status: [INVESTIGATING / WORKING ON FIX / MONITORING]

What We've Found:
• Likely cause: [specific component or change]
• Evidence: [metrics or logs confirming this]

What We're Doing:
1. [Action 1] - [status: in progress/completed]
2. [Action 2] - [status: starting/waiting on result]

What's Blocking Us (if any):
• [External dependency / information we need]

Next Actions:
• [Action we'll take in next 10 min]

ETA to Resolution: [time or "within X minutes"]

Assigned Team: @[names] 
Please continue investigation and acknowledge. 👇
```

### Reporting to Management

**When Engineering Manager Arrives**:
- Show them Grafana dashboard
- Walk through your timeline and findings
- Explain current remediation approach
- Ask them to help coordinate resources if needed
- They handle external communication while you focus on fix

**When VP Engineering Arrives**:
- Brief them on status (not detailed timeline, just headline)
- What's the estimated resolution time?
- What resources do you need?
- They'll decide on full escalation (CEO, customer calls, etc.)

---

## Part 8: After the Incident

### Immediate Actions (First Hour)

1. **Post Resolution Message**:
   ```
   ✅ INCIDENT RESOLVED - [Service Name]
   
   Duration: [X minutes]
   Root Cause: [brief summary]
   
   Post-Mortem: Scheduled for [date/time]
   Everyone involved should attend.
   ```

2. **Update Status Page**
   - Change to "Resolved"
   - Add brief summary
   - Include resolution time

3. **Create Post-Mortem Ticket**
   ```
   Title: "Post-Mortem: [Incident Title]"
   Assignee: You (Incident Commander)
   Due: 24 hours from incident end
   Template: See postmortem-template.md
   ```

4. **Document Initial Timeline**
   - Write down events while fresh
   - Include timestamps
   - Link to relevant logs/dashboards

### Before Your Week Ends

- [ ] Complete post-mortem meeting
- [ ] Submit post-mortem report
- [ ] Create follow-up action items
- [ ] Handoff any ongoing issues to next on-call
- [ ] Post lessons learned to team Slack channel

---

## Part 9: On-Call Rotation Details

### Weekly Handoff

**Your First Day as On-Call**:
- Previous on-call walks you through
- Review any ongoing issues
- Confirm all access is working
- Test PagerDuty alert (send test page)

**Your Last Day as On-Call**:
- Write brief notes on anything ongoing
- Walk next on-call through issues
- Confirm they have all access
- Transfer incident ownership for any open items

### On-Call Expectations

**During Your Week**:
- [ ] Be available 24/7 (sleep with phone nearby)
- [ ] Respond to P0 page within 5 minutes
- [ ] Respond to P1 alert within 15 minutes
- [ ] Post status updates on schedule
- [ ] Don't try to solve alone if stuck > 10 min

**After Your Week**:
- [ ] Lead post-mortem for any P0s you handled
- [ ] Complete action items from incident
- [ ] Update runbooks based on learnings

---

## Part 10: Quick Reference Card

### Essential Commands

**Database Connection**:
```bash
psql -h prod-db.company.com -U oncall -d production
```

**Check Database Connections**:
```sql
SELECT count(*) FROM pg_stat_activity;
```

**Find Slow Queries**:
```sql
SELECT query, mean_time FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;
```

**AWS CLI - Describe Instances**:
```bash
aws ec2 describe-instances --region us-east-1
```

**Check Logs in CloudWatch**:
```
fields @timestamp, @message, @logStream
| filter @message like /ERROR/
| stats count() by @logStream
| sort count() desc
```

### Bookmarked URLs

- Grafana: https://grafana.content-engine.local/d/production
- AWS Console: https://console.aws.amazon.com
- Vercel Dashboard: https://vercel.com/dashboard
- Status Page Edit: https://status.content-engine.io/edit
- Jira Incidents: https://jira.company.com/browse/INC

### Contact Information

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| Engineering Manager | [Name] | [Phone] | @[handle] |
| Database DBA | [Name] | [Phone] | @[handle] |
| DevOps Lead | [Name] | [Phone] | @[handle] |
| VP Engineering | [Name] | [Phone] | @[handle] |

---

## Document History
- **Created**: 2026-04-28
- **Last Updated**: 2026-04-28
- **Owner**: Platform Engineering Team
