# Postmortem Template & Process

## Overview

This document provides the template and process for conducting blameless postmortems after incidents. A postmortem is a detailed investigation into what happened, why it happened, and how to prevent it in the future.

**Key Principles**:
- Blameless: Focus on systems and processes, not individuals
- Data-driven: Use facts and evidence, not assumptions
- Actionable: Create concrete prevention and improvement items
- Collaborative: Include all stakeholders and perspectives
- Timely: Conduct within 24 hours of resolution

---

## Part 1: Postmortem Process

### When to Conduct a Postmortem

**Mandatory for**:
- All P0 (Critical) incidents
- P1 incidents with SLO impact
- Any incident with customer impact > 15 minutes
- Any security incident
- Any data loss or corruption
- Any repeat incident (second occurrence of same issue)

**Optional but Recommended for**:
- P1 incidents with significant blast radius
- Incidents with process failures
- Near-miss incidents
- High-complexity incidents

**Not Required for**:
- P2 (Medium) incidents unless pattern emerging
- P3 (Low) incidents
- False alarms (false positives)
- Service incidents outside our control

### Timeline

```
T+0:       Incident resolved, postmortem ticket created
T+2h:      Incident Commander begins timeline document
T+6h:      Initial draft completed with 5-why analysis
T+18h:     Postmortem meeting scheduled (within 24h of resolution)
T+24h:     Postmortem meeting conducted
T+48h:     Action items created and assigned
T+1w:      Action item completion begins
T+4w:      Follow-up verification
```

### Key Participants

**Incident Commander** (Required):
- Leads the postmortem
- Owns timeline document
- Facilitates meeting
- Ensures action items created

**Subject Matter Experts** (Required):
- Engineers involved in investigation
- Engineers involved in remediation
- Database/infrastructure specialists if relevant

**Stakeholders** (Optional but encouraged):
- Engineering Manager
- Product Manager (if customer impact)
- Operations/DevOps lead
- Security officer (if security-related)

### Meeting Format

**Duration**: 45-60 minutes

**Agenda**:
1. Welcome & ground rules (5 min)
2. Timeline walkthrough (15 min)
3. Root cause analysis (15 min)
4. Impact assessment (5 min)
5. Action items discussion (15 min)

**Ground Rules**:
- Blameless - we focus on systems, not people
- Assume good intent
- This is a learning opportunity
- Divergent perspectives are valuable
- All ideas welcome

---

## Part 2: Postmortem Template

### INCIDENT POSTMORTEM REPORT

**Incident ID**: [e.g., INC-3421]  
**Date of Incident**: [YYYY-MM-DD]  
**Date of Postmortem**: [YYYY-MM-DD]  
**Incident Commander**: [Name]  
**Severity Level**: [P0/P1/P2]  

---

### EXECUTIVE SUMMARY

[2-3 sentence summary of what happened, impact, and resolution]

**Example**:
"On April 28 at 14:32 UTC, our database experienced a performance degradation due to a missing index on the transactions table. This caused the API to return 500 errors for 40% of requests for 37 minutes. The incident was resolved by recreating the missing index. Error budget impact: 0.32% of monthly allocation."

---

### INCIDENT TIMELINE

**Format**: [HH:MM UTC] - [Description of event]

```
14:32:00 - Monitoring alert fires: API error rate exceeds 20%
14:32:15 - On-call engineer pages and acknowledges incident
14:33:00 - Incident Slack channel #incident-p0-20260428-1432 created
14:33:30 - Incident commander begins triage
14:35:00 - Engineering manager notified
14:36:00 - Dashboard review shows: error rate 40%, latency normal
14:37:00 - Initial hypothesis: database query performance issue
14:39:00 - Check recent deployments: none in last 6 hours
14:41:00 - Database team joins investigation
14:42:00 - Slow query log reviewed: SELECT * FROM transactions taking 8 seconds
14:44:00 - Root cause identified: missing index on transactions.user_id
14:45:00 - Database team begins creating missing index
14:57:00 - Index creation completed (12 minute process)
15:01:00 - Metrics dashboard shows error rate returned to normal (<0.1%)
15:05:00 - Performance verified, no further errors
15:09:00 - All-clear confirmation, incident resolved
15:15:00 - Incident commander writes initial summary
15:30:00 - Post-mortem ticket created, team notified
```

**How to Collect Timeline**:
1. Incident Commander writes first draft from memory + notes
2. Request participants to review and add missing events
3. Cross-reference with:
   - Monitoring dashboard screenshots
   - Slack conversation thread
   - Application logs
   - Database audit logs
   - PagerDuty notification history
4. Finalize with exact times

---

### ROOT CAUSE ANALYSIS

#### Immediate Cause

**What directly caused the incident?**

[Technical description of the failure]

**Example**:
"The database query `SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10` was missing an index on the `user_id` column. On a table with 50 million rows, this caused a full table scan taking 8 seconds per request, exhausting database connection pool and causing timeouts across the API."

#### Root Cause (5 Why Analysis)

Ask "Why?" 5 times to get to the true root cause:

```
1. Why did the API return 500 errors?
   → Because database queries started timing out

2. Why did database queries start timing out?
   → Because the transactions table query was doing a full table scan

3. Why was the transactions table doing a full table scan?
   → Because the index on user_id was missing

4. Why was the index missing?
   → Because it was dropped during a database schema migration 3 weeks ago

5. Why wasn't it recreated after the migration?
   → Because post-migration testing was done on a small dataset (1000 rows)
     and the missing index didn't cause problems with that data volume
```

**Root Cause Statement**:
"The real root cause is the assumption that performance issues discovered during post-migration testing with limited data would also appear with production data. The missing index wasn't caught because testing used insufficient dataset size."

#### Contributing Factors

**Process issues, design issues, or other factors that contributed**:

- No automated performance regression testing in CI/CD
- Post-deployment validation didn't include large dataset
- No monitoring for newly slow queries
- Database indices not tracked in schema documentation
- Index warnings from database were dismissed as non-critical

---

### IMPACT ASSESSMENT

#### Users Affected
- Estimated number: 15,000 users (40% of active users at peak time)
- Duration of impact: 37 minutes
- Type of impact: Unable to use API, received 500 errors

#### Services Affected
- Primary: API service (all endpoints affected)
- Secondary: Admin dashboard (slow queries)
- Tertiary: Analytics pipeline (delayed data)

#### Business Impact

**Error Budget**:
- Monthly allocation: 43.2 minutes (0.1% downtime)
- Error budget consumed: 0.32% of monthly allocation
- Remaining budget: 99.68%

**Customer Impact**:
- Support tickets received: 8
- Escalations: 0
- Churn/cancellations: 0

**Reputation Impact**:
- Social media mentions: 2 (neutral inquiries)
- Blog posts: 0
- News coverage: None

---

### REMEDIATION ACTIONS TAKEN

**During Incident**:
1. Created missing index on transactions.user_id (T+25 min)
2. Monitored index creation progress
3. Verified metrics returning to normal after index complete

**After Resolution**:
1. Reviewed 10 other tables for similar missing indices (none found)
2. Increased database monitoring to catch slow queries
3. Reviewed query execution plans for top 20 queries
4. Verified backup/restore process still working

---

### PREVENTION & IMPROVEMENT ITEMS

#### Immediate Actions (Due: 2026-05-05)

| ID | Action Item | Owner | Due | Priority |
|-----|-------------|-------|-----|----------|
| TASK-2847 | Implement automated index monitoring in Grafana | DBA Team | 2026-05-05 | High |
| TASK-2848 | Code review: Evaluate query optimization changes | Backend Lead | 2026-05-01 | High |
| TASK-2849 | Create database migration checklist | DBA Team | 2026-05-01 | High |

#### Process Improvements (Due: 2026-05-31)

**Testing & Validation**:
- [ ] Add performance regression testing to CI/CD pipeline
- [ ] Increase post-migration validation dataset to 10% production size
- [ ] Require index creation to be verified in post-migration tests
- [ ] Add automated checks for slow queries in tests

**Monitoring & Detection**:
- [ ] Add alert for missing indices on frequently queried tables
- [ ] Add alert for newly slow queries (baseline comparison)
- [ ] Add index creation/deletion to audit log
- [ ] Create Grafana dashboard for query performance trends

**Documentation & Knowledge**:
- [ ] Document database migration safety procedures
- [ ] Document index naming conventions and tracking
- [ ] Create schema documentation tool
- [ ] Add database best practices guide

#### Architectural Changes (Due: 2026-06-30)

**Long-term Solutions**:
- Implement query plan analysis in CI/CD
- Add automatic index suggestion tool
- Create canary deployment for schema changes
- Implement gradual database schema rollout

---

### LESSONS LEARNED

#### Technical Lessons

1. **Schema Migrations**: Post-deployment validation must use production-scale datasets
   - Small datasets hide performance problems
   - Use representative data distributions
   - Test with realistic query patterns

2. **Index Management**: Critical indices should be automatically monitored
   - Manual index tracking is unreliable
   - Indices are as critical as the data itself
   - Monitor for missing and unused indices

3. **Gradual Rollout**: Database changes should be deployed with feature flags
   - Allows quick rollback if issues detected
   - Enables canary deployment of schema changes
   - Reduces blast radius

#### Process Lessons

4. **Warning Systems**: Database warnings should not be dismissed
   - Warnings are often early indicators of problems
   - Had automated system flagged the missing index earlier
   - Process to review and act on warnings

5. **Escalation**: Better process for involving database expertise earlier
   - Initial triage missed database component (25 min into incident)
   - Should have broader alerting about database issues
   - DBA team should be on-call rotation for P0s

#### Cultural Lessons

6. **Blameless Culture**: Team responded excellently and collaboratively
   - Quick identification of root cause
   - Good communication and updates
   - All hands focused on resolution

---

### FOLLOW-UP SCHEDULE

**24 Hours Post-Incident**:
- [ ] Postmortem meeting completed
- [ ] Action items created in tracking system
- [ ] Team informed of lessons learned

**7 Days Post-Incident**:
- [ ] 30% of action items completed
- [ ] Monitoring improvements deployed
- [ ] Team training completed
- [ ] Process improvements documented

**30 Days Post-Incident**:
- [ ] 100% of immediate action items completed
- [ ] Code review completed (PR merged or closed)
- [ ] Testing improvements in next deployment
- [ ] Post-mortem marked complete

**90 Days Post-Incident**:
- [ ] Long-term architectural changes planned
- [ ] Team still remembering lessons learned
- [ ] Similar incidents prevented (verify no repeat)

---

## Part 3: Postmortem Meeting Checklist

### Before the Meeting (Incident Commander)

- [ ] Collect timeline from all participants
- [ ] Draft 5-why analysis
- [ ] Document impact assessment
- [ ] Identify preliminary action items
- [ ] Schedule meeting within 24 hours of resolution
- [ ] Send agenda and initial doc to participants (2 hours before)
- [ ] Allow time for people to review before meeting

### During the Meeting

**First 5 minutes**:
- [ ] Welcome and explain purpose (blameless postmortem)
- [ ] Review agenda
- [ ] Confirm all participants can speak freely

**Timeline Walkthrough (15 min)**:
- [ ] Walk through chronological events
- [ ] Ask "what did you see/do at this point?"
- [ ] Fill in any gaps
- [ ] Verify timestamps with evidence

**Root Cause Analysis (15 min)**:
- [ ] Review 5-why analysis
- [ ] Ask if team agrees with root cause
- [ ] Explore alternative perspectives
- [ ] Update 5-whys if new insights emerge
- [ ] Distinguish between immediate cause and root cause

**Impact Assessment (5 min)**:
- [ ] Confirm user impact numbers
- [ ] Discuss business impact
- [ ] Note any unexpected effects

**Action Items (15 min)**:
- [ ] Brainstorm prevention options
- [ ] Prioritize action items
- [ ] Assign owners and due dates
- [ ] Ensure items are specific and measurable
- [ ] Create Jira tickets before meeting ends

### After the Meeting

- [ ] Send summary to team and stakeholders
- [ ] Upload final postmortem document to wiki
- [ ] Create Jira tickets for action items
- [ ] Add to incident history archive
- [ ] Schedule 1-week follow-up check-in

---

## Part 4: Common Root Cause Patterns

### Pattern 1: Inadequate Testing

**Symptom**: Issue appears after production deployment that should have been caught in testing

**Root Cause**: Test scenarios insufficient or dataset too small

**Prevention**:
- Use production-like data in tests (volume, distribution)
- Test with expected query patterns
- Automated performance regression tests
- Production traffic replay/shadowing

**Example**: Missing database index (this incident)

---

### Pattern 2: Knowledge Loss

**Symptom**: Issue related to undocumented system design or configuration

**Root Cause**: Critical knowledge exists only in one person's head or in old Slack messages

**Prevention**:
- Document critical systems and procedures
- Pair programming on critical areas
- Architecture decision records (ADR)
- Regular knowledge sharing sessions

**Example**: Webhook secret rotation process

---

### Pattern 3: Configuration Drift

**Symptom**: Configuration doesn't match expected state, causing errors

**Root Cause**: Manual configuration changes without tracking or verification

**Prevention**:
- Infrastructure as Code (IaC) for all configuration
- No manual changes allowed
- Automated drift detection
- Regular audit of actual vs. desired state

**Example**: Rate limit threshold changed manually, not reflected in code

---

### Pattern 4: Alert Fatigue

**Symptom**: Critical alert ignored because of too many false positives

**Root Cause**: Poor alert tuning or excessive alerting for non-critical issues

**Prevention**:
- Alert on actionable issues only (not just thresholds)
- Tune alert thresholds based on actual data
- Track alert accuracy (false positive rate)
- Regularly review and disable non-useful alerts

**Example**: Database warning about missing indices dismissed as noise

---

### Pattern 5: Cascade Failure

**Symptom**: Single component failure causes widespread outage

**Root Cause**: System not designed for graceful degradation

**Prevention**:
- Circuit breakers for external dependencies
- Timeout handling and retries
- Feature flags for gradual rollout
- Load shedding and rate limiting

**Example**: CAPTCHA service unavailable causes signup to fail completely

---

## Part 5: Postmortem Document Structure

### Recommended Document Format

```markdown
# Postmortem: [Brief Incident Title]

**Incident ID**: [INC-####]
**Date**: [YYYY-MM-DD]
**Severity**: [P0/P1/P2]
**Duration**: [X minutes]

## Executive Summary
[2-3 sentence overview]

## Timeline
[Chronological list of events]

## Root Cause Analysis
[5-why analysis and root cause statement]

## Impact
[Numbers: users, duration, budget, support tickets]

## Remediation
[What was done to fix the incident]

## Prevention
[Action items to prevent recurrence]

## Lessons Learned
[Key insights for the team]

## Action Items
[Table of items with owners and due dates]

## Follow-up Schedule
[Dates for verification and closeout]
```

---

## Part 6: Postmortem FAQs

**Q: What if we don't know the root cause?**
A: Document what you investigated, what you ruled out, and what remains uncertain. Schedule follow-up investigation if critical. Don't force a conclusion.

**Q: What if the same incident happens again?**
A: This is a metric of failed prevention. Review the action items from the previous postmortem. Escalate to management. Consider if prevention was actually implemented.

**Q: Should we blame specific people?**
A: Never. Focus on systems, processes, and designs. Ask "how could we design this so this failure is less likely?" not "who made the mistake?"

**Q: What if there's disagreement about root cause?**
A: Document multiple theories. Investigate which is correct. Sometimes multiple factors contributed equally.

**Q: How do we know if prevention worked?**
A: Monitor the metric that the action item targeted. If you created index monitoring, verify the dashboard is in use. Set explicit success criteria.

---

## Document History
- **Created**: 2026-04-28
- **Last Updated**: 2026-04-28
- **Owner**: Platform Engineering Team
