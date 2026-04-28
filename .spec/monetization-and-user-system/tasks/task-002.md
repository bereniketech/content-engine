---
task: 002
feature: monetization-and-user-system
status: pending
model: haiku
supervisor: software-cto
agent: database-architect
depends_on: [1]
---

# Task 002: Supabase RLS Policies

## Skills
- .kit/skills/data-backend/postgres-patterns/SKILL.md
- .kit/skills/testing-quality/security-review/SKILL.md
- .kit/skills/core/karpathy-principles/SKILL.md

## Agents
- .kit/agents/software-company/data/database-architect.md

## Commands
- .kit/commands/core/task-handoff.md
- .kit/commands/development/verify.md

> Load the skills and agents listed above before reading anything else. Do not load any context not declared here. Follow paths exactly.

---

## Objective
Enable and FORCE Row Level Security on every business table from Task 1, attach default-deny baseline policies, and add explicit grants per role (user, admin, service_role) so multi-tenant isolation is enforced by Postgres.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `supabase/migrations/20260428000001_rls_policies.sql` | Enable + FORCE RLS, default-deny + grant policies for every business table |

### Modify
_(none — additive migration)_

---

## Dependencies
```bash
# (none — pure SQL)
```

---

## API Contracts
_(none — DB only)_

---

## Code Templates

### `supabase/migrations/20260428000001_rls_policies.sql`
```sql
-- =====================================================================
-- Row Level Security policies
-- Strategy:
--   1. ALTER TABLE ... ENABLE ROW LEVEL SECURITY + FORCE ROW LEVEL SECURITY
--   2. CREATE POLICY "default_deny" FOR ALL USING (false)  -- baseline
--   3. Add explicit allow policies (user-scoped, admin, service_role)
-- service_role bypasses RLS automatically (BYPASSRLS) but FORCE keeps
-- the table owner subject to RLS for safety.
-- =====================================================================

-- Helper: admin check (JWT claim role='admin')
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT coalesce(auth.jwt() ->> 'role', '') = 'admin'
$$;

-- ---------- users ----------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE  ROW LEVEL SECURITY;
CREATE POLICY "users_default_deny"  ON users FOR ALL    USING (false);
CREATE POLICY "users_self_read"     ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_self_update"   ON users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "users_admin_all"     ON users FOR ALL    USING (public.is_admin());

-- ---------- credit_wallets ----------
ALTER TABLE credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_wallets FORCE  ROW LEVEL SECURITY;
CREATE POLICY "wallets_default_deny" ON credit_wallets FOR ALL USING (false);
CREATE POLICY "wallets_owner_read" ON credit_wallets FOR SELECT
  USING (
    (owner_kind = 'user' AND owner_id = auth.uid())
    OR (owner_kind = 'team' AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = credit_wallets.owner_id AND user_id = auth.uid()
    ))
  );
CREATE POLICY "wallets_admin_all" ON credit_wallets FOR ALL USING (public.is_admin());

-- ---------- credit_transactions ----------
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions FORCE  ROW LEVEL SECURITY;
CREATE POLICY "tx_default_deny" ON credit_transactions FOR ALL USING (false);
CREATE POLICY "tx_wallet_owner_read" ON credit_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM credit_wallets w
      WHERE w.id = credit_transactions.wallet_id
        AND (
          (w.owner_kind = 'user' AND w.owner_id = auth.uid())
          OR (w.owner_kind = 'team' AND EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = w.owner_id AND tm.user_id = auth.uid()
          ))
        )
    )
  );
CREATE POLICY "tx_admin_read" ON credit_transactions FOR SELECT USING (public.is_admin());

-- ---------- subscription_plans (public read) ----------
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans FORCE  ROW LEVEL SECURITY;
CREATE POLICY "plans_default_deny" ON subscription_plans FOR ALL USING (false);
CREATE POLICY "plans_public_read"  ON subscription_plans FOR SELECT USING (active = true);
CREATE POLICY "plans_admin_all"    ON subscription_plans FOR ALL USING (public.is_admin());

-- ---------- subscriptions ----------
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE  ROW LEVEL SECURITY;
CREATE POLICY "subs_default_deny" ON subscriptions FOR ALL USING (false);
CREATE POLICY "subs_self_read"    ON subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "subs_admin_all"    ON subscriptions FOR ALL USING (public.is_admin());

-- ---------- payments ----------
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE  ROW LEVEL SECURITY;
CREATE POLICY "pay_default_deny" ON payments FOR ALL USING (false);
CREATE POLICY "pay_self_read"    ON payments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "pay_admin_all"    ON payments FOR ALL USING (public.is_admin());

-- ---------- ppp_tiers (public read) ----------
ALTER TABLE ppp_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppp_tiers FORCE  ROW LEVEL SECURITY;
CREATE POLICY "ppp_default_deny" ON ppp_tiers FOR ALL USING (false);
CREATE POLICY "ppp_public_read"  ON ppp_tiers FOR SELECT USING (true);
CREATE POLICY "ppp_admin_all"    ON ppp_tiers FOR ALL USING (public.is_admin());

-- ---------- teams ----------
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams FORCE  ROW LEVEL SECURITY;
CREATE POLICY "teams_default_deny" ON teams FOR ALL USING (false);
CREATE POLICY "teams_member_read"  ON teams FOR SELECT
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_id = teams.id AND user_id = auth.uid()));
CREATE POLICY "teams_owner_mutate" ON teams FOR ALL
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "teams_admin_all"    ON teams FOR ALL USING (public.is_admin());

-- ---------- team_members ----------
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members FORCE  ROW LEVEL SECURITY;
CREATE POLICY "tm_default_deny" ON team_members FOR ALL USING (false);
CREATE POLICY "tm_self_team_read" ON team_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM team_members me WHERE me.team_id = team_members.team_id AND me.user_id = auth.uid()));
CREATE POLICY "tm_owner_mutate" ON team_members FOR ALL
  USING (EXISTS (SELECT 1 FROM teams t WHERE t.id = team_members.team_id AND t.owner_user_id = auth.uid()));
CREATE POLICY "tm_admin_all" ON team_members FOR ALL USING (public.is_admin());

-- ---------- team_invites ----------
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites FORCE  ROW LEVEL SECURITY;
CREATE POLICY "ti_default_deny" ON team_invites FOR ALL USING (false);
CREATE POLICY "ti_owner_read" ON team_invites FOR SELECT
  USING (EXISTS (SELECT 1 FROM teams t WHERE t.id = team_invites.team_id AND t.owner_user_id = auth.uid()));
CREATE POLICY "ti_admin_all" ON team_invites FOR ALL USING (public.is_admin());

-- ---------- email_verifications (service_role only) ----------
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verifications FORCE  ROW LEVEL SECURITY;
CREATE POLICY "ev_default_deny" ON email_verifications FOR ALL USING (false);
-- service_role bypasses; admin can read for support
CREATE POLICY "ev_admin_read" ON email_verifications FOR SELECT USING (public.is_admin());

-- ---------- email_domain_blocklist (admin) ----------
ALTER TABLE email_domain_blocklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_domain_blocklist FORCE  ROW LEVEL SECURITY;
CREATE POLICY "edb_default_deny" ON email_domain_blocklist FOR ALL USING (false);
CREATE POLICY "edb_admin_all"    ON email_domain_blocklist FOR ALL USING (public.is_admin());

-- ---------- email_log (admin / service) ----------
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log FORCE  ROW LEVEL SECURITY;
CREATE POLICY "el_default_deny" ON email_log FOR ALL USING (false);
CREATE POLICY "el_self_read"    ON email_log FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "el_admin_all"    ON email_log FOR ALL USING (public.is_admin());

-- ---------- trust_score_events (service only) ----------
ALTER TABLE trust_score_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_score_events FORCE  ROW LEVEL SECURITY;
CREATE POLICY "tse_default_deny" ON trust_score_events FOR ALL USING (false);
CREATE POLICY "tse_admin_read"   ON trust_score_events FOR SELECT USING (public.is_admin());

-- ---------- abuse_logs (admin / service) ----------
ALTER TABLE abuse_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE abuse_logs FORCE  ROW LEVEL SECURITY;
CREATE POLICY "abuse_default_deny" ON abuse_logs FOR ALL USING (false);
CREATE POLICY "abuse_admin_all"    ON abuse_logs FOR ALL USING (public.is_admin());

-- ---------- admin_actions (admin) ----------
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions FORCE  ROW LEVEL SECURITY;
CREATE POLICY "aa_default_deny" ON admin_actions FOR ALL USING (false);
CREATE POLICY "aa_admin_all"    ON admin_actions FOR ALL USING (public.is_admin());

-- ---------- webhook_events (admin / service) ----------
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events FORCE  ROW LEVEL SECURITY;
CREATE POLICY "we_default_deny" ON webhook_events FOR ALL USING (false);
CREATE POLICY "we_admin_read"   ON webhook_events FOR SELECT USING (public.is_admin());

-- ---------- user_devices (service only) ----------
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices FORCE  ROW LEVEL SECURITY;
CREATE POLICY "ud_default_deny" ON user_devices FOR ALL USING (false);
CREATE POLICY "ud_self_read"    ON user_devices FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ud_admin_all"    ON user_devices FOR ALL USING (public.is_admin());

-- ---------- user_ip_log (service only) ----------
ALTER TABLE user_ip_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ip_log FORCE  ROW LEVEL SECURITY;
CREATE POLICY "uil_default_deny" ON user_ip_log FOR ALL USING (false);
CREATE POLICY "uil_admin_all"    ON user_ip_log FOR ALL USING (public.is_admin());

-- ---------- free_credit_grants (service only) ----------
ALTER TABLE free_credit_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_credit_grants FORCE  ROW LEVEL SECURITY;
CREATE POLICY "fcg_default_deny" ON free_credit_grants FOR ALL USING (false);
CREATE POLICY "fcg_self_read"    ON free_credit_grants FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "fcg_admin_all"    ON free_credit_grants FOR ALL USING (public.is_admin());

-- ---------- daily_credit_aggregates ----------
ALTER TABLE daily_credit_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_credit_aggregates FORCE  ROW LEVEL SECURITY;
CREATE POLICY "dca_default_deny" ON daily_credit_aggregates FOR ALL USING (false);
CREATE POLICY "dca_self_read"    ON daily_credit_aggregates FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "dca_admin_all"    ON daily_credit_aggregates FOR ALL USING (public.is_admin());
```

---

## Codebase Context

### Key Code Snippets
```sql
-- baseline default-deny pattern reused everywhere
CREATE POLICY "<table>_default_deny" ON <table> FOR ALL USING (false);
```

### Key Patterns in Use
- **Default deny + explicit allow:** every table has a `false` baseline; granular policies grant access. Avoids accidental exposure on schema changes.
- **FORCE RLS:** even table owner is subject to policies; only `service_role` (BYPASSRLS) skips them.
- **Single admin check:** `public.is_admin()` STABLE function reads JWT claim — single source of truth.

### Architecture Decisions Affecting This Task
- ADR: All cross-tenant data access (e.g., team wallet visibility) must be expressible as a single SQL predicate.
- ADR: Server mutations always run as `service_role` via the Supabase server client (Task 5+).

---

## Handoff from Previous Task
> Populated by /task-handoff after prior task completes.
**Files changed by previous task:** _(filled via /task-handoff after Task 1)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps
1. `supabase/migrations/20260428000001_rls_policies.sql` — write full DDL above
2. Run: `supabase db reset` to apply both migrations clean
3. Run: `supabase test db` against `supabase/tests/rls.test.sql`
4. Run: `/verify`

_Requirements: 5, 6, 11, 12, 23_
_Skills: .kit/skills/data-backend/postgres-patterns/SKILL.md_

---

## Test Cases

### File: `supabase/tests/rls.test.sql`
```sql
BEGIN;
SELECT plan(6);

-- Setup: two users, one wallet for user A
INSERT INTO auth.users(id, email) VALUES
  ('11111111-1111-1111-1111-111111111111','a@example.com'),
  ('22222222-2222-2222-2222-222222222222','b@example.com');
INSERT INTO public.users(id, email) VALUES
  ('11111111-1111-1111-1111-111111111111','a@example.com'),
  ('22222222-2222-2222-2222-222222222222','b@example.com');
INSERT INTO public.credit_wallets(id, owner_id, owner_kind, balance)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          '11111111-1111-1111-1111-111111111111','user',100);

-- Simulate user B
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

SELECT is(
  (SELECT count(*) FROM public.credit_wallets WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0::bigint, 'user B cannot see user A wallet'
);

SELECT is(
  (SELECT count(*) FROM public.users WHERE id='11111111-1111-1111-1111-111111111111'),
  0::bigint, 'user B cannot see user A profile'
);

-- Switch to user A
SET LOCAL request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

SELECT is(
  (SELECT count(*) FROM public.credit_wallets WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1::bigint, 'user A sees own wallet'
);

SELECT throws_ok(
  $$ INSERT INTO public.credit_transactions(wallet_id, acting_user_id, amount, action_type, request_id, actor)
     VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
             '11111111-1111-1111-1111-111111111111', -1, 'manual',
             gen_random_uuid(), 'user') $$,
  '42501', NULL, 'authenticated user cannot directly insert credit_transactions'
);

-- Switch to admin
SET LOCAL request.jwt.claims = '{"role":"admin","sub":"99999999-9999-9999-9999-999999999999"}';
SELECT ok(
  (SELECT count(*) FROM public.credit_wallets) >= 1,
  'admin can read all wallets'
);

-- Switch to service_role (BYPASSRLS)
SET LOCAL ROLE service_role;
SELECT ok(
  (SELECT count(*) FROM public.credit_transactions) >= 0,
  'service_role bypasses RLS'
);

SELECT * FROM finish();
ROLLBACK;
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| Anon user queries `credit_wallets` | Returns 0 rows (default_deny matches; no `auth.uid()`) |
| Authenticated user A reads user B's wallet | Returns 0 rows (`wallets_owner_read` predicate false) |
| Authenticated user inserts into `credit_transactions` | Postgres raises `42501 new row violates row-level security policy "tx_default_deny"` |
| User reads team wallet they belong to | `wallets_owner_read` allows via `team_members` exists check |
| JWT carries `role:'admin'` | `is_admin()` returns true; admin policies match |

---

## Acceptance Criteria
- [ ] WHEN `supabase db reset` runs THEN both migrations apply cleanly
- [ ] WHEN user B queries A's wallet THEN row count is 0
- [ ] WHEN authenticated user attempts INSERT into `credit_transactions` THEN error 42501
- [ ] WHEN `service_role` queries any table THEN RLS does not block
- [ ] WHEN admin JWT queries `abuse_logs` THEN rows return
- [ ] All existing tests pass
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** `supabase/migrations/20260428000001_rls_policies.sql`, `supabase/tests/rls.test.sql`
**Decisions made:** Default-deny baseline on every table; FORCE RLS so table owner is also subject; single `is_admin()` STABLE function reads JWT claim.
**Context for next task:** RPC functions (Task 3) run SECURITY DEFINER so bypass RLS; they only need GRANT EXECUTE to service_role.
**Open questions:** None.

Status: COMPLETE
Completed: 2026-04-28T00:01:00Z
