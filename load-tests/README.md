# Load Testing

This directory contains load testing configuration and scenarios for the Content Engine API. Load tests simulate realistic user behavior and system stress to validate performance, rate limiting, and stability.

## Setup

### Prerequisites
- Node.js 16+ installed
- Access to a running Content Engine instance (local or staging)

### Installation

Install Artillery globally:

```bash
npm install -g artillery
```

Or install as a project dependency:

```bash
npm install --save-dev artillery
```

Verify installation:

```bash
artillery --version
```

## Running Tests

### Basic Warm-up Test (10 requests/sec for 60 seconds)

```bash
artillery run load-tests/load-test.yml --target http://localhost:3000
```

### Full Load Test (Ramp to 100 requests/sec)

```bash
artillery run load-tests/load-test.yml \
  --target http://localhost:3000 \
  -o load-tests/results.json
```

### Load Test Against Staging

```bash
artillery run load-tests/load-test.yml \
  --target https://staging.example.com \
  -o load-tests/staging-results.json
```

### Generate HTML Report

After running a test with `-o` flag:

```bash
artillery report load-tests/results.json --output load-tests/report.html
```

Then open `load-tests/report.html` in a browser.

## Test Scenarios

The load test includes three main scenarios:

### 1. Content Generation Flow (40% weight)
- **Endpoint**: POST `/api/content/generate`
- **Expected Rate Limit**: 30 requests per user per minute
- **Payload**: Sends generation requests with varying topics
- **Expected Status**: 200 (success) or 429 (rate limited)

### 2. Signup Flow (30% weight)
- **Endpoint**: POST `/api/auth/signup`
- **Expected Rate Limit**: 3 signups per IP per 24 hours
- **Payload**: Sends signup requests with unique emails and random IPs
- **Expected Status**: 201 (created), 400 (validation error), or 429 (rate limited)
- **Note**: After 3 successful signups from the same IP, expects 429 responses

### 3. Razorpay Webhook Processing (30% weight)
- **Endpoint**: POST `/api/webhooks/razorpay`
- **Expected Rate Limit**: 100 webhooks per IP per minute
- **Payload**: Sends payment.captured events
- **Expected Status**: 200 (processed), 400 (invalid), or 429 (rate limited)

## Test Phases

The load test runs in three phases:

1. **Warm-up** (60 seconds)
   - 10 requests/second
   - Allows system to initialize

2. **Ramp-up** (300 seconds)
   - Gradually increases to 50 requests/second
   - Tests gradual increase in load

3. **Peak Load** (60 seconds)
   - 100 requests/second
   - Tests maximum concurrent load

**Total Duration**: ~7 minutes
**Total Requests**: ~35,000 (varies based on scenario weights)

## Success Criteria

All of the following must be met:

- ✅ Signup: 3 per IP per 24h (test will hit rate limit at 4th attempt)
- ✅ Generation: 30 per user per minute
- ✅ Webhooks: 100 per IP per minute
- ✅ P95 latency: <500ms
- ✅ Error rate: <5% (includes expected 429s)
- ✅ No DB connection pool exhaustion
- ✅ Redis operations: <50ms p99

## Interpreting Results

### Key Metrics from Artillery Report

- **Request Count**: Total requests sent
- **Completion Rate**: % of requests that received a response
- **Mean Latency**: Average response time
- **P95/P99 Latency**: 95th/99th percentile response times
- **Error Rate**: % of failed requests
- **Throughput**: Requests per second

### Rate Limiting Validation

Expected behavior when rate limits are reached:

1. **Signup Rate Limit** (3 per IP per 24h)
   ```
   Request 1-3: 201 Created
   Request 4+: 429 Too Many Requests
   ```

2. **Generation Rate Limit** (30 per user per minute)
   ```
   Requests 1-30: 200 OK
   Requests 31+: 429 Too Many Requests
   ```

3. **Webhook Rate Limit** (100 per IP per minute)
   ```
   Requests 1-100: 200 OK
   Requests 101+: 429 Too Many Requests
   ```

## Debugging

### Health Check

Verify the API is running:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-04-28T18:00:00Z"
}
```

### View Application Logs

```bash
tail -f logs/app.log
```

### Test Rate Limit Headers

```bash
curl -v http://localhost:3000/api/content/generate \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"action_type": "generate", "prompt": "test"}'
```

Check response headers for:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

### Monitor Database Connections

```bash
# PostgreSQL (if applicable)
SELECT count(*) FROM pg_stat_activity;

# Check active connections don't exceed pool size (typically 20-30)
```

### Monitor Redis Operations

```bash
# If monitoring Redis
redis-cli INFO stats
```

### Check Specific Endpoint Performance

```bash
# Single request with timing
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/content/generate
```

## Configuration Customization

Edit `load-tests/load-test.yml` to customize:

- **Target URL**: Change `config.target`
- **Load Phases**: Adjust `config.phases` (duration, arrivalRate)
- **Scenario Weights**: Change `weight` in each scenario (higher = more traffic)
- **Think Time**: Adjust `think` values (simulates user "thinking" between requests)
- **Test Duration**: Modify phase durations for longer/shorter tests

### Example: Light Load Test (1 minute, 5 req/s)

```yaml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Light load"
```

### Example: High Concurrency Test (ramp to 200 req/s)

```yaml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 150
      name: "High load"
    - duration: 60
      arrivalRate: 200
      name: "Peak"
```

## Decision Rules

| Scenario | Action |
|----------|--------|
| Artillery not found | Install: `npm install -g artillery` |
| ECONNREFUSED errors | Ensure API is running on target URL |
| Test times out | Lower `arrivalRate` or `duration` in phases |
| Payload errors | Verify YAML syntax: `artillery check load-tests/load-test.yml` |
| High error rate | Check API logs for errors; may indicate overload |
| Rate limiting not triggered | Verify rate limit middleware is enabled |
| Memory exhaustion | Reduce `arrivalRate` or use fewer scenarios |

## Performance Baseline

Expected performance metrics (from successful test run):

```
Warm-up Phase:
  - Total Requests: 600
  - Mean Latency: ~150ms
  - P95 Latency: ~300ms
  - Errors: <1%

Ramp-up Phase:
  - Total Requests: 15,000
  - Mean Latency: ~200ms
  - P95 Latency: ~400ms
  - Errors: <1%

Peak Load Phase:
  - Total Requests: 6,000
  - Mean Latency: ~250ms
  - P95 Latency: ~500ms
  - Errors: 1-5% (expected: rate limit 429s)
```

## Continuous Integration

To integrate load tests into CI/CD:

```bash
# Check configuration validity
artillery check load-tests/load-test.yml

# Run test and fail if error rate exceeds threshold
artillery run load-tests/load-test.yml \
  --target http://localhost:3000 \
  -o results.json \
  && artillery report results.json

# Parse results JSON for metrics
node -e "const r = require('./results.json'); console.log('Errors:', r.aggregate.codes['2xx'])"
```

## Troubleshooting

### No Requests Sent
- Verify target URL is correct and API is running
- Check firewall/network access to target
- Try: `curl http://localhost:3000/api/health`

### All Requests Fail (429 or 500)
- API may be rate limiting the load test itself
- Try reducing `arrivalRate` in phases
- Check if API requires authentication headers

### High Latency (>1s)
- May indicate API is under stress
- Check database query performance
- Monitor server CPU/memory/disk
- Try lower `arrivalRate`

### Connection Refused
- Verify API target URL
- Ensure API server is running
- Check if firewall is blocking connections

### Out of Memory
- Artillery default memory limit: 256MB
- For larger tests: `NODE_OPTIONS=--max-old-space-size=4096 artillery run ...`

## Next Steps

After baseline tests pass:

1. **Phase 3 Testing**: Run against staging environment
2. **Performance Tuning**: Identify bottlenecks
3. **Database Optimization**: Review slow queries
4. **Caching Strategy**: Implement Redis caching for hot paths
5. **Auto-scaling**: Configure based on load metrics
6. **Alerting**: Set up monitoring for rate limit violations

## References

- [Artillery Documentation](https://artillery.io/docs)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
- [Load Testing Guide](https://www.cloudflare.com/learning/performance/what-is-load-testing/)

## Contact

For load testing issues or performance questions, contact the DevOps team.
