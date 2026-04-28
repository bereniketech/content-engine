# Capacity Planning and Growth Projections

**Last Updated:** April 28, 2026  
**Planning Horizon:** 12 months  
**Next Review:** July 28, 2026

---

## Executive Summary

The AI Content Engine is designed to scale to **100k users and 5M+ daily requests** across current infrastructure. Based on current growth rates (15-25%/month), the system will approach scaling boundaries around **Q4 2026-Q1 2027**. Proactive capacity planning ensures uninterrupted service and enables informed infrastructure decisions.

---

## Current System Capacity

### Database (Supabase PostgreSQL)

**Current Specifications:**
- Allocated storage: 100GB (Pro plan limit)
- Current usage: ~15-20GB (~18%)
- Connection pool: 20-30 concurrent connections
- Query performance: P95 <100ms

**Capacity Limits:**
- Hard limit: 500GB database size
- Practical limit: 50-100GB before needing optimization
- Concurrent connections: 100+ sustainable
- Max request throughput: 10k requests/second theoretical

**Headroom Analysis:**
- Storage: 80-85GB remaining (4-5 month buffer at 10GB/month growth)
- Connections: Room for 5-10x current growth
- Query performance: Current optimization maintains <100ms P95

**Key Performance Indicators:**
```
Current State:
- Database size: 18GB
- Daily requests: 500k-600k
- Peak concurrent users: 50-100
- Largest table: users (100k rows)
```

---

### Redis/Upstash Cache Layer

**Current Specifications:**
- Allocated memory: 256MB (Starter tier)
- Current usage: 50-100MB (~30-40%)
- Current hit rate: 80-85% (target: >85%)
- Eviction policy: LRU (least recently used)

**Capacity Limits:**
- Hard limit: 256MB per plan tier
- Practical limit: 150-200MB (avoid >80% utilization)
- Max connections: 1000+ concurrent
- Max throughput: 100k ops/second

**Headroom Analysis:**
- Memory: 150MB remaining (3-6 month buffer)
- Connections: Room for 20-50x growth
- Throughput: Room for 50-100x growth

**Current Metrics:**
```
Cache Statistics:
- Hit ratio: 82% (good)
- Eviction rate: <1% daily (healthy)
- Avg response time: 2-5ms
- Stored items: ~50k cache entries
```

---

### API and Compute (Vercel)

**Current Specifications:**
- Tier: Pro plan
- Serverless function timeout: 60 seconds
- Concurrent execution limit: 1000+ functions
- Request throughput: 10k+ requests/second
- Data transfer: 100GB/month included

**Capacity Limits:**
- Hard limit: 50M requests/month per Pro plan
- Practical limit: 5M+ requests/day sustainable
- Concurrent functions: 1000+ available
- Edge middleware execution: Unlimited

**Headroom Analysis:**
- Monthly requests: 15-20M capacity remaining
- Daily throughput: 4.5M requests/day buffer
- Concurrent execution: 900+ simultaneous available
- Data transfer: 50GB/month buffer

**Current Metrics:**
```
API Performance:
- Daily requests: 500k-600k
- Peak requests/second: 7-10 req/s
- Function duration: P95 <500ms
- Error rate: <0.1%
```

---

### Anthropic API Rate Limits

**Current Specifications:**
- Plan: Standard API access
- Rate limit: No hard limit published
- Practical limit: ~1000 concurrent requests

**Current Usage:**
- Requests/day: 10k-20k
- Tokens/day: ~100M input, ~50M output
- Batch processing: Not currently used

**Headroom Analysis:**
- Room for 10-20x growth at current rate
- Batch API can handle 10x+ volume at 50% cost
- Cache hits provide effective capacity increase

---

## Growth Projections (12-Month Horizon)

### Scenario 1: Base Case (Conservative Growth)
**Assumptions:** 15% monthly user growth, 20% request growth

| Period | Users | Requests/day | Database | API Reqs/sec | Status |
|--------|-------|-------------|----------|-------------|--------|
| **Current (Apr 2026)** | 800 | 500k | 18GB | 6 req/s | ✓ Healthy |
| **+3mo (Jul 2026)** | 1,200 | 750k | 25GB | 9 req/s | ✓ Good |
| **+6mo (Oct 2026)** | 1,800 | 1.1M | 35GB | 13 req/s | ✓ Good |
| **+9mo (Jan 2027)** | 2,700 | 1.65M | 48GB | 19 req/s | ⚠️ Monitor |
| **+12mo (Apr 2027)** | 4,000 | 2.4M | 65GB | 28 req/s | ⚠️ Plan upgrade |

---

### Scenario 2: Aggressive Growth
**Assumptions:** 25% monthly user growth, 30% request growth

| Period | Users | Requests/day | Database | API Reqs/sec | Status |
|--------|-------|-------------|----------|-------------|--------|
| **Current (Apr 2026)** | 800 | 500k | 18GB | 6 req/s | ✓ Healthy |
| **+3mo (Jul 2026)** | 1,500 | 850k | 30GB | 10 req/s | ✓ Good |
| **+6mo (Oct 2026)** | 2,800 | 1.45M | 50GB | 17 req/s | ⚠️ Monitor |
| **+9mo (Jan 2027)** | 5,200 | 2.0M | 85GB | 23 req/s | ⚠️ Plan upgrade |
| **+12mo (Apr 2027)** | 9,600 | 2.8M | 145GB | 32 req/s | 🔴 Upgrade required |

---

### Scenario 3: Hyperscale (Optimistic)
**Assumptions:** 35% monthly user growth, 40% request growth, viral adoption

| Period | Users | Requests/day | Database | API Reqs/sec | Status |
|--------|-------|-------------|----------|-------------|--------|
| **Current (Apr 2026)** | 800 | 500k | 18GB | 6 req/s | ✓ Healthy |
| **+3mo (Jul 2026)** | 2,000 | 1.1M | 35GB | 13 req/s | ✓ Good |
| **+6mo (Oct 2026)** | 5,000 | 2.2M | 70GB | 25 req/s | ⚠️ Monitor |
| **+9mo (Jan 2027)** | 12,000 | 4.5M | 145GB | 52 req/s | 🔴 Upgrade required |
| **+12mo (Apr 2027)** | 29,000 | 9.0M | 300GB | 104 req/s | 🔴 Major upgrade |

---

## Scaling Strategies by Service

### Database Scaling (Supabase/PostgreSQL)

#### Phase 1: Optimization (Current - 50GB)
**Timeline:** Ongoing  
**Goal:** Maximize existing capacity efficiency

**Actions:**
- [ ] Add indexes on high-cardinality columns
- [ ] Optimize slow queries (>100ms)
- [ ] Implement connection pooling
- [ ] Archive old data (>1 year)
- [ ] Vacuum and analyze regularly

**Expected Impact:**
- 20-30% performance improvement
- Allows reaching 50GB before scaling

---

#### Phase 2: Read Replicas (50-100GB)
**Timeline:** Q3 2026  
**Trigger:** Database approaching 40GB or >50% connection pool usage

**Implementation:**
```sql
-- Supabase read replica setup
-- 1. Create read replica in same region
-- 2. Configure read-only connection pool
-- 3. Route analytics queries to replica
-- 4. Implement eventual consistency handling

-- Example: Analytics queries to replica
const analyticsConnection = pgPool.connect({
  host: 'replica-host.supabase.co',
  readonly: true,
  replication_lag_tolerance: 5000 // 5 seconds
});
```

**Expected Impact:**
- 30-40% effective throughput increase
- Cost increase: +$50-100/month per replica
- Allows reaching 100GB before next scaling

---

#### Phase 3: Partitioning (100-200GB)
**Timeline:** Q4 2026 or Q1 2027  
**Trigger:** Database >100GB or query performance degrades

**Strategy:** Partition large tables by date/user ID

```sql
-- Example partitioning strategy
CREATE TABLE events_2026_04 PARTITION OF events
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE user_contents_A PARTITION OF user_contents
  FOR VALUES FROM ('A') TO ('B');
```

**Expected Impact:**
- 50-70% query performance improvement
- Enables reaching 300GB+
- Cost: Minimal (no plan upgrade needed)

---

#### Phase 4: Custom Tier (>200GB)
**Timeline:** Q1-Q2 2027 or after 10k+ users  
**Trigger:** Database exceeds 200GB or critical performance issues

**Options:**
1. Supabase custom tier (direct negotiation)
2. Move to managed PostgreSQL (AWS RDS, Digital Ocean)
3. Implement multi-database sharding

**Expected Impact:**
- Unlimited scaling capability
- Cost: $500-2000+/month depending on option
- Complexity: High

---

### Cache Layer Scaling (Redis/Upstash)

#### Phase 1: Optimization (Current - 256MB)
**Timeline:** Ongoing  
**Goal:** Maximize cache efficiency

**Actions:**
- [ ] Implement cache warming on startup
- [ ] Review eviction rates weekly
- [ ] Consolidate duplicate cache keys
- [ ] Optimize key structure (shorter names)
- [ ] Monitor hit/miss ratios

**Expected Impact:**
- 10-20% capacity gain through consolidation
- Better hit ratios (target: >90%)

---

#### Phase 2: Larger Instance (256MB - 1GB)
**Timeline:** Q3-Q4 2026  
**Trigger:** Memory usage >200MB or hit ratio falls below 80%

**Implementation:**
```bash
# Upstash: Upgrade from Starter to Pro plan
# Cost: ~$50 → $150/month
# Capacity: 256MB → 1GB (4x increase)
# Features: Same tier features, more memory
```

**Expected Impact:**
- 4x cache capacity
- Enables 4x traffic growth without new infrastructure

---

#### Phase 3: Cluster Mode (1GB+)
**Timeline:** Q1 2027 or after 100k+ requests/day  
**Trigger:** Cache memory >500MB or latency impacts

**Implementation:**
```javascript
// Redis Cluster mode (3+ nodes)
// Each node: 1GB = 3GB total
// Automatic sharding and failover
// Cost: ~$300-500/month
```

**Expected Impact:**
- Horizontal scaling unlimited
- Better fault tolerance
- Higher latency (1-2ms vs. 0-1ms)

---

### API Compute Scaling (Vercel)

#### Phase 1: Optimization (Current)
**Timeline:** Ongoing  
**Goal:** Maximize function efficiency

**Actions:**
- [ ] Reduce function cold start time
- [ ] Optimize function bundle size
- [ ] Implement request batching
- [ ] Use edge middleware for auth
- [ ] Monitor function duration

**Expected Impact:**
- 20-30% throughput improvement
- Allows handling more traffic without scaling

---

#### Phase 2: Vercel Enterprise
**Timeline:** Q4 2026 or Q1 2027  
**Trigger:** >50M requests/month or critical performance needs

**Features:**
- Unlimited request volume
- Priority support
- Custom SLA
- Dedicated resources

**Cost:** Custom pricing, typically 2-5x Pro plan

**Expected Impact:**
- Unlimited API scaling
- Enterprise support

---

#### Phase 3: Kubernetes (Self-hosted)
**Timeline:** Q2 2027 or after 500M+ requests/month  
**Trigger:** Vercel costs exceed $5k+/month

**Implementation:**
```bash
# Deploy to Kubernetes cluster
# Options: AWS EKS, GCP GKE, DigitalOcean Kubernetes
# Cost: $200-1000+/month depending on traffic
```

**Expected Impact:**
- Full control over infrastructure
- Potential 30-50% cost savings at hyperscale
- Higher operational complexity

---

## Upgrade Triggers and Procedures

### Monitoring Metrics for Scaling Decisions

**Set up monitoring alerts in Sentry/DataDog:**

| Metric | Current | Warning | Critical | Action |
|--------|---------|---------|----------|--------|
| **Database size** | 18GB | 40GB | 60GB | Plan upgrade, add replicas |
| **DB query P99** | 50ms | 150ms | 300ms | Add indexes, optimize queries |
| **Cache memory** | 80MB | 200MB | 240MB | Upgrade cache tier |
| **Cache hit ratio** | 82% | <75% | <60% | Review cache strategy |
| **API requests/day** | 500k | 2M | 5M | Optimize, consider edge |
| **API P95 latency** | 150ms | 500ms | 1000ms | Add functions, optimize |
| **Anthropic cost/day** | $80 | $200 | $500 | Implement optimizations |

---

### Scaling Decision Framework

**When to scale each component:**

#### Database
- **Add read replicas when:** >50% connections used AND query latency trending up
- **Implement partitioning when:** >100GB OR >10k queries/sec
- **Move to custom tier when:** >200GB OR multi-region needed

#### Cache
- **Upgrade when:** >200MB used OR hit ratio <75% for 1 week
- **Cluster when:** >500MB needed OR >100k ops/sec

#### API Compute
- **Optimize when:** P95 latency >500ms for 1 week
- **Scale horizontally when:** >50M requests/month OR sustained >1k req/sec peak

#### Anthropic API
- **Implement caching when:** Cost >$3k/month
- **Use batch API when:** >30k requests/day or non-urgent work
- **Optimize models when:** Cost trend unsustainable

---

### Scaling Procedure Checklist

#### Pre-Upgrade Phase (1-2 weeks before)

- [ ] Validate business case for scaling
- [ ] Estimate costs and ROI
- [ ] Get approval from leadership
- [ ] Create detailed upgrade plan
- [ ] Notify team of maintenance window
- [ ] Backup current data/configs
- [ ] Test upgrade in staging environment

#### Upgrade Phase (maintenance window)

- [ ] Execute pre-upgrade checklist
- [ ] Monitor during upgrade for issues
- [ ] Verify connectivity and performance
- [ ] Run smoke tests on critical paths
- [ ] Monitor error rates for 1 hour post-upgrade
- [ ] Document any issues encountered

#### Post-Upgrade Phase (1 week)

- [ ] Monitor performance metrics
- [ ] Verify cost is as expected
- [ ] Gather team feedback
- [ ] Adjust configurations if needed
- [ ] Update documentation
- [ ] Update capacity planning model

---

## Multi-Region and Disaster Recovery Capacity

### Current Setup
- Single region: Vercel (US, default)
- Database: Supabase (single region)
- Cache: Upstash (single region)

### Growth Considerations

**When to add multi-region (after 100k+ users or 5M+ requests/day):**

#### Option 1: Regional Edge Caching
**Cost:** $50-200/month  
**Implementation:** Cloudflare / Vercel Edge Cache
**Benefit:** Reduced latency for global users

#### Option 2: Multi-Region Database
**Cost:** +$200-500/month  
**Implementation:** Supabase or PostgreSQL replication
**Benefit:** Disaster recovery, lower latency in regions

#### Option 3: Full Multi-Region
**Cost:** 2.5-3x current infrastructure costs  
**Implementation:** Separate deployments in 2-3 regions
**Benefit:** True global distribution, high availability

---

## Capacity Budget Examples

### Low Growth Scenario (15% monthly)
- Database: Sufficient through Q1 2027
- Cache: Sufficient through Q4 2026, upgrade then
- API: Sufficient indefinitely
- Budget for scaling: $100/month added costs (Jul 2026)

### Aggressive Growth Scenario (25% monthly)
- Database: Add read replica Q3 2026, partition Q4 2026
- Cache: Upgrade Q3 2026, cluster Q4 2026
- API: Optimize thoroughly, likely sufficient through 2027
- Budget for scaling: $300/month added costs (avg Q3-Q4 2026)

### Hyperscale Scenario (35%+ monthly)
- Database: Read replicas Q3, partitioning Q3, custom tier Q4
- Cache: Immediate upgrade + cluster Q3
- API: Major optimization Q3, possible enterprise tier Q4
- Budget for scaling: $500+/month added costs
- Timeline: Major refactoring may be needed

---

## Capacity Planning Calendar

### Quarterly Capacity Reviews

**Schedule: First Monday of each quarter (Jan, Apr, Jul, Oct)**

**Pre-Review (3 days before):**
- [ ] Export metrics from monitoring systems
- [ ] Calculate growth trends
- [ ] Compare to projections
- [ ] Prepare capacity report

**Review Meeting (1 hour):**
- [ ] Present current utilization metrics
- [ ] Show growth trends vs. projections
- [ ] Review scaling timeline
- [ ] Discuss any issues encountered
- [ ] Confirm upgrade plans
- [ ] Set next quarter's targets

**Post-Review (1 week):**
- [ ] Update capacity-planning.md
- [ ] Adjust alerts if needed
- [ ] Brief team on upcoming scaling
- [ ] Schedule implementation work

---

## Cost of Scaling

### Infrastructure Investment Timeline

| Phase | Service | Cost | Timeline | Trigger |
|-------|---------|------|----------|---------|
| **1** | Redis upgrade | +$100 | Q3 2026 | 200MB+ usage |
| **2** | DB read replica | +$100 | Q3 2026 | 40GB+ OR 50% connections |
| **3** | Cache cluster | +$250 | Q4 2026 | 500MB+ usage |
| **4** | Vercel Enterprise | +$1000s | Q1 2027 | 50M+ requests/month |
| **5** | Custom DB tier | +$500+ | Q1 2027 | 200GB+ OR custom SLA |

**Total Estimated Additional Costs (12-month horizon):**
- Base case (15% growth): $100-300/month
- Aggressive (25% growth): $300-800/month
- Hyperscale (35%+ growth): $800-2000+/month

---

## Summary: Capacity Readiness

**Current Status:** ✓ Healthy
- All services <40% utilization
- Performance metrics excellent
- Room for 4-6 months growth at current rates

**Next Critical Milestone:** Q3 2026
- Cache upgrade decision point
- Database read replica consideration
- Growth projection confirmation

**Key Success Factors:**
1. Monitor metrics religiously (weekly reviews)
2. Plan upgrades 4-6 weeks in advance
3. Test in staging before production
4. Communicate proactively with team
5. Document all changes thoroughly

**Owner:** Infrastructure Lead  
**Review Frequency:** Quarterly (next: July 28, 2026)  
**Last Updated:** April 28, 2026
