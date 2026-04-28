# Performance Budget

Performance budgets define acceptable limits for key metrics. Regular review ensures the system maintains performance standards and catches degradation early.

---

## Size Budgets

### Bundle Size Budgets

**Total JavaScript Bundle:**
- Hard Limit: < 2MB (uncompressed)
- Soft Limit: < 500KB (gzipped)
- Target: < 300KB (gzipped)
- Alert Threshold: > 350KB gzipped (10% over target)

**By Bundle Chunk:**
- Main bundle: < 150KB gzipped
- Vendor bundle: < 200KB gzipped
- Individual route chunks: < 100KB gzipped
- Critical CSS: < 50KB gzipped

**Monitoring:**
```bash
# Build and measure
npm run build

# Check against budget
npx bundlesize --config .bundlesize.json

# Detailed analysis
npx webpack-bundle-analyzer dist/stats.json
```

**.bundlesize.json Configuration:**
```json
{
  "files": [
    {
      "path": "dist/main.*.js",
      "maxSize": "150KB"
    },
    {
      "path": "dist/vendor.*.js",
      "maxSize": "200KB"
    },
    {
      "path": "dist/*.js",
      "maxSize": "100KB"
    },
    {
      "path": "dist/main.css",
      "maxSize": "50KB"
    }
  ]
}
```

**Monthly Review:**
- Compare gzipped sizes to previous month
- Investigate increases > 5%
- Prioritize removal of unused dependencies
- Update budgets quarterly

### Critical CSS Budget

**Target: < 50KB**

Critical CSS is the minimum styling needed to render above-the-fold content. Should not block first paint.

**Optimization:**
```javascript
// Extract critical CSS using puppeteer
const puppeteer = require('puppeteer');
const critical = require('critical');

async function extractCritical() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000');
  
  const criticalCSS = await critical.generate({
    base: process.cwd() + '/dist',
    html: await page.content(),
    inline: true,
    minify: true
  });
  
  console.log(`Critical CSS: ${criticalCSS.length / 1024}KB`);
}
```

### Image Optimization Budget

**Target Sizes by Usage:**
- Hero images: < 200KB (optimized WebP)
- Thumbnails: < 50KB
- Icons: < 5KB
- Avatar images: < 20KB

**Tools:**
- `imagemin` for optimization
- `sharp` for resizing
- `webp` conversion
- CDN image optimization

**CI/CD Check:**
```bash
# Validate image sizes in CI
find dist -name "*.jpg" -o -name "*.png" | while read img; do
  size=$(du -k "$img" | cut -f1)
  echo "$img: ${size}KB"
  if [ "$size" -gt "200" ]; then
    echo "ERROR: Image exceeds 200KB budget: $img"
    exit 1
  fi
done
```

---

## Time Budgets

### API Response Time Budgets

**Content Generation (POST /api/content/generate)**
- P50: 150ms
- P95: < 500ms (hard limit)
- P99: < 1000ms
- Timeout: 30s
- Alert when P95 > 500ms for 5 consecutive minutes

**Content Retrieval (GET /api/content/{id})**
- P50: 50ms
- P95: < 150ms
- P99: < 300ms
- Alert when P95 > 200ms for 10 minutes

**Signup Flow (POST /api/auth/signup)**
- P50: 80ms
- P95: < 200ms
- P99: < 400ms
- Alert when P95 > 250ms

**Login (POST /api/auth/login)**
- P50: 60ms
- P95: < 120ms
- P99: < 250ms
- Alert when P95 > 150ms

**Rate Limit Check (POST /api/rate-limit/check)**
- P50: 5ms
- P95: < 20ms
- P99: < 50ms
- Alert when P99 > 100ms

**Health Check (GET /api/health)**
- P50: 2ms
- P95: < 5ms
- P99: < 10ms
- Alert when response > 20ms

### Database Query Budgets

**Simple SELECT Queries**
- P50: 10ms
- P95: < 30ms
- P99: < 50ms
- Alert when P99 > 100ms

**SELECT with JOINs**
- P50: 30ms
- P95: < 80ms
- P99: < 120ms
- Alert when P99 > 150ms

**INSERT/UPDATE Queries**
- P50: 15ms
- P95: < 50ms
- P99: < 100ms
- Alert when P99 > 150ms

**Bulk Operations (1000+ rows)**
- P50: 100ms
- P95: < 200ms
- P99: < 350ms
- Alert when P99 > 500ms

**Aggregate Queries**
- P50: 50ms
- P95: < 150ms
- P99: < 250ms
- Alert when P99 > 300ms

**Sequential Scans:**
- Target: < 5% of queries
- Alert when > 10%
- Investigate missing indexes

### Frontend Rendering Budgets

**First Contentful Paint (FCP):**
- Target: < 1.8s
- Good: < 1.0s
- Poor: > 3.0s

**Largest Contentful Paint (LCP):**
- Target: < 2.5s
- Good: < 1.2s
- Poor: > 4.0s

**Cumulative Layout Shift (CLS):**
- Target: < 0.1
- Good: < 0.05
- Poor: > 0.25

**Time to Interactive (TTI):**
- Target: < 3.8s
- Good: < 2.5s
- Poor: > 7.3s

### Monitoring Setup

```javascript
// src/utils/performance.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function reportWebVitals(metric: any) {
  // Send to monitoring service
  const payload = {
    name: metric.name,
    value: metric.value,
    id: metric.id,
    navigationType: metric.navigationType,
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Web Vitals:', metric);
  }

  // Send to analytics/monitoring
  navigator.sendBeacon('/api/analytics/vitals', JSON.stringify(payload));
}

// Register all metrics
getCLS(reportWebVitals);
getFID(reportWebVitals);
getFCP(reportWebVitals);
getLCP(reportWebVitals);
getTTFB(reportWebVitals);
```

---

## Network Budgets

### HTTP Request Budget

**Total Request Count:**
- Target: < 50 requests per page
- Good: < 40 requests
- Poor: > 100 requests

**Breakdown:**
- CSS files: < 5 requests
- JavaScript files: < 10 requests
- Images: < 15 requests
- Fonts: < 5 requests
- API calls: < 10 requests
- Third-party scripts: < 5 requests

### HTTP Request Size Budget

**Total Page Weight:**
- HTML: < 50KB
- CSS: < 100KB
- JavaScript: < 300KB (gzipped) / 1MB (uncompressed)
- Images: < 500KB
- Fonts: < 200KB
- Total: < 2MB

**Average Request Size:**
- Target: < 40KB
- Alert when > 50KB

### Data Transfer Budget

**Mobile (3G):**
- Total page load: < 5 seconds
- First interactive: < 8 seconds
- Full load: < 15 seconds

**Desktop (LTE):**
- Total page load: < 2 seconds
- First interactive: < 3 seconds
- Full load: < 5 seconds

**Monitoring Network Requests:**
```javascript
// Track network metrics
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const duration = entry.responseEnd - entry.startTime;
    const size = entry.transferSize;

    console.log(`${entry.name}: ${duration.toFixed(2)}ms, ${size}B`);

    // Alert on slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        url: entry.name,
        duration,
        size
      });
    }

    // Alert on large requests
    if (size > 500000) {
      logger.warn('Large request detected', {
        url: entry.name,
        size
      });
    }
  }
});

observer.observe({ entryTypes: ['resource'] });
```

---

## Cache Hit Ratio Budgets

### By Cache Layer

**Redis Cache (User Data):**
- Target: > 80%
- Good: > 85%
- Alert when < 70%

**Redis Cache (Application Data):**
- Target: > 85%
- Good: > 90%
- Alert when < 75%

**CDN Cache (Static Assets):**
- Target: > 95%
- Good: > 97%
- Alert when < 90%

**Browser Cache (Long-term Assets):**
- Target: 100% (should not re-request)
- Validate with lighthouse and webpagetest

### Hit Ratio Improvement Plan

**If hit ratio drops below target:**

1. **Investigate (24 hours)**
   - Check invalidation logs
   - Monitor for data churn
   - Analyze cache evictions

2. **Quick Fix (48 hours)**
   - Increase cache TTL
   - Adjust invalidation strategy
   - Pre-warm caches

3. **Long-term (1 week)**
   - Update caching logic
   - Add read-through patterns
   - Implement batch loading

---

## Process to Update Budgets Quarterly

### Quarterly Budget Review Process

**Schedule: First week of each quarter (Jan, Apr, Jul, Oct)**

### Week 1: Data Collection

**Monday-Friday:**
- Gather performance metrics for past quarter
- Export data from monitoring system
- Generate trend reports
- Identify outliers and anomalies

**Data Sources:**
```bash
# Export metrics from monitoring
curl "https://monitoring.example.com/api/metrics?period=quarter" \
  > quarterly-metrics.json

# Run performance audit
npm run audit:performance

# Generate lighthouse reports
npm run lighthouse -- --output=json > lighthouse-results.json
```

### Week 2: Analysis and Recommendations

**Monday-Tuesday: Analyze Trends**
- Compare metrics to previous quarters
- Identify improving/degrading categories
- Calculate growth rates
- Document anomalies

**Example Analysis Template:**
```markdown
## Q2 2026 Performance Review

### API Response Times
- Content Generation: 450ms P95 (was 480ms Q1) ✓ Improved 6%
- Signup: 195ms P95 (was 190ms Q1) ✗ Degraded 3%
- Rate Limit: 18ms P99 (was 22ms Q1) ✓ Improved 18%

**Recommendation:** Investigate signup degradation, likely from new validation

### Bundle Size
- Main bundle: 145KB (was 140KB Q1) ✗ Grew 3.5%
- Vendor: 195KB (was 195KB Q1) → No change
- Total: 285KB (was 280KB Q1) ✗ Grew 1.8%

**Recommendation:** Review recent dependencies, consider tree-shaking
```

**Wednesday: Propose New Budgets**
- Identify categories within trend bounds
- Set aggressive but achievable targets
- Document rationale for changes
- Get team feedback

### Week 3: Budget Updates and Communication

**Thursday: Update Documentation**

```bash
# Update performance-budget.md with new targets
# Update performance-profiling.md with new baselines
# Create quarterly review document
```

**Friday: Team Communication**

- [ ] Present findings to engineering team
- [ ] Review proposed budget changes
- [ ] Address concerns and questions
- [ ] Publish new targets
- [ ] Update monitoring alerts

### Quarterly Review Meeting

**Agenda (1 hour):**

1. **Performance Trends** (15 min)
   - Show graphs of all metrics
   - Highlight improvements and regressions
   - Discuss root causes

2. **Budget Changes** (20 min)
   - Propose new targets
   - Explain rationale
   - Get consensus on changes

3. **Action Items** (15 min)
   - Identify optimization opportunities
   - Assign responsibility
   - Set deadlines

4. **Q&A** (10 min)
   - Answer team questions
   - Clarify expectations
   - Discuss trade-offs

### Budget Update Template

When budgets change, update the following files:

**1. Update performance-budget.md**
```markdown
**Effective: [Date]**
**Last Updated: [Date]**

### Previous Quarter Comparison
| Metric | Q1 Target | Q1 Actual | Q2 Target | Change |
|--------|-----------|-----------|-----------|--------|
| API P95 | 500ms | 480ms | 450ms | -50ms |
| DB P99 | 100ms | 95ms | 90ms | -10ms |
```

**2. Update performance-profiling.md**
```markdown
## Baseline Metrics for Critical Operations

Last Updated: [Date]
Effective Through: [Next Quarter Date]

### Content Generation API
- **Target P95 Latency:** < 450ms (was < 500ms)
- Rationale: Consistent improvement over 3 quarters
```

**3. Create Quarterly Report**
```bash
# File: docs/quarterly-performance-[QUARTER]-[YEAR].md
```

### Escalation Path

If a budget is consistently missed:

**Week 1:** Create issue to investigate
**Week 2:** Root cause analysis and proposal
**Week 3:** Either:
- Execute optimization plan
- Adjust budget with justification
- Mark as known limitation

---

## Performance Budget Compliance Tracking

### CI/CD Integration

**GitHub Actions Workflow:**

```yaml
name: Performance Budget Check

on:
  pull_request:
  push:
    branches: [main]

jobs:
  budget-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build project
        run: npm run build
      
      - name: Check bundle size
        run: npx bundlesize --config .bundlesize.json
      
      - name: Check Web Vitals
        run: npm run lighthouse
      
      - name: Database query analysis
        run: npm run analyze:queries
      
      - name: Report results
        if: always()
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('budget-results.json'));
            
            let status = 'PASS';
            let details = '';
            
            results.forEach(check => {
              const emoji = check.passed ? '✅' : '❌';
              details += `${emoji} ${check.name}: ${check.value}\n`;
              if (!check.passed) status = 'FAIL';
            });
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Performance Budget Check: ${status}\n${details}`
            });
```

### Quarterly Budget Summary

**Template for quarterly review document:**

```markdown
# Quarterly Performance Budget Review: Q2 2026

**Review Date:** April 1, 2026
**Next Review:** July 1, 2026

## Budget Compliance Summary

| Category | Q1 Target | Q1 Actual | Q2 Target | Status |
|----------|-----------|-----------|-----------|--------|
| Bundle Size | 300KB | 285KB | 280KB | ✓ PASS |
| API P95 | 500ms | 450ms | 450ms | ✓ PASS |
| DB P99 | 100ms | 95ms | 90ms | ✓ PASS |
| Cache Hit | 80% | 82% | 85% | ✓ PASS |

## Key Improvements

1. API performance improved 10% (480ms → 450ms)
2. Cache hit ratio increased from 78% to 82%
3. Bundle size reduced 2% through tree-shaking

## Areas for Improvement

1. Signup latency increased 3% (needs investigation)
2. Database query P99 approaching limit

## Approved Budget Changes

- API P95: 500ms → 450ms (based on consistent improvement)
- Cache Hit Ratio: 80% → 85% (achievable with current systems)

## Action Items

1. Investigate signup latency increase
2. Optimize top 5 slow queries
3. Implement cache warming on startup
```

---

## Emergency Budget Adjustments

### When to Adjust Budgets

**Valid Reasons:**
- Consistent inability to meet target (3+ weeks)
- New feature significantly changes baseline
- System limitation discovered
- Business requirement change

**Invalid Reasons:**
- Single bad measurement
- Temporary incident
- "It's too hard"

### Adjustment Approval Process

1. **Create issue** documenting reason and data
2. **Get approval** from performance lead and tech lead
3. **Update documentation** with effective date
4. **Notify team** of change
5. **Monitor closely** for 1 month after change

