---
task: 031
feature: stability-roadmap
status: COMPLETE
completed_at: 2026-04-28T19:30:00Z
model: haiku
supervisor: software-cto
agent: security-reviewer
depends_on: [task-029]
---

# Task 031: Establish incident response and postmortem procedures

## Skills
- .kit/skills/security-defensive/incident-response-playbook/SKILL.md
- .kit/skills/devops/terminal-cli-devops/SKILL.md

## Agents
- @security-reviewer

## Commands
- /verify

---

## Objective
Create incident response procedures, escalation policies, communication templates, and postmortem processes to handle production incidents systematically.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `docs/INCIDENT_RESPONSE.md` | Incident response procedures and escalation |
| `docs/POSTMORTEM_TEMPLATE.md` | Postmortem meeting structure and findings doc |
| `docs/COMMUNICATION_TEMPLATES.md` | Status page and notification templates |

---

## Dependencies
- Depends on: task-029 (production deployment complete)

---

## Code Templates

### `docs/INCIDENT_RESPONSE.md`

```markdown
# Incident Response Procedure

## Incident Severity Levels

### Severity 1 — Critical (Page immediately)
- Production down or completely unavailable
- Data loss or corruption
- Security breach in progress
- Major revenue impact

**Response Time:** < 5 minutes
**Stakeholders:** Engineering, Security, CTO, CEO

### Severity 2 — High (Page in <15 minutes)
- Major feature unavailable
- Significant performance degradation
- Customer-facing errors for >1% of users

**Response Time:** < 15 minutes
**Stakeholders:** Engineering, On-Call, Product

### Severity 3 — Medium (Alert, no page)
- Minor features affected
- Performance issues affecting <1% users
- Non-critical service errors

**Response Time:** < 1 hour
**Stakeholders:** Engineering team

### Severity 4 — Low (Ticket)
- Documentation issues
- Minor UX issues
- Non-urgent improvements

**Response Time:** Next sprint
**Stakeholders:** Engineering backlog

## Incident Response Flow

### 1. Detection & Initial Response (0-5 min)

1. **Detect:** Alert triggered in Prometheus/Grafana
2. **Acknowledge:** On-call engineer acknowledges within 5 min
3. **Assess:** Determine severity level
4. **Notify:**
   - Severity 1: Page all stakeholders
   - Severity 2: Page on-call + product
   - Severity 3-4: Slack channel update

### 2. Triage & Investigation (5-20 min)

1. **Open war room:** Slack channel (e.g., #incident-2024-04-28-001)
2. **Assign roles:**
   - Incident Commander (IC): Coordinates response
   - Technical Lead: Investigates root cause
   - Communications: Updates status page + stakeholders
3. **Gather facts:**
   - Timeline: When did alert fire?
   - Scope: Which users/features affected?
   - Signals: Error logs, metrics, recent changes
4. **Document:** Post findings in incident channel

### 3. Mitigation (20-60 min)

**Option A: Quick Workaround**
- Revert recent deployment
- Scale resources
- Bypass failing component
- Enable fallback behavior

**Option B: Fix & Deploy**
- If fix < 30 min: implement + test + deploy
- If fix > 30 min: proceed to Option A

### 4. Resolution & Recovery (60+ min)

1. **Verify:** Health checks pass, errors cleared
2. **Monitor:** Watch metrics for 15+ minutes
3. **Scale down:** Return to normal resource levels
4. **Notify:** Mark incident as resolved in status page
5. **Schedule postmortem:** Within 24 hours

## Escalation Policy

```
On-Call Engineer (5 min)
        ↓ (if not resolved in 15 min)
Technical Lead + Product Manager
        ↓ (if not resolved in 30 min)
Software CTO
        ↓ (if Severity 1)
CEO + Board notification
```

## Communication During Incident

### Initial (within 5 min)
"We are investigating an incident affecting [feature]. We will provide updates every 10 minutes."

### Update (every 10 min)
"Status: [Investigating/Mitigating/Resolved]. Estimated resolution: [time]. Affected users: [%]."

### Resolution
"The incident has been resolved. Services are operating normally. Postmortem scheduled for [date/time]."

## Post-Incident (24-48 hours after resolution)

1. Schedule postmortem meeting (1 hour)
2. Invite: IC, Technical Lead, On-Call, Product, CTO
3. Review timeline, root cause, preventive measures
4. Document findings in postmortem template
5. Create follow-up tasks in engineering backlog
6. Share summary with broader team
```

### `docs/POSTMORTEM_TEMPLATE.md`

```markdown
# Incident Postmortem

**Incident ID:** [incident-2024-04-28-001]
**Date:** 2024-04-28
**Duration:** 45 minutes (17:30 - 18:15 UTC)
**Severity:** 1 - Critical
**Postmortem Date:** 2024-04-29

## Summary

Brief paragraph (2-3 sentences) of what happened and impact.

## Timeline

| Time | Event |
|------|-------|
| 17:30 | Alert fired: Error rate > 1% |
| 17:33 | On-call acknowledged, war room opened |
| 17:35 | Root cause identified: Database connection pool exhausted |
| 17:40 | Mitigation: Scaled database to 32 connections |
| 17:45 | Verified: Errors cleared, health checks passing |
| 18:15 | Incident resolved, all services normal |

## Root Cause

A recent code deployment introduced N+1 query patterns in the content generation endpoint. Under increased load from a marketing campaign, the database connection pool (20 connections) was exhausted, causing all requests to fail with 503 errors.

## Contributing Factors

1. No code review for N+1 query patterns (could be automated)
2. Load tests on staging did not reflect real-world traffic patterns
3. Database query profiling not part of deployment checklist
4. No monitoring on connection pool usage before incident

## Impact

- **Duration:** 45 minutes
- **Users Affected:** ~15,000 (8% of daily actives)
- **Requests Failed:** ~12,000
- **Revenue Impact:** ~$2,400 (estimated)

## Resolution

1. Reverted problematic deployment to v1.2.3 (07:40)
2. Scaled database connection pool: 20 → 32 connections (temporary)
3. Verified error rates returned to baseline within 5 minutes

## Preventive Actions

| Action | Owner | Target Date | Priority |
|--------|-------|-------------|----------|
| Add N+1 query detection to CI/CD linting | @architect | 2024-05-05 | P0 |
| Create code review checklist for database queries | @lead | 2024-05-05 | P0 |
| Add connection pool monitoring + alert | @devops | 2024-05-10 | P0 |
| Increase load test traffic volume by 3x | @qa | 2024-05-12 | P1 |
| Implement query profiling in staging | @backend | 2024-05-15 | P1 |

## Lessons Learned

1. ✅ Alert system worked well; on-call responded quickly
2. ❌ N+1 queries not caught in code review or tests
3. ❌ Database metrics not monitored at connection level
4. ✅ Rollback procedure was smooth and clear

## Action Items

- [ ] Create task: Implement N+1 query linter
- [ ] Create task: Add connection pool monitoring
- [ ] Update code review checklist
- [ ] Schedule database optimization sprint
- [ ] Review marketing campaign impact on infrastructure

**Postmortem Owner:** [Name]
**Approved By:** [CTO]
```

### `docs/COMMUNICATION_TEMPLATES.md`

```markdown
# Communication Templates

## Status Page Template

### Major Incident (Severity 1-2)

**[INVESTIGATING] Content Generation Service Degradation**

We are currently investigating increased error rates affecting our content generation service. Users may experience timeouts or errors when generating content.

**Start Time:** 17:30 UTC
**Current Status:** Investigating root cause
**Latest Update:** Identified database connection exhaustion; implementing mitigation
**Updates:** Every 10 minutes

---

**[IDENTIFIED] Root cause: Database Connection Pool Exhaustion**

We have identified the root cause as a recent code deployment that introduced inefficient database queries. We are rolling back the deployment.

**Estimated Resolution:** 18:00 UTC

---

**[RESOLVED] Service Restored**

The service is now operating normally. All users can resume using content generation. We will provide a full postmortem within 24 hours.

**Resolution Time:** 18:15 UTC
**Duration:** 45 minutes

## Slack Channel Template

### Initial Detection

```
:alert: **INCIDENT DETECTED**
Severity: 1 - CRITICAL
Alert: Error rate > 1%
Time: 2024-04-28 17:30 UTC

Slack channel: #incident-2024-04-28-001
War room link: [Zoom URL]

On-call: @[name]
```

### Status Update

```
:hourglass: **INCIDENT UPDATE** (45 min in)
Status: Mitigating
Root Cause: Database connection pool exhausted (N+1 queries in recent deploy)
Action: Rolling back to v1.2.3
ETA: 5 minutes
```

### Resolution

```
:white_check_mark: **INCIDENT RESOLVED**
Duration: 45 minutes
Impact: ~15,000 users, ~$2,400 revenue
Root Cause: N+1 query patterns not caught in code review
Postmortem: Tomorrow 10am UTC (meeting invite sent)
```

## Customer Notification Email

Subject: **Service Incident Notification — Content Engine**

Dear Valued Customers,

We experienced a service incident on April 28, 2024 from 17:30-18:15 UTC affecting our content generation service.

**What Happened:** A recent code deployment introduced database query inefficiencies that caused our connection pool to exhaust under peak load.

**Impact:** Approximately 8% of our daily active users experienced errors during this 45-minute window.

**What We Did:** We identified the root cause, rolled back the problematic code, and verified service recovery.

**What We're Doing Next:** We are implementing preventive measures including N+1 query detection in our code review process and enhanced database monitoring.

We apologize for the disruption and appreciate your patience while we resolved the issue.

Best regards,
[Company Name] Engineering Team
```

---

## Handoff to Next Task
_(fill via /task-handoff)_
