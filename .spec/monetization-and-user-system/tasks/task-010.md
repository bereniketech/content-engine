---
task: 010
feature: monetization-and-user-system
status: pending
model: haiku
supervisor: software-cto
agent: database-architect
depends_on: [1, 2, 3, 6, 11]
---

# Task 010: Free Credit Protection — Once-Per-Identity Enforcement

## Skills
- .kit/skills/data-backend/postgres-patterns/SKILL.md
- .kit/skills/testing-quality/security-review/SKILL.md
- .kit/skills/core/karpathy-principles/SKILL.md

## Agents
- .kit/agents/software-company/data/database-architect.md

## Commands
- .kit/commands/core/task-handoff.md
- .kit/commands/development/verify.md

> Load the skills and agents listed above before reading anything else.

---

## Objective
Implement the `fn_grant_free_credits` SECURITY DEFINER RPC that enforces all once-per-identity guards (email-verified, not disposable, IP cap 3/24h, fingerprint once-lifetime, trust-tier) atomically, then writes a `free_credit_grants` ledger row and credits the wallet in the same transaction.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `supabase/migrations/20260428000005_fn_grant_free_credits.sql` | SECURITY DEFINER RPC with all anti-abuse guards |
| `lib/credits/freeGrant.ts` | Thin TypeScript wrapper calling the RPC |

### Modify
| File | What to change |
|------|---------------|
| `app/api/auth/verify-email/route.ts` (task 6) | Replace inline grant call with `grantFreeCredits()` |

---

## Dependencies
```bash
# No new packages
# ENV: uses existing SUPABASE_SERVICE_ROLE_KEY
```

---

## API Contracts
```
grantFreeCredits(userId, ip, fpHash) -> { credits_granted: number; reason?: string }

fn_grant_free_credits(p_user_id, p_ip, p_fp_hash) RETURNS INT
  → credits granted (0 if blocked)
  Raises no exceptions — always returns an INT
  Side effects: writes free_credit_grants row, debits abuse_logs on fail
```

---

## Code Templates

### `supabase/migrations/20260428000005_fn_grant_free_credits.sql`
```sql
CREATE OR REPLACE FUNCTION fn_grant_free_credits(
  p_user_id  uuid,
  p_ip       inet,
  p_fp_hash  text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user           RECORD;
  v_wallet_id      uuid;
  v_ip_count       integer;
  v_fp_exists      boolean;
  v_grant_amount   integer;
  v_full_grant     integer := 50;
BEGIN
  -- 1. Load user
  SELECT id, email, email_verified, trust_score, account_status
  INTO v_user
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- 2. Email must be verified
  IF NOT v_user.email_verified THEN
    INSERT INTO abuse_logs (user_id, ip_address, fingerprint_hash, email, event_type, rule_triggered, action_taken, metadata)
    VALUES (p_user_id, p_ip, p_fp_hash, v_user.email, 'free_credit_block', 'email_not_verified', 'blocked', '{}');
    RETURN 0;
  END IF;

  -- 3. Check email domain against blocklist
  IF EXISTS (
    SELECT 1 FROM email_domain_blocklist
    WHERE domain = split_part(v_user.email, '@', 2)
  ) THEN
    UPDATE users SET trust_score = LEAST(trust_score, 30) WHERE id = p_user_id;
    INSERT INTO abuse_logs (user_id, ip_address, fingerprint_hash, email, event_type, rule_triggered, action_taken, metadata)
    VALUES (p_user_id, p_ip, p_fp_hash, v_user.email, 'free_credit_block', 'disposable_email', 'blocked', '{}');
    RETURN 0;
  END IF;

  -- 4. IP cap: max 3 grants per IP per 24h
  SELECT COUNT(*) INTO v_ip_count
  FROM free_credit_grants
  WHERE ip_address = p_ip
    AND granted_at > now() - INTERVAL '24 hours';

  IF v_ip_count >= 3 THEN
    UPDATE users SET trust_score = LEAST(trust_score, 30) WHERE id = p_user_id;
    INSERT INTO abuse_logs (user_id, ip_address, fingerprint_hash, email, event_type, rule_triggered, action_taken, metadata)
    VALUES (p_user_id, p_ip, p_fp_hash, v_user.email, 'free_credit_block', 'ip_cap_exceeded', 'blocked',
      jsonb_build_object('ip_count', v_ip_count));
    RETURN 0;
  END IF;

  -- 5. Fingerprint: once per lifetime
  SELECT EXISTS(
    SELECT 1 FROM free_credit_grants WHERE fingerprint_hash = p_fp_hash
  ) INTO v_fp_exists;

  IF v_fp_exists THEN
    UPDATE users SET trust_score = LEAST(trust_score, 30) WHERE id = p_user_id;
    INSERT INTO abuse_logs (user_id, ip_address, fingerprint_hash, email, event_type, rule_triggered, action_taken, metadata)
    VALUES (p_user_id, p_ip, p_fp_hash, v_user.email, 'free_credit_block', 'fingerprint_already_granted', 'blocked', '{}');
    RETURN 0;
  END IF;

  -- 6. Determine grant amount based on trust tier
  IF v_user.trust_score < 40 THEN
    v_grant_amount := v_full_grant / 2;  -- 25 credits
  ELSE
    v_grant_amount := v_full_grant;       -- 50 credits
  END IF;

  -- 7. Get wallet
  SELECT id INTO v_wallet_id FROM credit_wallets WHERE user_id = p_user_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- 8. Atomic: credit wallet + write grant ledger row
  UPDATE credit_wallets
  SET balance = balance + v_grant_amount, updated_at = now()
  WHERE id = v_wallet_id;

  INSERT INTO credit_transactions (wallet_id, acting_user_id, action_type, delta, balance_after, request_id, actor)
  SELECT v_wallet_id, p_user_id, 'free_credit_grant', v_grant_amount,
         balance, gen_random_uuid(), 'system'
  FROM credit_wallets WHERE id = v_wallet_id;

  INSERT INTO free_credit_grants (user_id, email, ip_address, fingerprint_hash, credits_granted)
  VALUES (p_user_id, v_user.email, p_ip, p_fp_hash, v_grant_amount);

  RETURN v_grant_amount;
END;
$$;

REVOKE ALL ON FUNCTION fn_grant_free_credits(uuid, inet, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_grant_free_credits(uuid, inet, text) TO service_role;
```

### `lib/credits/freeGrant.ts`
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function grantFreeCredits(
  userId: string,
  ip: string,
  fpHash: string
): Promise<{ credits_granted: number }> {
  const { data, error } = await supabase.rpc('fn_grant_free_credits', {
    p_user_id: userId,
    p_ip: ip || '0.0.0.0',
    p_fp_hash: fpHash || '',
  });
  if (error) throw error;
  return { credits_granted: (data as number) ?? 0 };
}
```

---

## Codebase Context

### Key Patterns in Use
- **All checks in one SECURITY DEFINER function:** no partial grant states — either the entire grant succeeds or nothing is written.
- **`FOR UPDATE` on users row:** prevents concurrent double-grant if two verify-email requests race.
- **Abuse log on every block:** each failed check writes an `abuse_logs` row for admin visibility.
- **Trust-based amount:** trust < 40 → half grant; prevents low-signal users from getting full allocation.

---

## Handoff from Previous Task
**Files changed by task 11:** `fn_apply_trust_delta` RPC, `lib/abuse/trust.ts` — trust events available.
**Files changed by task 6:** `app/api/auth/verify-email/route.ts` calls grant inline — this task replaces that with the proper RPC.
**Context for this task:** `free_credit_grants`, `credit_wallets`, `credit_transactions`, `abuse_logs` tables exist (task 1).

---

## Implementation Steps
1. Write `supabase/migrations/20260428000005_fn_grant_free_credits.sql`.
2. Apply migration: `supabase db push`.
3. Write `lib/credits/freeGrant.ts`.
4. Update `app/api/auth/verify-email/route.ts` — replace inline grant with `grantFreeCredits()`.
5. `npx tsc --noEmit`
6. Run: `/verify`

_Requirements: 13, 16, 17_

---

## Test Cases

### Expected behaviors (integration against real DB)
```
Same email twice → 1 grant (user row FOR UPDATE prevents race)
Same IP 4× → 3 grants then 0
Same fingerprint twice → 1 grant, second returns 0
Low-trust user (score 30) → 25 credits (50%)
High-trust user (score 80) → 50 credits
Unverified email → 0 credits + abuse_log entry
Disposable email domain → 0 credits + trust capped at 30 + abuse_log
Each blocked attempt → abuse_logs row written
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| Email not verified | Return 0; write abuse_log |
| Email domain on blocklist | Return 0; cap trust to 30; write abuse_log |
| IP count ≥ 3 in 24h | Return 0; cap trust to 30; write abuse_log |
| Fingerprint already in grants | Return 0; cap trust to 30; write abuse_log |
| Trust < 40 | Grant 50% of full amount |
| Wallet not found | Return 0 silently |

---

## Acceptance Criteria
- [ ] Same email twice → 1 grant total
- [ ] Same IP 4× within 24h → 3 grants then 0
- [ ] Same fingerprint twice → 1 grant then 0
- [ ] Low-trust user → 25 credits; high-trust → 50 credits
- [ ] Each blocked attempt writes `abuse_logs` row
- [ ] Migration applies cleanly: `supabase db push` zero errors
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
