# Performance Optimization Checklist

## Database Query Optimization

### N+1 Query Detection and Prevention

**Identification Checklist:**
- [ ] Run slow query log analysis weekly
- [ ] Review transaction logs for repetitive queries
- [ ] Use APM to detect correlated SELECT patterns
- [ ] Monitor query count per API request

**Prevention Patterns:**

**Pattern 1: Loop-based Queries**
```javascript
// BEFORE: N+1 queries
async function getUsersWithWallets() {
  const users = await db.query('SELECT id, name FROM users LIMIT 100');
  for (const user of users) {
    const wallet = await db.query(
      'SELECT balance FROM wallet WHERE user_id = $1',
      [user.id]
    );
    user.wallet = wallet;
  }
  return users;
}

// AFTER: Batch query
async function getUsersWithWallets() {
  const users = await db.query('SELECT id, name FROM users LIMIT 100');
  const userIds = users.map(u => u.id);
  const wallets = await db.query(
    'SELECT user_id, balance FROM wallet WHERE user_id = ANY($1)',
    [userIds]
  );
  const walletMap = new Map(wallets.map(w => [w.user_id, w.balance]));
  
  return users.map(u => ({
    ...u,
    wallet: walletMap.get(u.id)
  }));
}
```

**Pattern 2: Missing JOIN**
```javascript
// BEFORE: Multiple queries
const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
const profile = await db.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
const wallet = await db.query('SELECT * FROM wallet WHERE user_id = $1', [userId]);

// AFTER: Single JOIN query
const user = await db.query(`
  SELECT u.*, p.bio, p.avatar, w.balance
  FROM users u
  LEFT JOIN profiles p ON u.id = p.user_id
  LEFT JOIN wallet w ON u.id = w.user_id
  WHERE u.id = $1
`, [userId]);
```

**Pattern 3: Subquery Explosion**
```javascript
// BEFORE: Subquery in loop
const userIds = [1, 2, 3, 4, 5];
for (const userId of userIds) {
  const credits = await db.query(
    'SELECT COUNT(*) FROM generation WHERE user_id = $1',
    [userId]
  );
}

// AFTER: Aggregate subquery
const credits = await db.query(`
  SELECT user_id, COUNT(*) as count
  FROM generation
  WHERE user_id = ANY($1)
  GROUP BY user_id
`, [userIds]);
```

### Index Optimization

**Index Creation Checklist:**
- [ ] Identify columns in WHERE clauses without indexes
- [ ] Create indexes for frequent JOINs
- [ ] Analyze query execution plans monthly
- [ ] Remove unused indexes quarterly
- [ ] Review composite index order

**Index Strategy:**

**Single Column Indexes**
```sql
-- Equality searches
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_generation_user_id ON generation(user_id);

-- Range queries (sort by descending for time-series)
CREATE INDEX idx_generation_created ON generation(created_at DESC);
```

**Composite Indexes** (Column order matters!)
```sql
-- Query: WHERE user_id = X AND created_at > Y
CREATE INDEX idx_generation_user_created 
ON generation(user_id, created_at DESC);

-- Query: WHERE status = X AND user_id = Y
CREATE INDEX idx_content_status_user
ON content(status, user_id) INCLUDE (title);
```

**Index Type Selection**
- B-tree (default): Equality and range queries
- Hash: Equality-only, smaller, faster
- BRIN: Time-series data, lower disk overhead
- GiST/GIN: Full-text search, JSON operators

**Partial Indexes** (for filtered queries)
```sql
-- Only index active users
CREATE INDEX idx_users_active 
ON users(created_at) 
WHERE status = 'active';
```

**Maintenance Schedule:**
```sql
-- Weekly: Vacuum and analyze
VACUUM ANALYZE;

-- Monthly: Check index bloat
SELECT 
  schemaname, tablename, indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;

-- Quarterly: Remove unused indexes
SELECT indexname FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexname NOT LIKE '%pkey%';
```

### Query Plan Analysis

**EXPLAIN ANALYZE Checklist:**
- [ ] Identify sequential scans (should have index)
- [ ] Check rows vs actual (update statistics if off)
- [ ] Look for hash joins (might need index)
- [ ] Verify index usage in complex queries

**Analysis Template:**
```sql
-- Generate query plan
EXPLAIN ANALYZE
SELECT * FROM content 
WHERE user_id = $1 
AND created_at > $2
AND status = 'active'
ORDER BY created_at DESC;

-- Expected output analysis:
-- - Should use idx_content_user_created (not Seq Scan)
-- - Actual rows should match estimated rows
-- - Filter step should be minimal
```

**Performance Interpretation:**
- **Seq Scan:** Problem — add index or rewrite query
- **Index Scan:** Good — index is being used
- **Hash Join:** Consider adding indexes to join columns
- **Nested Loop:** OK for small result sets, bad for large joins
- **Sort:** May be slow — consider index on ORDER BY column

---

## Cache Optimization

### Redis Cache Strategy

**Cache Layer Checklist:**
- [ ] Define cache key naming convention
- [ ] Set appropriate TTLs per data type
- [ ] Implement cache invalidation strategy
- [ ] Monitor hit/miss ratios
- [ ] Size cache for dataset

**Cache Tiers:**
```javascript
// Tier 1: Request-level (memory)
const requestCache = new Map();

// Tier 2: Application-level (Redis)
const redis = new Redis({
  host: process.env.REDIS_HOST,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

// Tier 3: Database (PostgreSQL)
const db = new Pool({
  max: 25,
  min: 5,
});
```

**Cache Implementation Pattern:**
```javascript
async function getData(id) {
  // 1. Check request cache (fastest)
  if (requestCache.has(`data:${id}`)) {
    return requestCache.get(`data:${id}`);
  }

  // 2. Check Redis (fast)
  const cached = await redis.get(`data:${id}`);
  if (cached) {
    const data = JSON.parse(cached);
    requestCache.set(`data:${id}`, data); // Populate L1
    return data;
  }

  // 3. Query database (slow)
  const data = await db.query(
    'SELECT * FROM data WHERE id = $1',
    [id]
  );

  // 4. Populate caches
  requestCache.set(`data:${id}`, data[0]);
  await redis.setex(`data:${id}`, 3600, JSON.stringify(data[0]));

  return data[0];
}
```

**Cache Invalidation Patterns:**

**Pattern 1: Write-Through**
```javascript
async function updateData(id, newData) {
  // 1. Update database
  const result = await db.query(
    'UPDATE data SET ... WHERE id = $1 RETURNING *',
    [id]
  );

  // 2. Invalidate cache immediately
  await redis.del(`data:${id}`);
  requestCache.delete(`data:${id}`);

  return result[0];
}
```

**Pattern 2: Cache-Aside with Version**
```javascript
async function getData(id, version = 1) {
  const key = `data:${id}:v${version}`;
  
  // 1. Try cache
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  // 2. Database fallback
  const data = await db.query(
    'SELECT * FROM data WHERE id = $1',
    [id]
  );

  // 3. Cache with new version
  await redis.setex(key, 3600, JSON.stringify(data[0]));
  return data[0];
}

// When data updates, increment version
async function updateData(id, newData) {
  const version = await redis.incr(`data:${id}:version`);
  await db.query('UPDATE data SET ... WHERE id = $1', [id]);
  return version;
}
```

**Pattern 3: Batch Invalidation**
```javascript
async function invalidateUserCache(userId) {
  // Use Redis SCAN to find related keys
  const pattern = `user:${userId}:*`;
  let cursor = '0';
  
  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      'MATCH', pattern
    );
    
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    
    cursor = nextCursor;
  } while (cursor !== '0');
}
```

### Cache Hit Ratio Targets

**By Data Type:**

| Cache Type | Target Hit Ratio | TTL | Priority |
|-----------|------------------|-----|----------|
| Generation results | > 90% | 24h | P0 |
| User profiles | > 80% | 1h | P0 |
| FX rates | > 95% | 1h | P1 |
| Rate limit buckets | > 99% | 1m | P0 |
| Feature flags | > 99% | 5m | P2 |
| Session data | > 85% | 24h | P0 |

**Monitoring:**
```javascript
async function getCacheMetrics() {
  const info = await redis.info('stats');
  const keyspace = await redis.info('keyspace');
  
  const hitRatio = info.keyspace_hits / 
    (info.keyspace_hits + info.keyspace_misses);
  
  console.log(`Cache Hit Ratio: ${(hitRatio * 100).toFixed(2)}%`);
  return { hitRatio, keyspace };
}

// Alert if hit ratio drops below threshold
setInterval(async () => {
  const metrics = await getCacheMetrics();
  if (metrics.hitRatio < 0.8) {
    logger.warn('Low cache hit ratio', metrics);
  }
}, 60000);
```

### Cache Warming Strategy

**Startup Cache Population:**
```javascript
async function warmCaches() {
  console.log('Warming caches...');

  // 1. Load feature flags
  const flags = await db.query('SELECT * FROM feature_flags');
  for (const flag of flags) {
    await redis.set(
      `flag:${flag.id}`,
      JSON.stringify(flag),
      'EX', 3600
    );
  }
  console.log(`Loaded ${flags.length} feature flags`);

  // 2. Load FX rates
  const rates = await db.query('SELECT * FROM fx_rates');
  for (const rate of rates) {
    await redis.set(
      `fx:${rate.code}`,
      rate.rate,
      'EX', 3600
    );
  }
  console.log(`Loaded ${rates.length} FX rates`);

  // 3. Load popular user profiles (top 1% by activity)
  const topUsers = await db.query(`
    SELECT id FROM users 
    ORDER BY generation_count DESC 
    LIMIT 100
  `);
  for (const user of topUsers) {
    const profile = await db.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [user.id]
    );
    await redis.setex(
      `user:${user.id}`,
      3600,
      JSON.stringify(profile)
    );
  }
  console.log(`Warmed ${topUsers.length} popular user profiles`);
}

// Call on application startup
app.on('ready', warmCaches);
```

---

## API Response Optimization

### Response Compression

**Enable gzip compression:**
```javascript
const compression = require('compression');
const express = require('express');

const app = express();

// Enable compression for responses > 1KB
app.use(compression({
  level: 6,  // Balance speed/compression
  threshold: 1024,  // Only compress > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

**Brotli Compression (better than gzip):**
```bash
npm install brotli-compression
```

```javascript
const { brotliCompress } = require('brotli');
const compression = require('compression');

app.use(compression({
  level: 11,  // Maximum compression
  filter: (req, res) => {
    return req.header('accept-encoding')?.includes('br');
  },
  algorithm: 'br'
}));
```

**Payload Optimization:**
- [ ] Return only required fields (GraphQL or field selection)
- [ ] Paginate large result sets
- [ ] Avoid nested object expansion
- [ ] Use JSON schema validation
- [ ] Remove null values

```javascript
// Field selection pattern
app.get('/api/users/:id', (req, res) => {
  const fields = req.query.fields?.split(',') || ['id', 'name'];
  
  const user = getUser(id);
  const filtered = {};
  
  fields.forEach(field => {
    if (field in user) {
      filtered[field] = user[field];
    }
  });
  
  res.json(filtered);
});

// Pagination pattern
app.get('/api/generations', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;
  
  const results = db.query(
    'SELECT * FROM generation OFFSET $1 LIMIT $2',
    [offset, limit]
  );
  
  res.json({
    data: results,
    pagination: { page, limit, offset }
  });
});
```

---

## Code Splitting and Lazy Loading

### JavaScript Bundle Optimization

**Checklist:**
- [ ] Identify code split points (routes, features)
- [ ] Lazy load non-critical paths
- [ ] Defer 3rd-party scripts
- [ ] Tree-shake unused code
- [ ] Monitor bundle size in CI

**React Code Splitting:**
```javascript
import React from 'react';
import { lazy, Suspense } from 'react';

// Lazy load route components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

**Dynamic Import Pattern:**
```javascript
// Load on demand
async function loadFeature() {
  const module = await import('./feature.js');
  return module.default;
}

// Load on visibility
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      import('./heavy-component.js').then(module => {
        mount(module.default);
      });
    }
  });
});
```

### Bundle Analysis

**Tools:**
- `webpack-bundle-analyzer`
- `source-map-explorer`
- `bundlesize`

```bash
# Analyze bundle
webpack-bundle-analyzer dist/main.js.map

# Set bundle size limits
npx bundlesize
```

**Bundle Size Targets:**
- Main bundle: < 200KB
- Total (all chunks): < 800KB
- Gzipped main: < 50KB
- Gzipped total: < 300KB

---

## Bundle Size Analysis

### Weekly Bundle Audit

**Checklist:**
- [ ] Measure gzipped bundle size
- [ ] Compare to previous week
- [ ] Identify new large dependencies
- [ ] Check for duplicate packages
- [ ] Analyze code coverage

**Analysis Script:**
```javascript
// scripts/analyze-bundle.js
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

async function analyzeBundle() {
  console.log('Building bundle...');
  execSync('npm run build', { stdio: 'inherit' });

  const distPath = path.join(process.cwd(), 'dist');
  const files = fs.readdirSync(distPath);

  const bundles = files
    .filter(f => f.endsWith('.js'))
    .map(f => ({
      name: f,
      size: fs.statSync(path.join(distPath, f)).size,
      gzipped: execSync(`gzip -c "${path.join(distPath, f)}" | wc -c`)
    }));

  bundles.forEach(b => {
    console.log(`${b.name}: ${b.size / 1024}KB (${b.gzipped / 1024}KB gzipped)`);
  });

  // Compare to baseline
  const baseline = JSON.parse(
    fs.readFileSync('.bundlesize.json', 'utf8')
  );

  bundles.forEach(b => {
    const baselineSize = baseline[b.name];
    if (baselineSize && b.gzipped > baselineSize * 1.1) {
      console.warn(
        `ALERT: ${b.name} grew > 10%: ${baselineSize / 1024}KB -> ${b.gzipped / 1024}KB`
      );
    }
  });
}

analyzeBundle();
```

---

## Memory Leak Detection

### Detection Procedures

**Checklist:**
- [ ] Enable heap snapshots in production-like env
- [ ] Monitor memory growth over time
- [ ] Run load tests and check for leaks
- [ ] Profile long-running processes
- [ ] Review circular references

**Manual Leak Detection:**
```javascript
// Track memory usage
let memoryCheckpoints = [];

setInterval(() => {
  const usage = process.memoryUsage();
  memoryCheckpoints.push({
    timestamp: Date.now(),
    heapUsed: usage.heapUsed,
    external: usage.external,
  });

  // Keep last 1000 readings
  if (memoryCheckpoints.length > 1000) {
    memoryCheckpoints.shift();
  }

  // Alert if trending upward
  if (memoryCheckpoints.length >= 10) {
    const recent = memoryCheckpoints.slice(-10);
    const trend = recent.reduce((sum, cp) => 
      sum + cp.heapUsed, 0) / 10;
    
    const first = memoryCheckpoints[0].heapUsed;
    const current = recent[recent.length - 1].heapUsed;
    
    if (current > first * 1.5) {
      console.warn('Memory leak detected', {
        baseline: first / 1024 / 1024,
        current: current / 1024 / 1024,
        trend: trend / 1024 / 1024
      });
    }
  }
}, 60000);
```

**Automatic Leak Detection:**
```bash
# Use clinic.js
clinic doctor -- node app.js

# Run under load
npm run load-test

# Analyze results
```

**Common Memory Leak Patterns:**

Pattern 1: Event Listener Not Removed
```javascript
// LEAK: Listener never removed
emitter.on('data', handler);

// FIX: Remove listener
emitter.on('data', handler);
emitter.once('cleanup', () => {
  emitter.off('data', handler);
});
```

Pattern 2: Circular References
```javascript
// LEAK: Parent-child circular reference
class Node {
  constructor() {
    this.parent = null;
    this.children = [];
  }

  addChild(child) {
    child.parent = this;  // Circular!
    this.children.push(child);
  }
}

// FIX: Use WeakMap for parent references
const parents = new WeakMap();

class Node {
  addChild(child) {
    parents.set(child, this);  // Not circular
    this.children.push(child);
  }
}
```

Pattern 3: Cached References
```javascript
// LEAK: Cache grows unbounded
const cache = {};

function process(id) {
  if (!cache[id]) {
    cache[id] = expensiveComputation(id);
  }
  return cache[id];
}

// FIX: Bound cache size
const cache = new Map();
const MAX_CACHE = 1000;

function process(id) {
  if (!cache.has(id)) {
    if (cache.size >= MAX_CACHE) {
      // Remove oldest entry
      const first = cache.keys().next().value;
      cache.delete(first);
    }
    cache.set(id, expensiveComputation(id));
  }
  return cache.get(id);
}
```

---

## Performance Optimization Tracking

### Weekly Optimization Report Template

```markdown
## Week of [Date] Performance Report

### Metrics
- API P95: [value]ms (target: 500ms)
- DB P99: [value]ms (target: 100ms)
- Cache Hit Ratio: [value]% (target: 80%+)
- Error Rate: [value]% (target: < 0.1%)

### Optimizations Completed
1. [Item 1]
2. [Item 2]

### Issues Identified
1. [Issue 1] - Impact: [HIGH/MEDIUM/LOW]
2. [Issue 2] - Impact: [HIGH/MEDIUM/LOW]

### Next Week Priorities
1. [Priority 1]
2. [Priority 2]
```

### Quarterly Performance Review

**Schedule: First day of each quarter**

- [ ] Review all optimization tickets
- [ ] Assess impact of completed work
- [ ] Update baselines in performance-profiling.md
- [ ] Plan optimization roadmap for next quarter
- [ ] Present findings to engineering team

