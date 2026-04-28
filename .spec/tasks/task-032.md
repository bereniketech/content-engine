---
task: 032
feature: stability-roadmap
status: pending
model: haiku
supervisor: software-cto
agent: observability-engineer
depends_on: [task-030]
---

# Task 032: Set up continuous performance profiling and optimization

## Skills
- .kit/skills/performance/web-performance/SKILL.md
- .kit/skills/data-backend/postgres-patterns/SKILL.md

## Agents
- @observability-engineer

## Commands
- /verify

---

## Objective
Establish continuous performance profiling of database queries, API endpoints, and cache usage to identify optimization opportunities before they cause production incidents.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `monitoring/profiling-config.yml` | Continuous profiling rules and sampling |
| `docs/PERFORMANCE_OPTIMIZATION.md` | Optimization patterns and guidelines |
| `scripts/analyze-slow-queries.sql` | Query analysis tool |

---

## Dependencies
- Depends on: task-030 (metrics and SLOs established)

---

## Code Templates

### `monitoring/profiling-config.yml`

```yaml
# Continuous Performance Profiling Configuration

profiling:
  enabled: true
  sampling_rate: 0.1  # Sample 10% of requests for detailed profiling
  
  database:
    slow_query_threshold_ms: 100
    capture_query_plans: true
    track_connection_pool: true
    log_n_plus_one_queries: true
    
  cache:
    track_hit_ratio: true
    alert_hit_ratio_below: 0.8  # Alert if hit rate < 80%
    profile_evictions: true
    
  api:
    track_endpoint_p99: true
    capture_flame_graphs: true
    sample_rate_per_endpoint:
      /api/content/generate: 0.5  # Higher sampling for critical endpoint
      /api/auth/signup: 0.1
      /api/health: 0.01  # Very low sampling for frequent health checks

traces:
  enabled: true
  backends:
    - jaeger
    - prometheus
  retention_days: 7
```

### `scripts/analyze-slow-queries.sql`

```sql
-- Analyze slow queries and identify optimization opportunities

-- 1. Top 10 slowest queries (by total time)
SELECT 
  query,
  calls,
  total_time::numeric(10,2) as total_ms,
  (mean_time)::numeric(10,2) as avg_ms,
  (max_time)::numeric(10,2) as max_ms
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
ORDER BY total_time DESC
LIMIT 10;

-- 2. Queries with most expensive average execution
SELECT 
  query,
  calls,
  (mean_time)::numeric(10,2) as avg_ms,
  (stddev_time)::numeric(10,2) as stddev_ms
FROM pg_stat_statements
WHERE calls > 100
ORDER BY mean_time DESC
LIMIT 10;

-- 3. Count queries by type
SELECT 
  COUNT(*) as query_count,
  SUM(calls) as total_calls,
  AVG(mean_time)::numeric(10,2) as avg_time_ms
FROM pg_stat_statements
GROUP BY (query LIKE '%SELECT%')::text;

-- 4. Table scan analysis (missing index detection)
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  (seq_scan - idx_scan)::float / NULLIF(seq_scan, 0) as idx_efficiency
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan
ORDER BY seq_scan DESC;

-- 5. Index usage analysis
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_usage_count,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- 6. Unused indexes (candidates for removal)
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexname NOT LIKE '%pkey%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- 7. Vacuum and analyze stats
SELECT 
  schemaname,
  tablename,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze,
  n_dead_tup
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;
```

### `docs/PERFORMANCE_OPTIMIZATION.md`

```markdown
# Performance Optimization Guide

## Database Query Optimization

### 1. Identifying N+1 Queries

**Problem:** Query inside loop loads 1 item repeatedly instead of batch.

```javascript
// ❌ BAD: N+1 queries (N+1 database hits)
const users = await db.query('SELECT id FROM users LIMIT 100');
for (const user of users) {
  const credits = await db.query('SELECT credits FROM wallet WHERE user_id = $1', [user.id]);
  // 101 queries total!
}

// ✅ GOOD: Batch load (2 queries)
const users = await db.query('SELECT id FROM users LIMIT 100');
const userIds = users.map(u => u.id);
const wallets = await db.query(
  'SELECT user_id, credits FROM wallet WHERE user_id = ANY($1)',
  [userIds]
);
const walletMap = new Map(wallets.map(w => [w.user_id, w.credits]));
```

### 2. Index Selection

**Missing Index Pattern:**
```sql
-- Slow query scanning entire table
SELECT * FROM generations WHERE user_id = $1 AND created_at > $2;

-- Solution: Add composite index
CREATE INDEX idx_generations_user_created 
ON generations(user_id, created_at DESC);
```

**Index Efficiency:**
- Use B-tree for equality/range queries (default)
- Use Hash for equality-only queries (faster)
- Use BRIN for time-series data (compact)
- Use GiST/GIN for full-text search

### 3. Query Plan Analysis

```sql
-- Analyze query execution plan
EXPLAIN ANALYZE
SELECT * FROM generations 
WHERE user_id = $1 
ORDER BY created_at DESC 
LIMIT 100;

-- Look for:
-- - Seq Scan (full table scan) — add index
-- - Hash Join instead of nested loop — reorder joins
-- - High rows vs actual — update statistics
```

## Caching Strategy

### 1. Cache Invalidation Pattern

```javascript
// Write-through caching
async function updateUserWallet(userId, credits) {
  // 1. Update database
  await db.wallet.update({ user_id: userId }, { credits });
  
  // 2. Invalidate cache immediately
  await redis.del(`wallet:${userId}`);
  
  // 3. Return fresh data (can re-populate on next read)
  return { user_id: userId, credits };
}

// Read with fallback
async function getWalletCredits(userId) {
  // 1. Try cache first
  const cached = await redis.get(`wallet:${userId}`);
  if (cached) return JSON.parse(cached);
  
  // 2. Fall back to database
  const wallet = await db.wallet.findOne({ user_id: userId });
  
  // 3. Populate cache for next read
  await redis.setex(`wallet:${userId}`, 3600, JSON.stringify(wallet));
  return wallet;
}
```

### 2. Cache Hit Ratio Targets

- **Generation results:** > 90% (expensive to compute)
- **User profiles:** > 80% (frequent reads, infrequent writes)
- **FX rates:** > 95% (read-heavy, stable)
- **Rate limit buckets:** 100% (short-lived, predictable)

### 3. Cache Warming

```javascript
// Pre-warm critical caches on application startup
async function warmCaches() {
  // 1. Warm FX rates (small dataset)
  const rates = await db.fxRates.findAll();
  for (const rate of rates) {
    await redis.set(`fx:${rate.currency}`, rate.rate);
  }
  
  // 2. Warm popular user profiles (top 10% of users)
  const topUsers = await db.query(
    'SELECT id FROM users ORDER BY generation_count DESC LIMIT 1000'
  );
  for (const user of topUsers) {
    const profile = await db.users.findOne({ id: user.id });
    await redis.setex(`user:${user.id}`, 3600, JSON.stringify(profile));
  }
}
```

## Connection Pool Tuning

### PostgreSQL Connection Pool

```javascript
// Calculate optimal pool size
// Formula: (core_count * 2) + effective_spindle_count
// Typical: 20-40 connections for web servers

const pool = new Pool({
  max: 25,  // Maximum connections
  min: 5,   // Minimum to keep open
  idleTimeoutMillis: 30000,  // Close idle after 30s
  connectionTimeoutMillis: 2000,
});

// Monitor pool health
pool.on('error', (err) => {
  logger.error('Pool error:', err);
  metrics.increment('db_pool_errors');
});

// Check pool status
setInterval(() => {
  metrics.gauge('db_pool_available', pool._availableCount);
  metrics.gauge('db_pool_queued', pool._waitingCount);
}, 30000);
```

## Monitoring Checklist

- [ ] Track top 10 slow queries monthly
- [ ] Monitor cache hit ratios for all caches
- [ ] Alert on connection pool > 80% utilization
- [ ] Profile p99 latency for each endpoint
- [ ] Analyze query plans for new code
- [ ] Review index usage quarterly
- [ ] Vacuum and analyze statistics weekly

## Optimization Priorities

1. **P0:** Queries with >1 second average (blocking users)
2. **P1:** Cache hit ratios < 70% (poor caching strategy)
3. **P2:** Unused indexes > 10MB (wasted space)
4. **P3:** N+1 query patterns (preventable inefficiency)
5. **P4:** Slow but infrequent queries (low impact)
```

---

## Acceptance Criteria
- [ ] Profiling configuration deployed to production
- [ ] Slow query queries tracked in monitoring
- [ ] Database performance analysis script created
- [ ] Cache hit ratio monitoring active
- [ ] Connection pool metrics being tracked
- [ ] Performance optimization guide documented
- [ ] Team trained on optimization patterns
- [ ] Quarterly performance review process established
- [ ] `/verify` passes

---

## Implementation Steps
1. Deploy continuous profiling configuration
2. Set up Jaeger/distributed tracing (optional but recommended)
3. Create slow query analysis dashboard
4. Run query analysis script weekly
5. Document findings and optimization backlog
6. Schedule quarterly performance optimization sprints
7. Run `/verify`

---

## Handoff to Next Task
_(fill via /task-handoff)_
