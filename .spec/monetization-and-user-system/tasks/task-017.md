---
task: 017
feature: monetization-and-user-system
status: pending
model: haiku
supervisor: software-cto
agent: software-developer-expert
depends_on: [11, 15]
---

# Task 017: Payment-Based Trust Upgrade

## Skills
- .kit/skills/development/code-writing-software-development/SKILL.md
- .kit/skills/testing-quality/security-review/SKILL.md
- .kit/skills/data-backend/postgres-patterns/SKILL.md

## Agents
- .kit/agents/software-company/engineering/software-developer-expert.md

## Commands
- .kit/commands/core/task-handoff.md
- .kit/commands/development/verify.md

> Load skills and agents listed above before reading anything else.

---

## Objective
On successful payment, raise user `trust_score` to `max(current, 80)` so paying users skip CAPTCHA; on chargeback, deduct 40 and clear the upgrade. Broadcast via Upstash Redis so middleware can reflect the change without DB hits.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `lib/billing/trustUpgrade.ts` | Trust upgrade + chargeback penalty |

### Modify
| File | What to change |
|------|---------------|
| `app/api/billing/webhook/route.ts` | Call `applyPaymentTrustUpgrade` after `fn_credit_topup` in payment.captured; call `applyChargebackPenalty` in payment.refunded if chargeback |
| `middleware.ts` | Read `trust_upgrade:{userId}` Redis key; inject `x-trust-upgraded: 1` header |
| `lib/abuse/trust.ts` | Export helper `getEffectiveTrustScore(userId)` that prefers Redis cache |

---

## Dependencies
```bash
# npm install @upstash/redis (already installed in task 11)
# ENV:
#   UPSTASH_REDIS_REST_URL
#   UPSTASH_REDIS_REST_TOKEN
```

---

## API Contracts
```
(Internal — no new public routes)

Webhook payment.captured → applyPaymentTrustUpgrade(userId)
Webhook payment.refunded with chargeback → applyChargebackPenalty(userId)

Middleware injects header: x-trust-upgraded: 1 (when Redis key present)
```

---

## Code Templates

### `lib/billing/trustUpgrade.ts`
```typescript
import { createClient } from '@/lib/supabase/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const TRUST_UPGRADE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const PAID_FLOOR = 80;
const CHARGEBACK_PENALTY = 40;

export async function applyPaymentTrustUpgrade(userId: string): Promise<{ previous: number; current: number }> {
  const supabase = createClient();
  const { data: user } = await supabase
    .from('users')
    .select('trust_score')
    .eq('id', userId)
    .single();

  if (!user) return { previous: 0, current: 0 };

  const previous = user.trust_score ?? 0;
  const current = Math.max(previous, PAID_FLOOR);

  if (current !== previous) {
    await supabase.from('users').update({ trust_score: current }).eq('id', userId);
    await supabase.from('trust_score_events').insert({
      user_id: userId,
      previous_score: previous,
      new_score: current,
      delta: current - previous,
      reason: 'payment_success',
    });
  }

  // Broadcast to middleware — overrides recompute window
  await redis.set(`trust_upgrade:${userId}`, current, { ex: TRUST_UPGRADE_TTL_SECONDS });

  return { previous, current };
}

export async function applyChargebackPenalty(userId: string): Promise<{ previous: number; current: number }> {
  const supabase = createClient();
  const { data: user } = await supabase
    .from('users')
    .select('trust_score')
    .eq('id', userId)
    .single();

  if (!user) return { previous: 0, current: 0 };

  const previous = user.trust_score ?? 0;
  const current = Math.max(0, previous - CHARGEBACK_PENALTY);

  await supabase.from('users').update({ trust_score: current }).eq('id', userId);
  await supabase.from('trust_score_events').insert({
    user_id: userId,
    previous_score: previous,
    new_score: current,
    delta: current - previous,
    reason: 'chargeback',
  });

  // Reactivate CAPTCHA
  await redis.del(`trust_upgrade:${userId}`);

  return { previous, current };
}

export async function isTrustUpgraded(userId: string): Promise<boolean> {
  const v = await redis.get(`trust_upgrade:${userId}`);
  return v !== null && v !== undefined;
}
```

### Webhook handler patches (`app/api/billing/webhook/route.ts`)
```typescript
import { applyPaymentTrustUpgrade, applyChargebackPenalty } from '@/lib/billing/trustUpgrade';

// Inside handlePaymentCaptured, AFTER fn_credit_topup:
async function handlePaymentCaptured(event: any) {
  const payment = event.payload.payment.entity;
  const userId = payment.notes?.user_id;
  if (!userId) return;
  // ... existing fn_credit_topup call ...
  await applyPaymentTrustUpgrade(userId);
}

// Inside handlePaymentRefunded:
async function handlePaymentRefunded(event: any) {
  const payment = event.payload.payment.entity;
  const refund = event.payload.refund?.entity;
  const userId = payment.notes?.user_id;
  if (!userId) return;

  const reason = (refund?.notes?.reason || refund?.speed_processed || '').toLowerCase();
  if (reason.includes('chargeback') || refund?.speed_requested === 'chargeback') {
    await applyChargebackPenalty(userId);
  }
}
```

### Middleware patch (`middleware.ts`)
```typescript
import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

// After auth resolution, before returning response:
if (user) {
  const upgraded = await redis.get(`trust_upgrade:${user.id}`);
  if (upgraded !== null && upgraded !== undefined) {
    response.headers.set('x-trust-upgraded', '1');
  }
}
return response;
```

### `lib/abuse/trust.ts` addition
```typescript
import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';

const redis = Redis.fromEnv();

export async function getEffectiveTrustScore(userId: string): Promise<number> {
  const cached = await redis.get(`trust_upgrade:${userId}`);
  if (cached !== null && cached !== undefined) {
    return Number(cached);
  }
  const { data } = await createClient()
    .from('users')
    .select('trust_score')
    .eq('id', userId)
    .single();
  return data?.trust_score ?? 0;
}
```

---

## Codebase Context

### Key Code Snippets
```typescript
// lib/abuse/trust.ts (existing from task 11)
export async function applyTrustEvent(userId: string, delta: number, reason: string): Promise<number>;
```

### Key Patterns in Use
- **Pattern:** Trust score writes always also insert into `trust_score_events` (audit log).
- **Pattern:** Redis cache mirrors a derived flag, NEVER replaces DB as source of truth.
- **Pattern:** Webhook handlers must be idempotent (already deduped at outer layer via `webhook_events`).

### Architecture Decisions
- ADR: Payment trust upgrade is `max(current, 80)`, not `+80`, to avoid runaway trust on repeat payers.
- ADR: Chargeback penalty is `-40` (not full reset) — preserves benefit of doubt for legitimate disputes.
- ADR: Redis key TTL is 30 days, matching typical billing cycle; on renewal payment, key is re-set.

---

## Handoff from Previous Task
**Files changed by previous task:** `app/api/billing/webhook/route.ts` (signature verify, idempotency, payment.captured, refunded handlers).
**Decisions made:** Webhook events deduplicated by event id in `webhook_events` table.
**Context for this task:** `users.trust_score` exists (task 11); Redis client configured.
**Open questions left:** None.

---

## Implementation Steps
1. `lib/billing/trustUpgrade.ts` — implement helpers
2. Modify `app/api/billing/webhook/route.ts` — wire calls
3. Modify `middleware.ts` — Redis lookup + header injection
4. Modify `lib/abuse/trust.ts` — add `getEffectiveTrustScore`
5. Run: `npx tsc --noEmit`
6. Run: `npm test -- trustUpgrade`
7. Run: `/verify`

_Requirements: 13, 16, 22_

---

## Test Cases

### File: `lib/billing/__tests__/trustUpgrade.test.ts`
```typescript
import { applyPaymentTrustUpgrade, applyChargebackPenalty, isTrustUpgraded } from '@/lib/billing/trustUpgrade';

jest.mock('@/lib/supabase/server');
jest.mock('@upstash/redis');

describe('applyPaymentTrustUpgrade', () => {
  let updateCalled: any;
  let eventInserted: any;
  let redisSet: jest.Mock;

  beforeEach(() => {
    updateCalled = null;
    eventInserted = null;
    redisSet = jest.fn().mockResolvedValue('OK');
    const { Redis } = require('@upstash/redis');
    Redis.fromEnv = () => ({ set: redisSet, del: jest.fn(), get: jest.fn() });
  });

  function mockSupabase(currentTrust: number) {
    const { createClient } = require('@/lib/supabase/server');
    createClient.mockReturnValue({
      from: (table: string) => {
        if (table === 'users') return {
          select: () => ({ eq: () => ({ single: async () => ({ data: { trust_score: currentTrust } }) }) }),
          update: (vals: any) => { updateCalled = vals; return { eq: () => Promise.resolve({}) }; },
        };
        if (table === 'trust_score_events') return {
          insert: (vals: any) => { eventInserted = vals; return Promise.resolve({}); },
        };
        return {};
      },
    });
  }

  it('raises trust from 30 to 80 and inserts audit event with delta +50', async () => {
    mockSupabase(30);
    const result = await applyPaymentTrustUpgrade('u1');
    expect(result).toEqual({ previous: 30, current: 80 });
    expect(updateCalled).toEqual({ trust_score: 80 });
    expect(eventInserted).toMatchObject({ user_id: 'u1', previous_score: 30, new_score: 80, delta: 50, reason: 'payment_success' });
    expect(redisSet).toHaveBeenCalledWith('trust_upgrade:u1', 80, { ex: 60 * 60 * 24 * 30 });
  });

  it('does NOT lower trust when current is already above floor (95)', async () => {
    mockSupabase(95);
    const result = await applyPaymentTrustUpgrade('u1');
    expect(result).toEqual({ previous: 95, current: 95 });
    expect(updateCalled).toBeNull();
    expect(eventInserted).toBeNull();
    expect(redisSet).toHaveBeenCalledWith('trust_upgrade:u1', 95, { ex: 60 * 60 * 24 * 30 });
  });

  it('still sets Redis key when score equals floor exactly', async () => {
    mockSupabase(80);
    await applyPaymentTrustUpgrade('u1');
    expect(updateCalled).toBeNull();
    expect(redisSet).toHaveBeenCalledWith('trust_upgrade:u1', 80, { ex: 60 * 60 * 24 * 30 });
  });

  it('returns zeros when user not found', async () => {
    const { createClient } = require('@/lib/supabase/server');
    createClient.mockReturnValue({
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }),
    });
    const result = await applyPaymentTrustUpgrade('missing');
    expect(result).toEqual({ previous: 0, current: 0 });
    expect(redisSet).not.toHaveBeenCalled();
  });
});

describe('applyChargebackPenalty', () => {
  let updateCalled: any;
  let eventInserted: any;
  let redisDel: jest.Mock;

  beforeEach(() => {
    updateCalled = null; eventInserted = null;
    redisDel = jest.fn().mockResolvedValue(1);
    const { Redis } = require('@upstash/redis');
    Redis.fromEnv = () => ({ del: redisDel, set: jest.fn(), get: jest.fn() });
  });

  function mockSupabase(currentTrust: number) {
    const { createClient } = require('@/lib/supabase/server');
    createClient.mockReturnValue({
      from: (table: string) => {
        if (table === 'users') return {
          select: () => ({ eq: () => ({ single: async () => ({ data: { trust_score: currentTrust } }) }) }),
          update: (vals: any) => { updateCalled = vals; return { eq: () => Promise.resolve({}) }; },
        };
        if (table === 'trust_score_events') return {
          insert: (vals: any) => { eventInserted = vals; return Promise.resolve({}); },
        };
        return {};
      },
    });
  }

  it('reduces trust by 40 and clears Redis upgrade key', async () => {
    mockSupabase(80);
    const result = await applyChargebackPenalty('u1');
    expect(result).toEqual({ previous: 80, current: 40 });
    expect(updateCalled).toEqual({ trust_score: 40 });
    expect(eventInserted).toMatchObject({ delta: -40, reason: 'chargeback' });
    expect(redisDel).toHaveBeenCalledWith('trust_upgrade:u1');
  });

  it('floors at 0 when penalty would go negative', async () => {
    mockSupabase(20);
    const result = await applyChargebackPenalty('u1');
    expect(result.current).toBe(0);
    expect(updateCalled).toEqual({ trust_score: 0 });
    expect(eventInserted.delta).toBe(-20);
  });
});

describe('isTrustUpgraded', () => {
  it('returns true when Redis key exists', async () => {
    const { Redis } = require('@upstash/redis');
    Redis.fromEnv = () => ({ get: jest.fn().mockResolvedValue(80), set: jest.fn(), del: jest.fn() });
    expect(await isTrustUpgraded('u1')).toBe(true);
  });

  it('returns false when Redis key absent', async () => {
    const { Redis } = require('@upstash/redis');
    Redis.fromEnv = () => ({ get: jest.fn().mockResolvedValue(null), set: jest.fn(), del: jest.fn() });
    expect(await isTrustUpgraded('u1')).toBe(false);
  });
});
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| Payment captured + current trust < 80 | Raise to 80, log event, set Redis key (30d TTL) |
| Payment captured + current trust >= 80 | Do NOT lower; log nothing; still set Redis key |
| Renewal payment captured | Same logic — re-sets Redis key (refreshes TTL) |
| Refund without chargeback flag | NO trust change |
| Refund with chargeback flag/reason | Subtract 40 (floor 0), log event, DELETE Redis key |
| User not found | Return zeros, no DB writes, no Redis writes |
| Redis call fails | Bubble up error — webhook will retry; idempotency in `webhook_events` prevents double-credit |

---

## Acceptance Criteria
- [ ] WHEN payment.captured fires for user with trust=30 THEN trust becomes 80 AND `trust_score_events` row inserted with delta=+50, reason='payment_success'
- [ ] WHEN payment.captured fires for user with trust=95 THEN trust stays 95 AND no event row inserted
- [ ] WHEN payment.captured fires THEN Redis key `trust_upgrade:{userId}` set with 30-day TTL
- [ ] WHEN refund with chargeback fires THEN trust decreases by 40 (min 0) AND Redis key deleted
- [ ] WHEN middleware sees Redis key THEN response carries `x-trust-upgraded: 1` header
- [ ] WHEN refund without chargeback flag fires THEN trust unchanged
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm test -- trustUpgrade` — all green
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
