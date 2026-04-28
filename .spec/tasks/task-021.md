---
task: 021
feature: stability-roadmap
status: pending
model: haiku
supervisor: software-cto
agent: software-developer-expert
depends_on: []
---

# Task 021: Add webhook secret guard at module initialization

## Skills
- .kit/skills/development/code-writing-software-development/SKILL.md
- .kit/skills/security-defensive/secrets-management/SKILL.md

## Agents
- @software-developer-expert

## Commands
- /verify

> Load the skills, agents, and commands listed above before reading anything else using their exact `.kit/` paths.

---

## Objective
Add explicit guard at module initialization to catch missing `RAZORPAY_WEBHOOK_SECRET` env var with a clear error message, instead of letting it fail with a cryptic runtime error in `verifyWebhookSignature`.

---

## Files

### Modify
| File | What to change |
|------|---------------|
| `lib/billing/razorpay.ts` | Top of file: Add env var validation guard |

---

## Dependencies
_(none)_

---

## API Contracts
_(none)_

---

## Code Templates

### `lib/billing/razorpay.ts` — before → after

**Before (lines 87–97, no guard):**
```typescript
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex');
  // ... rest of function
}
```

**After (add guard at module top):**
```typescript
import crypto from 'crypto';

// Validate required env vars at module init
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
if (!webhookSecret) {
  throw new Error('RAZORPAY_WEBHOOK_SECRET env var is required for webhook verification');
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');
  // ... rest of function
}
```

---

## Codebase Context

### Key Pattern
- **Env var validation:** Check all required environment variables at module load time (not at first use)
- **Fail fast:** Throw error immediately on startup if config is missing, not in handler

### Related Code
```typescript
// Current (bad): Non-null assertion with no guard
.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)

// Fixed: Guard at module top, use validated variable
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
if (!webhookSecret) {
  throw new Error('RAZORPAY_WEBHOOK_SECRET env var is required');
}
// ... later
.createHmac('sha256', webhookSecret)
```

---

## Handoff from Previous Task
_(none yet)_

---

## Implementation Steps
1. Open `lib/billing/razorpay.ts`
2. After import statements, add validation block:
   ```typescript
   const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
   if (!webhookSecret) {
     throw new Error('RAZORPAY_WEBHOOK_SECRET env var is required for webhook verification');
   }
   ```
3. In `verifyWebhookSignature` function, replace `process.env.RAZORPAY_WEBHOOK_SECRET!` with `webhookSecret`
4. Run: `/verify`
5. Test: Run app without setting `RAZORPAY_WEBHOOK_SECRET` env var → verify clear error at startup

_Skills: .kit/skills/security-defensive/secrets-management/SKILL.md — validate secrets at module init_

---

## Test Cases

```typescript
import * as razorpayModule from './razorpay';

describe('Razorpay module initialization', () => {
  it('throws error if RAZORPAY_WEBHOOK_SECRET is missing', async () => {
    // This test is implicit: if module loads without error, env var was set
    // To test the error case: unset RAZORPAY_WEBHOOK_SECRET and try to require the module
    const originalEnv = process.env.RAZORPAY_WEBHOOK_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    
    expect(() => {
      // Require/import the module
      require('./razorpay');
    }).toThrow('RAZORPAY_WEBHOOK_SECRET env var is required');
    
    // Restore env var
    process.env.RAZORPAY_WEBHOOK_SECRET = originalEnv;
  });

  it('verifyWebhookSignature works with valid env var', async () => {
    const rawBody = 'test body';
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(rawBody)
      .digest('hex');
    
    const result = razorpayModule.verifyWebhookSignature(rawBody, signature);
    expect(result).toBe(true);
  });

  it('verifyWebhookSignature rejects invalid signature', async () => {
    const rawBody = 'test body';
    const invalidSignature = 'invalid_signature_hash';
    
    const result = razorpayModule.verifyWebhookSignature(rawBody, invalidSignature);
    expect(result).toBe(false);
  });
});
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| RAZORPAY_WEBHOOK_SECRET missing | Throw `Error('RAZORPAY_WEBHOOK_SECRET env var is required...')` at module load |
| RAZORPAY_WEBHOOK_SECRET set | Use value for HMAC validation |
| Signature invalid | Return `false` (no exception) |
| Signature empty | Return `false` immediately |

---

## Acceptance Criteria
- [ ] WHEN `RAZORPAY_WEBHOOK_SECRET` is undefined THEN module throws clear error at load time
- [ ] WHEN `RAZORPAY_WEBHOOK_SECRET` is set THEN module loads successfully
- [ ] WHEN webhook has invalid signature THEN `verifyWebhookSignature()` returns `false`
- [ ] WHEN webhook has valid signature THEN `verifyWebhookSignature()` returns `true`
- [ ] Error message includes "RAZORPAY_WEBHOOK_SECRET" for clarity
- [ ] All existing tests pass
- [ ] `bun run type-check` — zero errors
- [ ] `/verify` passes

---

## Handoff to Next Task
_(fill via /task-handoff)_
