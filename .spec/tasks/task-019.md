---
task: 019
feature: stability-roadmap
status: pending
model: haiku
supervisor: software-cto
agent: test-expert
depends_on: [task-007]
---

# Task 019: Write comprehensive tests for signup anti-abuse flow

## Objective
Add tests for IP limits, VPN detection, device fingerprinting, and early validation.

## Files
### Create
| File | Purpose |
|------|---------|
| `app/api/auth/signup/route.test.ts` | Test suite for signup flow |

## Test Cases

```typescript
describe('signup flow', () => {
  it('blocks signup from IP with 3+ existing', async () => {
    // Max out IP at 3 signups
    // Verify: 4th blocked with 429
  });

  it('detects VPN and applies trust penalty', async () => {
    // Mock VPN detection result
    // Verify: Trust penalty applied
  });

  it('blocks device with 4+ accounts before creating auth user', async () => {
    // Device already has 4+ accounts
    // Verify: 403 returned, NO auth user created
  });

  it('creates auth user only after all checks pass', async () => {
    // All validation checks pass
    // Verify: Auth user created
  });

  it('validates email and existing accounts early', async () => {
    // Email validation should happen first
    // Verify: 422 returned before device check
  });
});
```

## Acceptance Criteria
- [ ] Test: IP rate limit at 3 per 24h
- [ ] Test: VPN detected and penalized
- [ ] Test: Device with 4+ accounts → no auth user
- [ ] Test: Email/existing checks happen first
- [ ] Test: Auth user NOT created if device blocked
- [ ] All tests pass
- [ ] `/verify` passes
