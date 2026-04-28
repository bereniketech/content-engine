# Cost Optimization Checklist

**Last Updated:** April 28, 2026  
**Review Schedule:** Quarterly  
**Owner:** Engineering Lead + Finance

---

## Quarterly Cost Review Process

### Purpose
Establish a systematic quarterly review process to identify cost optimization opportunities, track implementation progress, and ensure infrastructure investments align with business growth.

### When: First Week of Each Quarter
- **Q1 2026:** January 28 (past)
- **Q2 2026:** April 28 ✓ **TODAY**
- **Q3 2026:** July 28 (upcoming)
- **Q4 2026:** October 28 (upcoming)

---

## Pre-Review Checklist (1 Week Before Meeting)

### Data Collection (Days 1-2)

- [ ] **Supabase** - Export usage report
  - [ ] Login to dashboard.supabase.io
  - [ ] Navigate to Usage section
  - [ ] Export database size, connections, API requests
  - [ ] Note any plan limits approaching

- [ ] **Upstash Redis** - Download billing data
  - [ ] Login to console.upstash.io
  - [ ] Export monthly costs
  - [ ] Document memory usage peaks
  - [ ] Review eviction rates

- [ ] **Sentry** - Export metrics
  - [ ] Login to sentry.io
  - [ ] Generate usage report (Project Settings > Billing)
  - [ ] Document error count and data usage
  - [ ] Review quota remaining

- [ ] **Anthropic API** - Export usage logs
  - [ ] Login to console.anthropic.com
  - [ ] Download usage report for quarter
  - [ ] Document tokens, requests, cost by model
  - [ ] Calculate average cost per request
  - [ ] Track cache hit rate trends

- [ ] **Vercel** - Export deployment metrics
  - [ ] Login to vercel.com
  - [ ] Go to Team Settings > Billing
  - [ ] Export monthly costs and usage
  - [ ] Document function execution hours
  - [ ] Note data transfer usage

- [ ] **Google Cloud APIs** - Export usage
  - [ ] Login to console.cloud.google.com
  - [ ] Check Gemini API usage (if applicable)
  - [ ] Document image generation volume
  - [ ] Review cost trends

### Analysis (Days 3-4)

- [ ] **Calculate cost changes:**
  - [ ] Month-over-month variance
  - [ ] Quarter-over-quarter trend
  - [ ] Year-to-date comparison
  - [ ] Per-user cost trend

- [ ] **Identify cost drivers:**
  - [ ] Which services grew fastest?
  - [ ] Were growth rates expected?
  - [ ] What features drove cost increases?
  - [ ] Any one-time costs?

- [ ] **Review optimization opportunities:**
  - [ ] Check previous quarter's recommendations
  - [ ] Measure actual savings achieved
  - [ ] Identify new opportunities
  - [ ] Prioritize by potential impact

- [ ] **Create presentation slides:**
  - [ ] Cost breakdown pie chart
  - [ ] Trend graphs (6-month history)
  - [ ] Cost per user trend
  - [ ] Variance analysis
  - [ ] Recommended actions

### Communication (Day 5)

- [ ] **Notify team** of upcoming review meeting
- [ ] **Schedule meeting** with stakeholders
- [ ] **Distribute pre-read materials** 24 hours before
- [ ] **Confirm attendance** and timezone

---

## Quarterly Review Meeting Agenda

**Duration:** 1 hour  
**Participants:** Engineering Lead, Finance, Product Lead, CTO

### 1. Current State Summary (10 min)

**Talking Points:**
- Total infrastructure cost this quarter
- Month-over-month trend
- Comparison to budget/forecast
- Variance explanation

**Sample Script:**
> "This quarter cost us $9,600 total, averaging $3,200 per month. That's a 10% increase from Q1, primarily driven by Anthropic API usage which grew 18% as we added new features. Let me break this down by service..."

**Visuals:**
- Pie chart: cost by service
- Line chart: monthly trends

### 2. Cost Drivers Analysis (15 min)

**By Service:**

**Anthropic API ($2,500/month avg)**
- Cache hit ratio: 35% (target: 60%)
- Average request cost: $0.12
- Model distribution: 85% Sonnet, 15% Haiku
- Volume change: +15% QoQ

**Question:** Should we be more aggressive moving work to Haiku?

---

**Supabase ($200/month avg)**
- Database size: 22GB (was 18GB last quarter)
- Growth rate: 4GB/quarter
- Connections: Peak 30/sec (plenty of headroom)
- Current plan: $200/month tier

**Question:** Trajectory to 100GB plan threshold (18 months out)?

---

**Vercel ($200/month avg)**
- Daily API requests: 550k avg
- Peak requests/sec: 8 req/s
- Function execution: 80 hours/month
- Percent of Pro plan limit: 1.5% (plenty of headroom)

**Question:** Any opportunities to offload work to edge?

---

**Sentry ($100/month avg)**
- Monthly data volume: 2.5GB (of 10GB quota)
- Error volume: 8k errors/month
- Cost per error: $0.012

**Question:** Can we filter more noise or increase alert thresholds?

---

**Upstash Redis ($50/month avg)**
- Memory usage: 85MB peak (of 256MB)
- Hit ratio: 82% (good)
- Eviction rate: <0.5% daily (healthy)

**Question:** Any cache strategy improvements?

---

### 3. Optimization Opportunities (20 min)

**Review Previous Quarter's Recommendations:**

| Opportunity | Est. Savings | Status | Actual Savings |
|-------------|-------------|--------|-----------------|
| Anthropic cache optimization | $500/mo | In progress | $0 (delayed) |
| Request deduplication | $200/mo | Not started | $0 |
| Haiku model routing | $300/mo | Not started | $0 |
| DB read replicas | $100/mo | Researching | $0 |

**Why is progress slow?** → Discuss blockers

**New Opportunities Identified This Quarter:**

| Opportunity | Est. Savings | Effort | Priority | Owner | Timeline |
|-------------|-------------|--------|----------|-------|----------|
| Anthropic batch API | $200-400/mo | High | High | @backend-lead | 4 weeks |
| Image caching | $50-100/mo | Low | Medium | @backend | 1 week |
| Sentry error filtering | $20-30/mo | Low | Low | @backend | 2 days |
| DB query optimization | $50/mo + perf | Medium | High | @dba | Ongoing |

**Recommendation:** Prioritize cache optimization (highest ROI, enables other savings)

---

### 4. Growth and Forecasting (10 min)

**Projected Costs by Growth Scenario:**

| Scenario | 3-mo | 6-mo | 12-mo | Actions |
|----------|------|------|-------|---------|
| Conservative (15%/mo) | $3,600 | $4,200 | $5,300 | Monitor |
| Aggressive (25%/mo) | $4,200 | $5,500 | $7,800 | Plan upgrades Q4 |
| Hyperscale (35%/mo) | $4,800 | $7,200 | $12,000+ | Aggressive optimization needed |

**Budget Recommendation:** Set budget at $4,500/month for next quarter

**Contingency:** If aggressive growth occurs, allocate $3k for infrastructure upgrades

---

### 5. Action Items & Next Steps (5 min)

**Decisions Made:**
- [ ] Approved optimization initiatives
- [ ] Budget for next quarter
- [ ] Timeline for major changes
- [ ] Escalation path for anomalies

**Sample Action Items:**
1. **@backend-lead:** Implement Anthropic cache optimization (4 weeks)
2. **@finance:** Investigate negotiated pricing with Anthropic
3. **@backend:** Implement Sentry error filtering (2 days)
4. **@dba:** Top 5 slow queries optimization (ongoing)
5. **@all:** Review quarterly cost summary next Friday

**Next Review:** July 28, 2026 (10:00 AM PT)

---

## Post-Review Actions (Within 1 Week)

### Documentation Updates

- [ ] **Update cost-analysis.md:**
  - [ ] New actual costs from this quarter
  - [ ] Updated projections
  - [ ] Completed optimization opportunities
  - [ ] New cost drivers

- [ ] **Update capacity-planning.md:**
  - [ ] Database size trajectory
  - [ ] API request growth rate
  - [ ] Cache usage trends
  - [ ] Updated scaling timeline

- [ ] **Create quarterly summary:**
  - [ ] File: `docs/quarterly-cost-review-Q2-2026.md`
  - [ ] Include discussion notes
  - [ ] Cost trends with graphs
  - [ ] Optimization results
  - [ ] Approved action items

### Team Communication

- [ ] **Share summary with team:**
  - [ ] Email with key findings
  - [ ] Link to detailed docs
  - [ ] Upcoming changes and impacts

- [ ] **Update monitoring/alerts:**
  - [ ] Adjust thresholds if needed
  - [ ] Add new metrics
  - [ ] Configure escalation paths

### Budget Adjustments

- [ ] **Update financial forecasts**
- [ ] **Adjust budget allocation** for next quarter
- [ ] **Set contingency budget** for unexpected growth
- [ ] **Review contract renewal dates** (Anthropic, etc.)

---

## Automation Optimization Opportunities

### High Priority (Do This Quarter)

#### 1. Anthropic Prompt Caching
**Potential Savings:** $500-1,000/month  
**Implementation Effort:** 4-6 weeks

**Current State:**
- Cache hit rate: 35%
- Main prompts: System prompts, content templates, brand guidelines
- Caching potential: 60%+ of requests (system prompts repeat)

**Action Items:**
```markdown
- [ ] Profile top 20 most-used system prompts
- [ ] Identify caching opportunities (static content, brand rules)
- [ ] Implement cache-aware request wrapper
- [ ] Test cache hit rate improvement
- [ ] Monitor and adjust TTL values
- [ ] Document caching strategy
- [ ] Train team on best practices

Timeline: Complete by June 30, 2026
Owner: @backend-lead
Success Metric: Hit rate >60% within 4 weeks
```

**Code Example:**
```javascript
// Cache system prompts to improve hit ratio
const cacheKey = createPromptHash(systemPrompt, userContext);
const cached = await redis.get(cacheKey);

if (cached) {
  // Cache hit - use cached Claude response
  return cached.value;
} else {
  // Cache miss - call Claude and store result
  const response = await claude.messages.create({
    system: systemPrompt,
    // ... rest of request
  });
  
  // Cache for 24 hours
  await redis.setex(cacheKey, 86400, response);
  return response;
}
```

---

#### 2. Request Deduplication
**Potential Savings:** $200-400/month  
**Implementation Effort:** 2-3 weeks

**Current State:**
- No deduplication currently
- Estimated 10-15% duplicate requests
- Lost savings: $20-60/day

**Action Items:**
```markdown
- [ ] Implement request fingerprinting (MD5 hash)
- [ ] Add Redis-backed deduplication cache (6-hour TTL)
- [ ] Integrate into content generation pipeline
- [ ] Monitor deduplication metrics
- [ ] Adjust TTL based on results
- [ ] Document request patterns

Timeline: Complete by June 15, 2026
Owner: @backend
Success Metric: 10%+ duplicate request elimination
```

---

#### 3. Model Routing (Sonnet vs. Haiku)
**Potential Savings:** $200-600/month  
**Implementation Effort:** 2-4 weeks

**Current State:**
- All requests use Claude 3.5 Sonnet
- Haiku is 80% cheaper for same-quality tasks
- 30-40% of work is suitable for Haiku

**Suitable Haiku Tasks:**
- Content classification
- Text formatting
- Metadata extraction
- Simple summarization
- Keyword analysis

**Action Items:**
```markdown
- [ ] Create task complexity scoring function
- [ ] Route "simple" tasks to Haiku
- [ ] A/B test quality impact
- [ ] Monitor cost savings
- [ ] Adjust routing thresholds
- [ ] Train team on routing logic

Timeline: Complete by June 30, 2026
Owner: @backend + @product
Success Metric: 30% of tasks on Haiku, <5% quality diff
```

---

#### 4. Batch Processing
**Potential Savings:** $200-300/month  
**Implementation Effort:** 3-4 weeks

**Opportunity:**
- Batch API: 50% discount on input tokens
- Suitable for: Async processing, reporting, analytics
- Current volume: ~2k/day eligible for batching

**Action Items:**
```markdown
- [ ] Identify batch-eligible work (non-interactive)
- [ ] Implement batch queue system (using Inngest)
- [ ] Configure batch API integration
- [ ] Set up result retrieval mechanism
- [ ] Monitor batch success rates
- [ ] Alert on failed batches

Timeline: Complete by July 15, 2026
Owner: @backend
Success Metric: 20% of work via batch API, 50% cost reduction
```

---

### Medium Priority (Next Quarter)

#### 5. Database Query Optimization
**Potential Savings:** $50-100/month + performance  
**Implementation Effort:** Ongoing

**Actions:**
```markdown
- [ ] Run EXPLAIN ANALYZE on slow queries
- [ ] Add missing indexes
- [ ] Remove SELECT * patterns
- [ ] Implement connection pooling
- [ ] Cache frequently-accessed data
- [ ] Monitor slow query log weekly

Timeline: Ongoing
Owner: @dba
Success Metric: P95 query time <50ms
```

---

#### 6. Cache Hit Ratio Improvement
**Potential Savings:** $30-80/month  
**Implementation Effort:** 2-3 weeks

**Current State:**
- Redis hit ratio: 82% (good)
- Opportunity: Increase to >90%
- Methods: Cache warming, longer TTLs, pre-computation

**Actions:**
```markdown
- [ ] Implement cache warming on startup
- [ ] Increase TTLs for stable data
- [ ] Pre-compute frequent queries
- [ ] Monitor eviction rates
- [ ] Alert on hit ratio drops
```

---

#### 7. Image Optimization
**Potential Savings:** $30-50/month  
**Implementation Effort:** 1-2 weeks

**Actions:**
```markdown
- [ ] Cache generated images (CDN)
- [ ] Batch similar image requests
- [ ] Implement image size limits
- [ ] Evaluate Stability AI vs. Gemini
```

---

### Lower Priority (Later)

#### 8. Sentry Optimization
**Potential Savings:** $20-30/month  
**Implementation Effort:** 1 week

**Actions:**
```markdown
- [ ] Implement client-side error filtering
- [ ] Increase alert thresholds
- [ ] Aggregate similar errors
- [ ] Archive old error data
```

---

## Negotiation Strategies with Providers

### Anthropic (Current: $2,500-5,000/month)

**Negotiation Leverage:**
- Volume: Currently $30k+/year, growing 20%/month
- Predictability: High (can forecast 6-12 months)
- Growth potential: Could reach $60k+/year

**Negotiation Timeline:**
- Reach out at: $50k/year ARR (~5 months from now)
- Prepare: 3-month usage history, growth forecast
- Request: Volume discount (15-25% at that level)

**Talking Points:**
```
"We're growing 20% month-over-month and project reaching 
$50k/year spending in Q3 2026. Can we discuss volume pricing?"
```

**Expected Outcome:** 15-20% discount = $750-1000/month savings

---

### Supabase (Current: $200/month)

**Leverage Point:** When database approaches 500GB

**Negotiation:**
- Direct contact: supabase sales
- Propose: Custom plan with dedicated support
- Timeline: Q4 2026 or when >500GB

**Expected Outcome:** 15-25% discount on custom tier

---

### Vercel (Current: $200/month)

**Leverage Point:** At >50M requests/month

**Negotiation:**
- When: Q1 2027 (estimated)
- Propose: Enterprise tier with better SLA
- Timeline: 2-3 months advance notice

---

## Reserved Capacity Options

### Should We Pre-Commit?

**Analysis by Provider:**

#### Anthropic
- **Annual commitment:** 15-20% discount
- **Annual cost:** $30k-60k (depends on growth)
- **Recommendation:** Wait until 3-month minimum spend >$3k/month
- **Timeline:** Review in July 2026

#### Supabase
- **Monthly commitment:** 10-15% discount
- **Risk:** Low (we own the data)
- **Recommendation:** Month-to-month until >500GB

#### Vercel
- **Monthly commitment:** No discount available
- **Recommendation:** Pro plan is optimal

### Reserved Capacity Decision Table

| Provider | Commitment | Discount | Min Spend | Recommended |
|----------|-----------|----------|-----------|-------------|
| Anthropic | 1-year | 20% | $36k/year | Wait until Q3 2026 |
| Supabase | Month-to-month | None | N/A | Stay flexible |
| Vercel | None | 0% | N/A | Current tier optimal |
| Google Cloud | 1-year | 25% | $3k+/year | If using heavily |

---

## Budget Alerts and Controls

### Alert Configuration

**Set up automated alerts in each provider:**

#### Anthropic
```
Daily Budget Alert: $150/day (→ $4,500/month)
Weekly Trend Alert: If >20% growth week-over-week
Monthly Overage Alert: If cost exceeds $5,500
```

**Response:** Investigate if alert triggers

#### Supabase
```
Database Size Alert: >40GB (plan scaling)
Connection Alert: >50 concurrent (optimization needed)
Daily Cost Alert: >$8/day
```

#### Vercel
```
Daily Request Alert: >1M/day (traffic spike)
Daily Cost Alert: >$10/day
Function Duration Alert: >120 hours/month
```

#### Upstash
```
Memory Alert: >200MB (plan upgrade needed)
Daily Cost Alert: >$2/day
Hit Ratio Alert: <75% (cache strategy needed)
```

#### Sentry
```
Monthly Data Alert: >8GB (of 10GB quota)
Error Rate Alert: >50 errors/minute
```

### Manual Review Triggers

**Escalate to CTO if any of these occur:**

- [ ] Any service cost increases >30% month-over-month
- [ ] Total infrastructure cost exceeds $6,000/month
- [ ] Two or more services exceed budget simultaneously
- [ ] Cost growth significantly outpaces user growth (>ratio of 2:1)
- [ ] Unexpected cost spike >$500 in any single day

**Response Protocol:**
1. Investigate within 2 hours
2. Brief CTO within 4 hours
3. Implement remediation within 24 hours
4. Post-mortem within 1 week

---

## Monthly Maintenance Checklist

**First Friday of Each Month:**

- [ ] **Verify costs:**
  - [ ] Check all provider bills arrived
  - [ ] Compare to budget
  - [ ] Flag any anomalies >10%

- [ ] **Monitor metrics:**
  - [ ] Database growth rate
  - [ ] Cache hit ratio
  - [ ] API error rate
  - [ ] Request volume trend

- [ ] **Review optimization progress:**
  - [ ] Track savings from completed initiatives
  - [ ] Update timeline for in-progress work
  - [ ] Identify blockers

- [ ] **Update forecasts:**
  - [ ] Project this month + next 2 months
  - [ ] Adjust growth assumptions if needed
  - [ ] Alert if >10% variance from forecast

- [ ] **Team communication:**
  - [ ] Share cost summary in Slack
  - [ ] Highlight any concerns
  - [ ] Recognize good optimization work

---

## Cost Optimization Wins Tracking

**Document completed optimizations:**

| Initiative | Completed | Est. Savings | Actual Savings | Timeline |
|-----------|-----------|-------------|-----------------|----------|
| Anthropic cache optimization | ✓ Jun 2026 | $500/mo | $520/mo | 4 weeks |
| Request deduplication | ✓ Jun 2026 | $200/mo | $180/mo | 2 weeks |
| Haiku routing | ✓ Jul 2026 | $300/mo | $280/mo | 4 weeks |
| DB query optimization | In progress | $50/mo | $15/mo | Ongoing |

**Total Realized Savings (Q2-Q3 2026):** $995/month

**Total Remaining Opportunities:** $300-500/month

---

## Emergency Cost Control Procedures

### If Monthly Cost Spike Detected (>30%)

**Immediate (within 1 hour):**
1. Identify root cause
2. Check for runaway API calls or errors
3. Review recent deployments for regressions

**Short-term (within 4 hours):**
1. Implement temporary safeguards
   - Rate limit API calls if needed
   - Pause non-essential features
   - Reduce cache TTLs temporarily
2. Notify team and leadership
3. Begin detailed investigation

**Long-term (within 24 hours):**
1. Implement permanent fix
2. Add monitoring to prevent recurrence
3. Schedule post-mortem meeting
4. Document lesson learned

**Example:** If Anthropic costs spike to $200/day
```javascript
// Temporary safeguard
if (dailyCost > 150) {
  // Pause non-critical features
  FEATURE_FLAGS.image_generation = false;
  FEATURE_FLAGS.experimental_analysis = false;
  
  // Alert team
  sendSlackAlert('Cost spike detected: $200/day');
}
```

---

## Resources and Tools

### Monitoring Dashboards

- **Anthropic:** https://console.anthropic.com/usage
- **Supabase:** https://supabase.io/dashboard
- **Vercel:** https://vercel.com/dashboard
- **Upstash:** https://console.upstash.io
- **Sentry:** https://sentry.io/organizations/

### Documentation Linked

- Related: `cost-analysis.md` (detailed cost breakdown)
- Related: `capacity-planning.md` (infrastructure scaling)
- Related: `performance-budget.md` (performance metrics)

### Key Contacts

- **Anthropic Support:** api-support@anthropic.com
- **Supabase Support:** support@supabase.io
- **Vercel Support:** support@vercel.com
- **Finance Lead:** [to be assigned]
- **Engineering Lead:** [to be assigned]

---

## Sign-Off

**Q2 2026 Review Approved:**

- [ ] Engineering Lead: __________ Date: __________
- [ ] Finance Lead: __________ Date: __________
- [ ] CTO: __________ Date: __________

**Next Review:** July 28, 2026  
**Owner:** Engineering Lead + Finance  
**Last Updated:** April 28, 2026
