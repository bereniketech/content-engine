---
task: 026
feature: stability-roadmap
status: pending
model: haiku
supervisor: software-cto
agent: devops-infra-expert
depends_on: []
---

# Task 026: Set up load testing environment and scenarios

## Skills
- .kit/skills/testing-quality/k6-load-testing/SKILL.md
- .kit/skills/devops/terminal-cli-devops/SKILL.md

## Agents
- @devops-infra-expert

## Commands
- /verify

---

## Objective
Install and configure Artillery (or k6) for load testing, create test scenarios for signup, content generation, and webhook endpoints, and document baseline configuration for Phase 3 testing.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `load-tests/load-test.yml` | Artillery configuration for all scenarios |
| `load-tests/README.md` | Load testing guide and how to run |
| `load-tests/scenarios.js` | Custom payload generators for realistic traffic |

---

## Dependencies
_(none)_

---

## Code Templates

### `load-tests/load-test.yml` (Artillery config)

```yaml
config:
  target: "http://localhost:3000"  # or staging URL
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Ramp up to load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"
  processor: "./scenarios.js"

scenarios:
  # Scenario 1: Content generation (30 concurrent, 30/min rate limit)
  - name: "Content generation flow"
    weight: 40
    flow:
      - post:
          url: "/api/content/generate"
          headers:
            Authorization: "Bearer {{ $randomString(32) }}"
            Content-Type: "application/json"
          json:
            action_type: "generate"
            prompt: "Write a 100-word blog post about {{ topic }}"
            options:
              max_tokens: 2048
          expect:
            - statusCode: 200
            - hasProperty: result
          capture:
            json: "$.tokens_used"
            as: "tokens"
          think: 2

  # Scenario 2: Signup flow (IP rate limit: 3 per 24h)
  - name: "Signup flow"
    weight: 30
    flow:
      - post:
          url: "/api/auth/signup"
          headers:
            Content-Type: "application/json"
            x-forwarded-for: "{{ $randomIP }}"
          json:
            email: "user-{{ $randomNumber(10000) }}@example.com"
            password: "SecurePassword123!"
            fingerprint_hash: "{{ fingerprint }}"
          expect:
            - statusCode: 201
          think: 1

  # Scenario 3: Webhook processing (100/min rate limit)
  - name: "Razorpay webhook"
    weight: 30
    flow:
      - post:
          url: "/api/webhooks/razorpay"
          headers:
            Content-Type: "application/json"
            x-razorpay-signature: "{{ signature }}"
          json:
            event: "payment.captured"
            payload:
              payment:
                id: "pay_{{ $randomString(12) }}"
                amount: 10000
                status: "captured"
          expect:
            - statusCode: 200

before:
  flow:
    - think: 1

after:
  flow:
    - think: 1
```

### `load-tests/scenarios.js` (Payload generators)

```javascript
module.exports = {
  generateTopic: generateTopic,
  generateFingerprint: generateFingerprint,
  generateSignature: generateSignature,
  randomIP: randomIP,
};

function generateTopic() {
  const topics = [
    "AI in healthcare",
    "Climate change solutions",
    "Space exploration",
    "Quantum computing",
    "Machine learning",
  ];
  return topics[Math.floor(Math.random() * topics.length)];
}

function generateFingerprint() {
  // Simulated device fingerprint hash
  return 'fp_' + Math.random().toString(36).substring(2, 15);
}

function generateSignature() {
  // Simulated Razorpay signature (would need real signing in production)
  return 'sig_' + Math.random().toString(36).substring(2, 30);
}

function randomIP() {
  return [
    Math.floor(Math.random() * 256),
    Math.floor(Math.random() * 256),
    Math.floor(Math.random() * 256),
    Math.floor(Math.random() * 256),
  ].join('.');
}
```

### `load-tests/README.md`

```markdown
# Load Testing

## Setup

```bash
npm install -g artillery
# or
npm install -g k6
```

## Run Tests

### Warm-up (60s, 10/s)
```bash
artillery run load-tests/load-test.yml --target http://localhost:3000
```

### Full load test (5 min, ramp to 100/s)
```bash
artillery run load-tests/load-test.yml \
  --target http://staging.example.com \
  -o load-tests/results.json
```

### Generate HTML report
```bash
artillery report load-tests/results.json --output load-tests/report.html
```

## Success Criteria

- ✅ Signup: 3 per IP per 24h (test will hit rate limit at 4th attempt)
- ✅ Generation: 30 per user per minute
- ✅ Webhooks: 100 per IP per minute
- ✅ P95 latency: <500ms
- ✅ Error rate: <1%
- ✅ No DB connection pool exhaustion
- ✅ Redis ops: <50ms p99

## Debugging

Check `/api/health` endpoint:
```bash
curl http://localhost:3000/api/health
```

Monitor logs:
```bash
tail -f logs/app.log
```

Check rate limit headers:
```bash
curl -v http://localhost:3000/api/content/generate \
  -H "Authorization: Bearer token"
```
```

---

## Acceptance Criteria
- [ ] Artillery (or k6) installed globally
- [ ] `load-tests/load-test.yml` created with 3 scenarios (generation, signup, webhook)
- [ ] `load-tests/scenarios.js` created with payload generators
- [ ] `load-tests/README.md` created with usage instructions
- [ ] Load test runs without errors: `artillery run load-tests/load-test.yml`
- [ ] Test generates HTML report
- [ ] Scenarios match Phase 3 test spec (100 concurrent, 1000 signups, webhook burst)
- [ ] `/verify` passes

---

## Implementation Steps
1. Install Artillery: `npm install -g artillery`
2. Create `load-tests/` directory
3. Create `load-tests/load-test.yml` with scenarios
4. Create `load-tests/scenarios.js` with payload generators
5. Create `load-tests/README.md` with documentation
6. Test locally: `artillery run load-tests/load-test.yml --target http://localhost:3000`
7. Verify output: `load-tests/results.json` and HTML report generated
8. Run `/verify`

---

## Test Cases

```bash
# Test 1: Run warm-up load (10/s for 60s)
artillery run load-tests/load-test.yml --target http://localhost:3000

# Expected output:
# - Scenario "Content generation flow": 600 requests
# - Scenario "Signup flow": 450 requests
# - Scenario "Razorpay webhook": 450 requests
# - Errors: <1%

# Test 2: Check results file
test -f load-tests/results.json && echo "Results file created"

# Test 3: Generate HTML report
artillery report load-tests/results.json --output load-tests/report.html
test -f load-tests/report.html && echo "Report created"

# Test 4: Verify load test config
artillery check load-tests/load-test.yml
# Expected: "Configuration is valid"
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| Artillery not found | Install: `npm install -g artillery` |
| Test times out | Lower arrivalRate or duration |
| Payload errors | Verify YAML syntax, ensure processors exist |
| Rate limiting triggered | Expected behavior; verify correct limits apply |

---

## Handoff to Next Task
_(fill via /task-handoff)_
