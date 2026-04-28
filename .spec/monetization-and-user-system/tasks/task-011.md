---
task: 011
feature: monetization-and-user-system
status: pending
model: haiku
supervisor: software-cto
agent: software-developer-expert
depends_on: [1, 2, 3]
---

# Task 011: Trust Scoring Engine

## Skills
- .kit/skills/data-backend/postgres-patterns/SKILL.md
- .kit/skills/development/code-writing-software-development/SKILL.md
- .kit/skills/testing-quality/security-review/SKILL.md
- .kit/skills/testing-quality/tdd-workflow/SKILL.md

## Agents
- .kit/agents/software-company/engineering/software-developer-expert.md

## Commands
- .kit/commands/core/task-handoff.md
- .kit/commands/development/verify.md

> Load the skills and agents listed above before reading anything else.

---

## Objective
Implement an atomic, monotonic trust scoring engine that adjusts user trust score based on signals (disposable email, VPN, multi-account, payment success, etc.) and resolves trust tiers + CAPTCHA gating.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `lib/abuse/trust.ts` | Trust event application + tier resolution + CAPTCHA gating |
| `supabase/migrations/20260428000004_fn_apply_trust_delta.sql` | SECURITY DEFINER atomic delta function with audit log |
| `lib/abuse/trust.test.ts` | Unit tests for tier resolution + CAPTCHA logic |

### Modify
| File | What to change |
|------|---------------|
| `app/api/auth/signup/route.ts` (task 6) | Call `applyTrustEvent(userId, 'disposable_email')` when disposable |
| `app/api/auth/verify-email/route.ts` (task 6) | Call `applyTrustEvent(userId, 'email_verified')` on success |

---

## Dependencies
```bash
# No new npm packages
# ENV: (uses existing SUPABASE_SERVICE_ROLE_KEY)
```

---

## API Contracts
```
applyTrustEvent(userId: string, event: TrustEvent) -> { newScore: number; delta: number }
resolveTrustTier(score: number) -> 'full' | 'standard' | 'reduced' | 'suspended'
requiresCaptcha(score: number, isSuspiciousAction: boolean) -> boolean
```

---

## Code Templates

### `lib/abuse/trust.ts`
```typescript
import { createClient } from '@/lib/supabase/server';

export type TrustEvent =
  | 'disposable_email'
  | 'vpn_detected'
  | 'multi_account_device'
  | 'email_verified'
  | 'payment_success'
  | 'consistent_7day_usage'
  | 'admin_abuse_flag'
  | 'rapid_signup'
  | 'action_frequency_abuse'
  | 'identical_requests';

const DELTAS: Partial<Record<TrustEvent, number>> = {
  disposable_email: -30,
  vpn_detected: -15,
  multi_account_device: -25,
  email_verified: 10,
  payment_success: 30,
  consistent_7day_usage: 5,
  rapid_signup: -20,
  action_frequency_abuse: -10,
  identical_requests: -5,
};

export async function applyTrustEvent(
  userId: string,
  event: TrustEvent
): Promise<{ newScore: number; delta: number }> {
  const supabase = createClient();

  if (event === 'admin_abuse_flag') {
    const { data: user } = await supabase
      .from('users')
      .select('trust_score')
      .eq('id', userId)
      .single();
    if (!user) throw new Error('User not found');
    const prev = user.trust_score;
    await supabase.from('users').update({ trust_score: 0 }).eq('id', userId);
    await supabase.from('trust_score_events').insert({
      user_id: userId,
      previous_score: prev,
      new_score: 0,
      delta: -prev,
      reason: event,
    });
    if (prev > 0) {
      await supabase.from('users').update({ account_status: 'restricted' }).eq('id', userId);
    }
    return { newScore: 0, delta: -prev };
  }

  const delta = DELTAS[event];
  if (delta === undefined) throw new Error(`Unknown trust event: ${event}`);

  const { data, error } = await supabase.rpc('fn_apply_trust_delta', {
    p_user_id: userId,
    p_delta: delta,
    p_reason: event,
  });
  if (error) throw error;
  const result = data as { previous_score: number; new_score: number };

  if (result.new_score < 20) {
    await supabase.from('users').update({ account_status: 'restricted' }).eq('id', userId);
  }

  return { newScore: result.new_score, delta };
}

export function resolveTrustTier(
  score: number
): 'full' | 'standard' | 'reduced' | 'suspended' {
  if (score >= 80) return 'full';
  if (score >= 40) return 'standard';
  if (score >= 20) return 'reduced';
  return 'suspended';
}

export function requiresCaptcha(score: number, isSuspiciousAction: boolean): boolean {
  if (score >= 80) return false;
  if (score >= 40 && isSuspiciousAction) return true;
  if (score < 40) return true;
  return false;
}
```

### `supabase/migrations/20260428000004_fn_apply_trust_delta.sql`
```sql
CREATE OR REPLACE FUNCTION fn_apply_trust_delta(
  p_user_id uuid,
  p_delta integer,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev integer;
  v_new integer;
BEGIN
  SELECT trust_score INTO v_prev FROM users WHERE id = p_user_id FOR UPDATE;
  IF v_prev IS NULL THEN
    RAISE EXCEPTION 'User % not found', p_user_id;
  END IF;
  v_new := GREATEST(0, LEAST(100, v_prev + p_delta));
  UPDATE users SET trust_score = v_new, updated_at = now() WHERE id = p_user_id;
  INSERT INTO trust_score_events (user_id, previous_score, new_score, delta, reason)
  VALUES (p_user_id, v_prev, v_new, p_delta, p_reason);
  RETURN jsonb_build_object('previous_score', v_prev, 'new_score', v_new);
END;
$$;

REVOKE ALL ON FUNCTION fn_apply_trust_delta(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_apply_trust_delta(uuid, integer, text) TO service_role;
```

---

## Codebase Context

### Key Code Snippets
```typescript
// users table columns — supabase/migrations (task 2)
// id uuid PK, trust_score integer DEFAULT 50, account_status text, updated_at timestamptz
// trust_score_events — task 2: id, user_id, previous_score, new_score, delta, reason, created_at
```

### Key Patterns in Use
- **Pattern:** All score mutations route through `fn_apply_trust_delta` to guarantee atomicity + audit row.
- **Pattern:** Service-role RPCs are called server-side only; RLS prevents client-side abuse.
- **Pattern:** Score is bounded `[0, 100]` at the DB level via `GREATEST(0, LEAST(100, ...))`.

### Architecture Decisions
- ADR: SECURITY DEFINER + `FOR UPDATE` row lock prevents lost updates under concurrent events.
- ADR: `admin_abuse_flag` bypasses delta math because it represents a hard reset, not a graduated penalty.

---

## Handoff from Previous Task
**Files changed by previous task:** task 1 (Supabase clients), task 2 (users + trust_score_events tables), task 3 (RLS policies).
**Decisions made:** users.trust_score default 50; account_status enum includes 'restricted'.
**Context for this task:** RLS already restricts users to their own row; service role used here for atomic mutation.
**Open questions left:** none.

---

## Implementation Steps
1. `supabase/migrations/20260428000004_fn_apply_trust_delta.sql` — write SECURITY DEFINER function.
2. Run migration: `npx supabase db push` (or `supabase migration up`).
3. `lib/abuse/trust.ts` — implement applyTrustEvent, resolveTrustTier, requiresCaptcha.
4. `lib/abuse/trust.test.ts` — unit tests for tier + CAPTCHA pure functions.
5. Modify `app/api/auth/signup/route.ts` (task 6) — wire `applyTrustEvent(userId, 'disposable_email')` after detection.
6. Modify `app/api/auth/verify-email/route.ts` (task 6) — wire `applyTrustEvent(userId, 'email_verified')` on success.
7. Run: `npx tsc --noEmit`
8. Run: `npm test -- lib/abuse/trust`
9. Run: `/verify`

_Requirements: 13, 16_

---

## Test Cases

### File: `lib/abuse/trust.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import { resolveTrustTier, requiresCaptcha } from './trust';

describe('resolveTrustTier', () => {
  it('returns full for score >= 80', () => {
    expect(resolveTrustTier(100)).toBe('full');
    expect(resolveTrustTier(80)).toBe('full');
  });
  it('returns standard for 40-79', () => {
    expect(resolveTrustTier(79)).toBe('standard');
    expect(resolveTrustTier(40)).toBe('standard');
  });
  it('returns reduced for 20-39', () => {
    expect(resolveTrustTier(39)).toBe('reduced');
    expect(resolveTrustTier(20)).toBe('reduced');
  });
  it('returns suspended for < 20', () => {
    expect(resolveTrustTier(19)).toBe('suspended');
    expect(resolveTrustTier(0)).toBe('suspended');
  });
});

describe('requiresCaptcha', () => {
  it('skips CAPTCHA for high trust users', () => {
    expect(requiresCaptcha(90, true)).toBe(false);
    expect(requiresCaptcha(80, false)).toBe(false);
  });
  it('requires CAPTCHA for mid-trust on suspicious actions only', () => {
    expect(requiresCaptcha(60, true)).toBe(true);
    expect(requiresCaptcha(60, false)).toBe(false);
  });
  it('always requires CAPTCHA for low-trust users', () => {
    expect(requiresCaptcha(30, false)).toBe(true);
    expect(requiresCaptcha(10, false)).toBe(true);
  });
});
```

### File: `lib/abuse/trust.integration.test.ts`
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { applyTrustEvent } from './trust';
import { createClient } from '@/lib/supabase/server';

describe('applyTrustEvent (integration)', () => {
  let userId: string;
  beforeEach(async () => {
    const supabase = createClient();
    const { data } = await supabase.from('users').insert({ email: `t${Date.now()}@test.com`, trust_score: 50 }).select('id').single();
    userId = data!.id;
  });

  it('applies negative delta and writes audit row', async () => {
    const res = await applyTrustEvent(userId, 'disposable_email');
    expect(res.delta).toBe(-30);
    expect(res.newScore).toBe(20);
    const supabase = createClient();
    const { data: events } = await supabase.from('trust_score_events').select('*').eq('user_id', userId);
    expect(events).toHaveLength(1);
    expect(events![0].reason).toBe('disposable_email');
  });

  it('clamps score at 0 lower bound', async () => {
    await applyTrustEvent(userId, 'disposable_email'); // 50 -> 20
    await applyTrustEvent(userId, 'multi_account_device'); // 20 -> 0 (clamped from -5)
    const res = await applyTrustEvent(userId, 'rapid_signup');
    expect(res.newScore).toBe(0);
  });

  it('clamps score at 100 upper bound', async () => {
    const supabase = createClient();
    await supabase.from('users').update({ trust_score: 90 }).eq('id', userId);
    const res = await applyTrustEvent(userId, 'payment_success');
    expect(res.newScore).toBe(100);
  });

  it('admin_abuse_flag sets score to 0 and restricts account', async () => {
    const res = await applyTrustEvent(userId, 'admin_abuse_flag');
    expect(res.newScore).toBe(0);
    const supabase = createClient();
    const { data: u } = await supabase.from('users').select('account_status').eq('id', userId).single();
    expect(u!.account_status).toBe('restricted');
  });

  it('restricts account when score drops below 20', async () => {
    await applyTrustEvent(userId, 'disposable_email'); // 50 -> 20
    await applyTrustEvent(userId, 'identical_requests'); // 20 -> 15
    const supabase = createClient();
    const { data: u } = await supabase.from('users').select('account_status').eq('id', userId).single();
    expect(u!.account_status).toBe('restricted');
  });
});
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| Event is `admin_abuse_flag` | Set score to 0 directly, write audit, restrict account if prev > 0 |
| Event delta would push score below 0 | Clamp to 0 in SQL via `GREATEST(0, ...)` |
| Event delta would push score above 100 | Clamp to 100 in SQL via `LEAST(100, ...)` |
| New score < 20 | Mark account_status = 'restricted' |
| Concurrent trust events on same user | Serialized by `SELECT ... FOR UPDATE` row lock |
| Unknown event passed | Throw `Unknown trust event: <event>` |
| Score 80–100 | Tier 'full', no CAPTCHA |
| Score 40–79 + suspicious action | Tier 'standard', CAPTCHA required |
| Score 20–39 | Tier 'reduced', CAPTCHA always |
| Score 0–19 | Tier 'suspended', block actions |

---

## Acceptance Criteria
- [ ] WHEN a user with score 50 receives `disposable_email` THEN trust_score is 20 and a `trust_score_events` row is written.
- [ ] WHEN concurrent events apply to the same user THEN final score equals deterministic sum of deltas (no lost updates).
- [ ] WHEN score drops below 20 THEN `account_status = 'restricted'`.
- [ ] WHEN `admin_abuse_flag` is applied THEN score is exactly 0 regardless of prior value.
- [ ] WHEN score is clamped THEN audit row records the actual delta applied (not the requested delta).
- [ ] `requiresCaptcha(85, true)` returns false; `requiresCaptcha(50, true)` returns true; `requiresCaptcha(15, false)` returns true.
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm test -- lib/abuse/trust` — all pass
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_

Status: COMPLETE
Completed: 2026-04-28T00:00:00Z
