---
task: 008
feature: monetization-and-user-system
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: [1, 2, 3, 4, 7]
---

# Task 008: Credit Wallet API

## Skills
- .kit/skills/development/api-design/SKILL.md
- .kit/skills/data-backend/postgres-patterns/SKILL.md
- .kit/skills/core/karpathy-principles/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-backend-expert.md

## Commands
- .kit/commands/core/task-handoff.md
- .kit/commands/development/verify.md

> Load the skills and agents listed above before reading anything else.

---

## Objective
Implement credit wallet endpoints: balance fetch (resolves user or team wallet), cursor-paginated transaction history, and top-up order creation that calculates PPP price server-side and creates a Razorpay order without crediting the wallet (webhook does that in task 15).

---

## Files

### Create
| File | Purpose |
|------|---------|
| `lib/credits/wallet.ts` | Wallet resolver + RPC wrappers |
| `app/api/credits/balance/route.ts` | GET credit balance |
| `app/api/credits/history/route.ts` | GET paginated transaction history |
| `app/api/credits/topup/route.ts` | POST create Razorpay top-up order |

### Modify
_(none)_

---

## Dependencies
```bash
npm install razorpay

# ENV vars:
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## API Contracts
```
GET /api/credits/balance
  Headers: x-user-id (injected by middleware)
  → 200 { balance: number; wallet_kind: 'user' | 'team'; wallet_id: string }
  → 402 { error: 'Insufficient credits...' }  ← used downstream, not here

GET /api/credits/history?cursor=<uuid>&limit=<1-50>
  → 200 { items: CreditTransaction[]; next_cursor: string | null }

POST /api/credits/topup
  Body: { pack_id: string }   ← client sends product ID only, NOT amount
  → 200 { razorpay_order_id: string; amount: number; currency: string }
  → 400 { error: 'Invalid pack_id.' }
```

---

## Code Templates

### `lib/credits/wallet.ts`
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type WalletInfo = {
  id: string;
  balance: number;
  owner_kind: 'user' | 'team';
};

export async function resolveWallet(userId: string): Promise<WalletInfo | null> {
  // Check if user is a team member — use team wallet
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (membership) {
    const { data: wallet } = await supabase
      .from('credit_wallets')
      .select('id, balance, owner_kind')
      .eq('team_id', membership.team_id)
      .single();
    return wallet ?? null;
  }

  const { data: wallet } = await supabase
    .from('credit_wallets')
    .select('id, balance, owner_kind')
    .eq('user_id', userId)
    .single();
  return wallet ?? null;
}

export async function deductCredits(
  walletId: string,
  cost: number,
  actionType: string,
  requestId: string,
  actingUserId: string
): Promise<number> {
  const { data, error } = await supabase.rpc('fn_deduct_credits', {
    p_wallet_id: walletId,
    p_cost: cost,
    p_action_type: actionType,
    p_request_id: requestId,
    p_actor: actingUserId,
  });
  if (error) throw error;
  return data as number;
}

export async function topupCredits(
  walletId: string,
  amount: number,
  paymentId: string
): Promise<number> {
  const { data, error } = await supabase.rpc('fn_credit_topup', {
    p_wallet_id: walletId,
    p_amount: amount,
    p_payment_id: paymentId,
  });
  if (error) throw error;
  return data as number;
}
```

### `app/api/credits/balance/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { resolveWallet } from '@/lib/credits/wallet';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const wallet = await resolveWallet(userId);
  if (!wallet) return NextResponse.json({ error: 'Wallet not found.' }, { status: 404 });

  return NextResponse.json({
    balance: wallet.balance,
    wallet_kind: wallet.owner_kind,
    wallet_id: wallet.id,
  });
}
```

### `app/api/credits/history/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveWallet } from '@/lib/credits/wallet';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const url = req.nextUrl;
  const cursor = url.searchParams.get('cursor');
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 50);

  const wallet = await resolveWallet(userId);
  if (!wallet) return NextResponse.json({ items: [], next_cursor: null });

  let query = supabase
    .from('credit_transactions')
    .select('id, action_type, delta, balance_after, created_at, acting_user_id, request_id')
    .eq('wallet_id', wallet.id)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const hasMore = (data?.length ?? 0) > limit;
  const items = hasMore ? data!.slice(0, limit) : (data ?? []);
  const next_cursor = hasMore ? items[items.length - 1].created_at : null;

  return NextResponse.json({ items, next_cursor });
}
```

### `app/api/credits/topup/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Razorpay from 'razorpay';
import { priceFor, resolveTier } from '@/lib/pricing/ppp';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Credit pack catalog (server-side only, never trust client)
const PACKS: Record<string, { credits: number; base_usd: number }> = {
  pack_100: { credits: 100, base_usd: 5 },
  pack_500: { credits: 500, base_usd: 20 },
  pack_1000: { credits: 1000, base_usd: 35 },
};

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { pack_id } = await req.json();
  const pack = PACKS[pack_id];
  if (!pack) return NextResponse.json({ error: 'Invalid pack_id.' }, { status: 400 });

  const { data: user } = await supabase.from('users').select('country_code').eq('id', userId).single();
  const tier = resolveTier(user?.country_code ?? 'XX');
  const { amount, currency } = priceFor(tier, pack.base_usd);

  // Record pending payment
  const { data: payment } = await supabase
    .from('payments')
    .insert({
      user_id: userId,
      amount_cents: Math.round(amount * 100),
      currency,
      status: 'pending',
    })
    .select('id')
    .single();

  // Create Razorpay order
  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100), // in smallest currency unit
    currency,
    receipt: payment!.id,
    notes: { user_id: userId, pack_id, payment_id: payment!.id },
  });

  // Store order id
  await supabase
    .from('payments')
    .update({ razorpay_order_id: order.id })
    .eq('id', payment!.id);

  return NextResponse.json({
    razorpay_order_id: order.id,
    amount: order.amount,
    currency: order.currency,
  });
}
```

---

## Codebase Context

### Key Patterns in Use
- **Wallet resolver:** checks team membership first — team members always deduct from team wallet.
- **Client-supplied amount ignored:** `topup` reads `pack_id` and calculates price server-side; any client `amount` field is discarded.
- **Cursor pagination:** uses `created_at` as cursor, works with range-partitioned table.
- **Pending payment row:** created before Razorpay order so payment is never "lost" if webhook arrives before UI refresh.

---

## Handoff from Previous Task
**Files changed by task 7:** middleware (`x-user-id` injection), session management routes.
**Files changed by task 4:** `lib/pricing/ppp.ts` with `resolveTier` and `priceFor`.
**Decisions made:** Razorpay orders API for top-up; cursor pagination by `created_at`.
**Context for this task:** `credit_wallets`, `credit_transactions`, `payments` tables exist (task 1). `fn_deduct_credits`, `fn_credit_topup` RPCs exist (task 3).

---

## Implementation Steps
1. `lib/credits/wallet.ts` — wallet resolver + RPC wrappers.
2. `app/api/credits/balance/route.ts`.
3. `app/api/credits/history/route.ts` — cursor-paginated history.
4. `app/api/credits/topup/route.ts` — PPP-priced Razorpay order.
5. `npx tsc --noEmit`
6. Run: `/verify`

_Requirements: 6, 7, 10, 24_

---

## Test Cases

### Expected behaviors
```
GET /api/credits/balance (team member) → resolves team wallet balance
GET /api/credits/history?limit=20 → 20 items + next_cursor
GET /api/credits/history?cursor=<ts> → items older than cursor
POST /api/credits/topup { pack_id: 'pack_100' } → razorpay_order_id + server-calculated amount
POST /api/credits/topup with injected amount → amount field ignored, server-calculated amount used
POST /api/credits/topup { pack_id: 'bad' } → 400
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| User is team_member | Resolve team wallet, not personal wallet |
| Client sends `amount` in topup body | Ignore — calculate server-side from pack_id + country |
| No wallet found | Return 404 |
| History limit > 50 | Clamp to 50 |
| Wallet balance = 0 | Balance endpoint returns 0 (not error) |

---

## Acceptance Criteria
- [ ] Balance endpoint returns wallet `balance` and `wallet_kind`
- [ ] History paginates correctly with `next_cursor`
- [ ] Top-up creates Razorpay order with server-side PPP amount; client-supplied amount ignored
- [ ] Team member's balance call returns team wallet balance
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_

Status: COMPLETE
Completed: 2026-04-28T00:00:00Z
