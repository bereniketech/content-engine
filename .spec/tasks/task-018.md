---
task: 018
feature: stability-roadmap
status: pending
model: haiku
supervisor: software-cto
agent: test-expert
depends_on: []
---

# Task 018: Write comprehensive tests for credit generation and refund flow

## Objective
Add tests covering happy path, insufficient credits, AI failure, and refund RPC failure.

## Files
### Create
| File | Purpose |
|------|---------|
| `lib/credits/generate.test.ts` | Test suite for generateWithDeduction |

## Test Cases

```typescript
describe('generateWithDeduction', () => {
  it('deducts credits and generates content', async () => {
    // Happy path: user has credits, AI succeeds
    // Verify: credits deducted, content returned
  });

  it('returns 402 if insufficient credits', async () => {
    // User has 0 credits
    // Verify: Returns 402 error, no deduction
  });

  it('refunds credits if AI fails', async () => {
    // AI throws error after deduction
    // Verify: Credits refunded via RPC
  });

  it('logs generation with tokens and latency', async () => {
    // Happy path with logging
    // Verify: generation_log has timestamp, token_count, latency
  });

  it('alerts on refund RPC failure', async () => {
    // Refund RPC throws error
    // Verify: Error logged, Inngest job queued
  });
});
```

## Acceptance Criteria
- [ ] Test: Happy path deducts credits
- [ ] Test: AI failure triggers refund RPC
- [ ] Test: Insufficient credits returns 402
- [ ] Test: Refund RPC failure is logged
- [ ] Test: Generation log records timestamp, tokens
- [ ] All tests pass
- [ ] `/verify` passes
