# Performance Profiling Guide

## Baseline Metrics for Critical Operations

Establish and monitor baseline performance metrics across all critical system operations. All metrics should be tracked continuously and reviewed weekly.

### Content Generation API
- **Target P95 Latency:** < 500ms
- **Target P99 Latency:** < 1000ms
- **Throughput:** 100+ requests/second
- **Error Rate:** < 0.1%
- **Timeout Rate:** < 0.05%

**Monitoring:**
- Track response times in milliseconds
- Record distribution of latencies (min, p50, p95, p99)
- Alert when P95 exceeds 500ms for 5 consecutive minutes
- Alert when P99 exceeds 1000ms

**Critical Endpoints:**
- `POST /api/content/generate` — Main content generation
- `GET /api/content/{id}` — Content retrieval
- `POST /api/content/{id}/validate` — Validation service

### Signup Flow
- **Target P95 Latency:** < 200ms
- **Target P99 Latency:** < 500ms
- **Success Rate:** > 99.9%
- **Database Commit Rate:** 100%

**Monitoring:**
- Track email verification latency
- Monitor password hashing time (should be consistent ~100-150ms)
- Track database transaction duration
- Alert when signup fails or takes > 200ms P95

**Critical Operations:**
- User account creation
- Email verification token generation
- Initial profile setup
- Welcome email dispatch

### Rate Limit Check
- **Target P99 Latency:** < 50ms
- **Target P99.9 Latency:** < 100ms
- **Cache Hit Rate:** > 99%

**Monitoring:**
- Track Redis lookup latency
- Monitor token bucket updates
- Alert when cache hit rate < 99%
- Alert when latency exceeds 50ms

**Critical Paths:**
- Per-user rate limit check
- Per-IP rate limit check
- Per-endpoint bucket consumption

### Database Queries
- **Target P99 Latency:** < 100ms
- **Target P99.9 Latency:** < 200ms
- **Sequential Scan Rate:** < 5%
- **Connection Pool Exhaustion:** 0 events/week

**Monitoring:**
- Enable `pg_stat_statements` extension
- Track slow query log (> 100ms)
- Monitor connection pool status
- Alert on missing indexes (sequential scans > 5%)

**Query Categories:**
- SELECT queries: < 50ms p99
- INSERT/UPDATE queries: < 100ms p99
- Aggregate queries: < 200ms p99
- Report queries (batch): < 500ms p99

---

## Profiling Tools

### 1. Node.js Built-in Profiler

**Command:**
```bash
node --prof application.js
node --prof-process isolate-0xnnnnnnnnnnnn-v8.log > profile.txt
```

**Usage:**
- Capture CPU profile for wall-time analysis
- Identify function hotspots
- Analyze GC pressure and pause times
- Generate flamegraphs from output

**When to Use:**
- Investigating CPU-intensive operations
- Analyzing unexpected latency spikes
- Performance debugging in production-like environment

### 2. Clinic.js

**Installation:**
```bash
npm install -g clinic
```

**Available Tools:**

**Clinic Doctor** - Diagnose issues
```bash
clinic doctor -- node application.js
# Produces HTML report with diagnosis
```

**Clinic Flame** - CPU profiling with flamegraphs
```bash
clinic flame -- node application.js
# Generates interactive flamegraph
```

**Clinic Bubbleprof** - Async flow analysis
```bash
clinic bubbleprof -- node application.js
# Shows async operation bottlenecks
```

**Clinic Upload** - Send to clinic.dev for analysis
```bash
clinic upload profile.clinic.gz
```

**When to Use:**
- Quick diagnosis of performance issues
- Interactive visualization of problems
- Analyzing async/await bottlenecks
- Regular baseline profiling (weekly)

### 3. New Relic APM

**Configuration:**
```javascript
require('newrelic');
const express = require('express');
const app = express();
```

**Key Features:**
- Distributed tracing across microservices
- Transaction monitoring with segment-level detail
- Database query analysis with execution plans
- Error tracking and grouping
- Real-time performance dashboards
- Custom metrics and attributes

**Setup:**
1. Create New Relic account
2. Install `newrelic` npm package
3. Configure license key in environment
4. Add require statement at application start
5. Configure transaction naming rules
6. Set up alerting policies

**Monitoring in New Relic:**
- Dashboard: Application Performance index
- Transaction monitor: Sort by time and throughput
- Database: Slow query analysis
- External services: HTTP calls and latency
- Custom metrics: Track custom events

---

## Profiling Procedures

### Daily Monitoring Checklist

**Morning (9 AM):**
- [ ] Review dashboard for overnight errors
- [ ] Check error spike notifications
- [ ] Verify no deployments caused regressions
- [ ] Review top slow transactions

**Throughout Day:**
- [ ] Monitor rate limit errors
- [ ] Watch database connection pool
- [ ] Track signup flow success rate
- [ ] Monitor API response times

**Evening (5 PM):**
- [ ] Generate daily performance report
- [ ] Archive slow query logs
- [ ] Review any anomalies
- [ ] Prepare for next day review

### Weekly Profiling Analysis

**Every Monday 10 AM:**

1. **Review P99 Latencies**
   ```bash
   # Query metrics from monitoring system
   SELECT endpoint, p99_latency FROM metrics
   WHERE timestamp > now() - interval '7 days'
   ORDER BY p99_latency DESC;
   ```

2. **Analyze Slow Queries**
   ```bash
   # Run slow query analysis script
   psql -U postgres < scripts/analyze-slow-queries.sql
   ```

3. **Check Cache Hit Ratios**
   - Generation results cache: target > 90%
   - User profile cache: target > 80%
   - FX rate cache: target > 95%
   - Rate limit cache: target > 99%

4. **Review Database Health**
   - Sequential scan percentage
   - Index usage patterns
   - Unused indexes (candidates for removal)
   - Vacuum/autovacuum frequency

5. **Analyze Profile Data**
   ```bash
   # Generate flamegraph from profiler output
   clinic flame -- npm run load-test
   # Analyze results in browser
   ```

### Monthly Deep Dive

**First Friday of Month:**

1. **Run Clinic Doctor Full Diagnostic**
   ```bash
   clinic doctor -- node src/server.js
   ```

2. **Analyze Top 20 Slow Queries**
   - Check execution plans
   - Identify missing indexes
   - Look for N+1 patterns

3. **CPU Profile Analysis**
   ```bash
   node --prof src/server.js &
   # Run load test
   npm run load-test
   # Kill process and analyze
   node --prof-process isolate-*.log > profile.txt
   ```

4. **Review Database Statistics**
   - Index bloat analysis
   - Table size growth
   - Autovacuum effectiveness

5. **Update Performance Roadmap**
   - Document findings
   - Prioritize optimizations
   - Schedule implementation

---

## Flamegraph Analysis

### Interpreting Flamegraphs

**Structure:**
- X-axis: represents call stack samples (wider = more time)
- Y-axis: represents stack depth
- Color: function category (red=kernel, yellow=app, blue=library)

**Common Patterns:**

**Tall Spike**
- Single function consuming significant time
- Check: O(n) algorithm, inefficient loop, memory allocation
- Action: Optimize algorithm or add caching

**Wide Base**
- Many small functions consuming time
- Check: Overhead from frequent function calls
- Action: Reduce call frequency, batch operations

**Uneven Distribution**
- Some paths much wider than others
- Check: Conditional logic with performance variance
- Action: Optimize hot paths, add conditions earlier

**Memory Allocations**
- Continuous saw-tooth pattern
- Check: Garbage collection, memory leaks
- Action: Pool objects, reuse buffers, reduce allocations

### Using Clinic to Generate Flamegraph

```bash
# Generate profile
clinic flame -- node app.js

# Load test your application
# (in separate terminal)
npm run load-test

# Stop the application (Ctrl+C)

# View report in browser
# Clinic automatically opens HTML visualization
```

---

## Automated Profiling in CI/CD

### GitHub Actions Workflow

**File: `.github/workflows/performance.yml`**

```yaml
name: Performance Profiling

on:
  schedule:
    - cron: '0 1 * * *'  # Daily at 1 AM UTC
  workflow_dispatch:

jobs:
  profile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Clinic Doctor
        run: |
          npm install -g clinic
          clinic doctor --collect-delay=5000 -- npm run load-test > clinic-report.txt 2>&1
      
      - name: Run Load Tests
        run: npm run load-test
      
      - name: Analyze Performance
        run: node scripts/analyze-performance.js
      
      - name: Check Performance Budget
        run: node scripts/verify-budget.js
      
      - name: Archive Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: performance-profiles
          path: |
            clinic-report.txt
            performance-*.json
      
      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('clinic-report.txt', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Performance Profile\n\`\`\`\n${report}\n\`\`\``
            });
```

### Continuous Profiling Script

**File: `scripts/continuous-profile.js`**

```javascript
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runContinuousProfile() {
  const profileDir = path.join(process.cwd(), 'profiles');
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir);
  }

  // Interval: every 6 hours
  const interval = 6 * 60 * 60 * 1000;

  async function profile() {
    const timestamp = new Date().toISOString();
    const filename = path.join(profileDir, `profile-${timestamp}.clinic.gz`);

    console.log(`Starting profile: ${filename}`);

    return new Promise((resolve) => {
      const clinic = spawn('clinic', ['flame', '--', 'node', 'src/server.js']);
      
      clinic.on('close', (code) => {
        if (code === 0) {
          console.log(`Profile complete: ${filename}`);
          // Upload to monitoring system
          uploadProfile(filename);
        }
        resolve();
      });

      // Run for 30 seconds
      setTimeout(() => {
        clinic.kill();
      }, 30000);
    });
  }

  // Run initial profile
  await profile();

  // Schedule recurring profiles
  setInterval(profile, interval);
}

function uploadProfile(filename) {
  // TODO: Implement upload to New Relic or monitoring system
  console.log(`Would upload: ${filename}`);
}

if (require.main === module) {
  runContinuousProfile().catch(console.error);
}

module.exports = { runContinuousProfile };
```

---

## Performance Baselines by Component

### API Endpoints

| Endpoint | Method | P50 | P95 | P99 | SLA |
|----------|--------|-----|-----|-----|-----|
| `/api/content/generate` | POST | 150ms | 450ms | 900ms | 500ms P95 |
| `/api/content/{id}` | GET | 50ms | 150ms | 300ms | 200ms P95 |
| `/api/auth/signup` | POST | 80ms | 180ms | 400ms | 200ms P95 |
| `/api/auth/login` | POST | 60ms | 120ms | 250ms | 200ms P95 |
| `/api/rate-limit/check` | POST | 5ms | 20ms | 45ms | 50ms P99 |
| `/api/health` | GET | 2ms | 5ms | 10ms | 50ms P99 |

### Database Operations

| Operation | P50 | P95 | P99 | Target |
|-----------|-----|-----|-----|--------|
| Simple SELECT | 10ms | 30ms | 50ms | < 100ms P99 |
| SELECT with JOIN | 30ms | 80ms | 120ms | < 100ms P99 |
| INSERT/UPDATE | 15ms | 50ms | 100ms | < 100ms P99 |
| Bulk INSERT (1000 rows) | 100ms | 200ms | 350ms | < 500ms P99 |
| Aggregate query | 50ms | 150ms | 250ms | < 200ms P99 |

### Cache Operations

| Cache | Hit Rate Target | Response Time |
|-------|-----------------|----------------|
| Generation results | > 90% | < 5ms |
| User profiles | > 80% | < 5ms |
| FX rates | > 95% | < 5ms |
| Rate limit buckets | > 99% | < 2ms |

---

## Alerts and Thresholds

### Critical Alerts (Page On-Call)

- API P95 latency > 500ms (5 min)
- Database P99 latency > 200ms (5 min)
- Error rate > 1% (5 min)
- Signup success rate < 99% (10 min)
- Cache hit ratio < 50% (15 min)

### Warning Alerts (Create Issue)

- API P95 latency > 300ms (10 min)
- Database P99 latency > 150ms (10 min)
- Sequential scan rate > 10%
- Unused indexes > 100MB
- Connection pool > 80% utilization

---

## Related Documentation

- [Optimization Checklist](./optimization-checklist.md) — Implementation procedures
- [Performance Budget](./performance-budget.md) — Acceptable limits and quarterly reviews
- [SLO Definitions](./slo-definitions.md) — Service level objectives
- [Monitoring Config](./monitoring-config.md) — Alerting setup

