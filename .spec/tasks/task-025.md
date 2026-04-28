---
task: 025
feature: stability-roadmap
status: pending
model: haiku
supervisor: software-cto
agent: database-architect
depends_on: [task-017, task-022]
---

# Task 025: Execute and verify database migrations

## Skills
- .kit/skills/data-backend/database-migrations/SKILL.md

## Agents
- @database-architect

## Commands
- /verify

---

## Objective
Apply all database migrations (subscriptions unique constraint, device fingerprint index, FX rates table) to staging environment and verify RPC functions exist and work correctly.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `migrations/YYYYMMDD_subscriptions_unique_constraint.sql` | Add unique constraint |
| `migrations/YYYYMMDD_fx_rates_table.sql` | Create FX rates table |

### Verify (no changes)
| File | What to check |
|------|---------------|
| Database schema | All migrations applied successfully |
| RPC functions | `fn_deduct_credits`, `fn_credit_topup`, `fn_refund_credits`, `fn_apply_trust_delta` |

---

## Dependencies
- Depends on: task-017 (FX rates database structure defined)
- Depends on: task-022 (device fingerprint index)

---

## Code Templates

### Migration 1: `migrations/YYYYMMDD_subscriptions_unique_constraint.sql`

```sql
-- Add unique constraint on razorpay_subscription_id to prevent duplicates
ALTER TABLE subscriptions
ADD CONSTRAINT unique_razorpay_subscription_id 
UNIQUE (razorpay_subscription_id);

-- Verify constraint exists
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name='subscriptions' AND constraint_type='UNIQUE';
```

### Migration 2: `migrations/YYYYMMDD_fx_rates_table.sql`

```sql
-- Create FX rates table for dynamic pricing
CREATE TABLE IF NOT EXISTS fx_rates (
  id SERIAL PRIMARY KEY,
  currency VARCHAR(3) UNIQUE NOT NULL,
  rate DECIMAL(10, 4) NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Initial rates
INSERT INTO fx_rates (currency, rate) VALUES
  ('USD', 1.0),
  ('INR', 83.0),
  ('EUR', 0.92)
ON CONFLICT (currency) DO UPDATE SET rate=EXCLUDED.rate;

-- Create index for fast lookups
CREATE INDEX idx_fx_rates_currency ON fx_rates(currency);
```

### RPC Function Verification

```sql
-- Verify all required RPC functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema='public' 
AND routine_name IN (
  'fn_deduct_credits',
  'fn_credit_topup', 
  'fn_refund_credits',
  'fn_apply_trust_delta'
);

-- Expected: 4 rows (all functions must exist)

-- Test fn_deduct_credits (example)
SELECT fn_deduct_credits('test-request-id'::UUID, 100);

-- Test fn_credit_topup (example)
SELECT fn_credit_topup(
  'test-wallet-id'::UUID,
  1000,
  'test-payment-id'::TEXT
);

-- Test fn_refund_credits (example)
SELECT fn_refund_credits('test-request-id'::UUID);

-- Test fn_apply_trust_delta (example)
SELECT fn_apply_trust_delta('test-user-id'::UUID, 25);
```

---

## Acceptance Criteria
- [ ] `migrations/YYYYMMDD_subscriptions_unique_constraint.sql` applied successfully
- [ ] `migrations/YYYYMMDD_fx_rates_table.sql` applied successfully
- [ ] Index created on `user_devices.fingerprint_hash` (from task-022)
- [ ] Subscriptions table has unique constraint on `razorpay_subscription_id`
- [ ] FX rates table exists with USD, INR, EUR rates
- [ ] All 4 RPC functions exist: `fn_deduct_credits`, `fn_credit_topup`, `fn_refund_credits`, `fn_apply_trust_delta`
- [ ] Each RPC function executes without error
- [ ] Staging database matches production schema
- [ ] `/verify` passes

---

## Implementation Steps
1. Create migration file: `migrations/YYYYMMDD_subscriptions_unique_constraint.sql`
2. Create migration file: `migrations/YYYYMMDD_fx_rates_table.sql`
3. Apply migrations: `npx supabase migration up` (or `npx supabase db push` for local)
4. Run RPC verification queries (see Code Templates)
5. Verify all 4 functions exist and execute cleanly
6. Run `/verify`
7. Document any RPC issues found

---

## Test Cases

```sql
-- Test 1: Unique constraint prevents duplicate subscription IDs
INSERT INTO subscriptions (user_id, plan_id, razorpay_subscription_id, status)
VALUES ('user1', 'plan1', 'sub_12345', 'pending');

INSERT INTO subscriptions (user_id, plan_id, razorpay_subscription_id, status)
VALUES ('user2', 'plan2', 'sub_12345', 'pending');
-- Expected: UNIQUE constraint violation

-- Test 2: FX rates table has required currencies
SELECT COUNT(*) FROM fx_rates WHERE currency IN ('USD', 'INR', 'EUR');
-- Expected: 3

-- Test 3: FX rates can be updated
UPDATE fx_rates SET rate=84.0 WHERE currency='INR';
SELECT rate FROM fx_rates WHERE currency='INR';
-- Expected: 84.0

-- Test 4: RPC functions are callable
SELECT fn_deduct_credits('550e8400-e29b-41d4-a716-446655440000'::UUID);
-- Expected: Returns integer (credits deducted or error)

-- Test 5: Device fingerprint index exists
SELECT indexname FROM pg_indexes 
WHERE tablename='user_devices' AND indexname='idx_user_devices_fingerprint_hash';
-- Expected: 1 row
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| Migration fails (constraint violation) | Investigate existing data; add data cleanup migration if needed |
| RPC function missing | Check database.sql schema file; create function if missing |
| FX rates table exists but empty | Insert initial rates (USD, INR, EUR) |
| Duplicate constraint already exists | Use `CREATE CONSTRAINT IF NOT EXISTS` or skip |

---

## Handoff to Next Task
_(fill via /task-handoff)_
