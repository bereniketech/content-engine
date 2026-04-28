---
task: 019
feature: monetization-and-user-system
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: [1, 2, 3, 7, 8, 18]
---

# Task 019: Team Credit Pool — Shared Deduction + Per-Member Tracking

## Skills
- .kit/skills/data-backend/postgres-patterns/SKILL.md
- .kit/skills/development/api-design/SKILL.md
- .kit/skills/core/karpathy-principles/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-backend-expert.md

## Commands
- .kit/commands/core/task-handoff.md
- .kit/commands/development/verify.md

> Load the skills and agents listed above before reading anything else.

---

## Objective
Ensure content generation by team members deducts from the team wallet (not personal wallet), with `credit_transactions.acting_user_id` tracking the individual caller. Add per-member usage rollup endpoint for team dashboard.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `app/api/teams/[id]/usage/route.ts` | GET per-member credit usage rollup for current period |

### Modify
| File | What to change |
|------|---------------|
| `lib/credits/wallet.ts` | `resolveWallet` already handles team — verify; ensure acting_user_id = caller (not team owner) |
| `app/api/content/generate/route.ts` (task 9) | Pass `userId` as acting_user_id even when wallet is team wallet |

---

## Dependencies
```bash
# No new packages
# ENV: uses existing SUPABASE_SERVICE_ROLE_KEY
```

---

## API Contracts
```
GET /api/teams/:id/usage?period=current
  Headers: x-user-id (must be team owner or member)
  → 200 {
      period_start: string;
      period_end: string;
      members: [{
        user_id: string;
        email: string;
        credits_used: number;
        last_active_at: string | null;
      }];
      total_credits_used: number;
    }
  → 403 (caller not a member of this team)
```

---

## Code Templates

### `app/api/teams/[id]/usage/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  // Verify caller is a member
  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', params.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  // Resolve team wallet
  const { data: wallet } = await supabase
    .from('credit_wallets')
    .select('id')
    .eq('team_id', params.id)
    .single();

  if (!wallet) return NextResponse.json({ error: 'Team wallet not found.' }, { status: 404 });

  // Current period: first of this month to now
  const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const periodEnd = new Date().toISOString();

  // Aggregate per acting_user_id
  const { data: txns } = await supabase
    .from('credit_transactions')
    .select('acting_user_id, delta')
    .eq('wallet_id', wallet.id)
    .lt('delta', 0) // debits only
    .gte('created_at', periodStart);

  const usageMap: Record<string, number> = {};
  for (const tx of txns ?? []) {
    usageMap[tx.acting_user_id] = (usageMap[tx.acting_user_id] ?? 0) + Math.abs(tx.delta);
  }

  // Fetch member details
  const { data: members } = await supabase
    .from('team_members')
    .select('user_id, users(email, last_active_at)')
    .eq('team_id', params.id);

  const memberStats = (members ?? []).map((m: any) => ({
    user_id: m.user_id,
    email: m.users?.email ?? '',
    credits_used: usageMap[m.user_id] ?? 0,
    last_active_at: m.users?.last_active_at ?? null,
  }));

  return NextResponse.json({
    period_start: periodStart,
    period_end: periodEnd,
    members: memberStats,
    total_credits_used: Object.values(usageMap).reduce((a, b) => a + b, 0),
  });
}
```

### Verify wallet resolution in `lib/credits/wallet.ts`
```typescript
// resolveWallet should already return team wallet for team members
// Confirm that the wallet resolver in task 8 looks up team_members correctly:
// SELECT team_id FROM team_members WHERE user_id = userId
// → return team wallet

// In generate.ts, acting_user_id must be the CALLER's userId, not the team owner:
// deductCredits(wallet.id, cost, actionType, requestId, userId)  ← userId = caller
```

---

## Codebase Context

### Key Patterns in Use
- **`acting_user_id` = caller:** even when wallet is the team wallet, each transaction records which member triggered it.
- **Wallet resolver (task 8):** already returns team wallet for team members — this task just verifies and tests that path.
- **Monthly period:** current period = first-of-month to now; no subscription-cycle dependency for simplicity.

---

## Handoff from Previous Task
**Files changed by task 18:** `teams`, `team_members`, `team_invites` CRUD + `credit_wallets` team row.
**Files changed by task 8:** `lib/credits/wallet.ts` `resolveWallet` — team path already present.
**Context for this task:** Verify the team wallet deduction path and add usage rollup endpoint.

---

## Implementation Steps
1. Read `lib/credits/wallet.ts` to confirm `resolveWallet` returns team wallet when user is a team_member.
2. Read `app/api/content/generate/route.ts` to confirm `acting_user_id = userId` (the caller) is passed.
3. Create `app/api/teams/[id]/usage/route.ts`.
4. `npx tsc --noEmit`
5. Run: `/verify`

_Requirements: 11, 24_

---

## Test Cases

### Expected behaviors
```
Team member generates → team wallet balance decremented, not user wallet
credit_transactions.acting_user_id = member's user_id (not owner's)
GET /api/teams/:id/usage → per-member breakdown with correct credits_used
Non-member calls GET /api/teams/:id/usage → 403
Removed member can no longer trigger deductions (wallet resolver returns personal wallet)
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| User is team_member | Deduct from team wallet; acting_user_id = caller |
| Removed member | resolveWallet falls back to personal wallet |
| Non-member calls usage endpoint | 403 |
| Team wallet not found | 404 |

---

## Acceptance Criteria
- [ ] Team member generates → team wallet debited, `acting_user_id` = caller's user_id
- [ ] `GET /api/teams/:id/usage` returns per-member breakdown
- [ ] Non-member → 403
- [ ] Removed member deductions no longer hit team wallet
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
