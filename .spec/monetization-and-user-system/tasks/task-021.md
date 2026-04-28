---
task: 021
feature: monetization-and-user-system
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: [1, 2, 3, 7, 11]
---

# Task 021: Admin API — Users, Payments, Controls, Blocklist, Audit

## Skills
- .kit/skills/development/api-design/SKILL.md
- .kit/skills/testing-quality/security-review/SKILL.md
- .kit/skills/core/karpathy-principles/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-backend-expert.md

## Commands
- .kit/commands/core/task-handoff.md
- .kit/commands/development/verify.md

> Load the skills and agents listed above before reading anything else.

---

## Objective
Build all admin API endpoints with dual-check authorization (JWT `role=admin` + `account_type=admin`), admin-action audit logging, and runtime-effective blocklist updates. Every mutation requires a reason field.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `lib/admin/auth.ts` | Admin guard helper — validates JWT + account_type=admin |
| `app/api/admin/users/route.ts` | GET paginated user list with search |
| `app/api/admin/users/[id]/credits/route.ts` | POST adjust credits (requires reason) |
| `app/api/admin/users/[id]/block/route.ts` | POST block user (invalidates sessions) |
| `app/api/admin/users/[id]/unblock/route.ts` | POST unblock user |
| `app/api/admin/users/[id]/trust/route.ts` | POST manual trust score override |
| `app/api/admin/abuse-log/route.ts` | GET filterable abuse log |
| `app/api/admin/blocklist/domains/route.ts` | POST add domain / GET list |
| `app/api/admin/blocklist/domains/[domain]/route.ts` | DELETE remove domain |

### Modify
_(none)_

---

## Dependencies
```bash
# No new packages
# ENV: uses existing SUPABASE_SERVICE_ROLE_KEY
```

---

## API Contracts
```
GET /api/admin/users?cursor=&q=&limit=
  Admin only
  → 200 { users: UserRow[]; next_cursor: string | null }

POST /api/admin/users/:id/credits
  Body: { delta: number; reason: string (min 10 chars) }
  → 200 { balance: number }
  → 400 { error: 'Reason must be at least 10 characters.' }

POST /api/admin/users/:id/block
  Body: { reason: string }
  → 200 { ok: true }

POST /api/admin/users/:id/unblock
  → 200 { ok: true }

POST /api/admin/users/:id/trust
  Body: { score: number 0-100; reason: string }
  → 200 { trust_score: number }

GET /api/admin/abuse-log?ip=&fingerprint=&email=&event_type=&from=&to=&limit=
  → 200 { items: AbuseLog[]; next_cursor: string | null }

POST /api/admin/blocklist/domains
  Body: { domain: string; reason?: string }
  → 201 { domain }

DELETE /api/admin/blocklist/domains/:domain
  → 204

GET /api/admin/blocklist/domains
  → 200 { domains: BlocklistEntry[] }
```

---

## Code Templates

### `lib/admin/auth.ts`
```typescript
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function requireAdmin(req: NextRequest): Promise<string | null> {
  const userId = req.headers.get('x-user-id');
  if (!userId) return null;

  const { data: user } = await supabase
    .from('users')
    .select('account_type')
    .eq('id', userId)
    .single();

  if (user?.account_type !== 'admin') return null;
  return userId;
}

export async function logAdminAction(opts: {
  adminId: string;
  targetUserId?: string;
  actionType: string;
  reason: string;
  metadata: Record<string, unknown>;
}) {
  await supabase.from('admin_actions').insert({
    admin_id: opts.adminId,
    target_user_id: opts.targetUserId ?? null,
    action_type: opts.actionType,
    reason: opts.reason,
    metadata: opts.metadata,
  });
}
```

### `app/api/admin/users/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const url = req.nextUrl;
  const q = url.searchParams.get('q') ?? '';
  const cursor = url.searchParams.get('cursor');
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100);

  let query = supabase
    .from('users')
    .select(`
      id, email, account_type, account_status, trust_score, country_code, email_verified,
      created_at, last_active_at,
      credit_wallets(balance),
      subscriptions(status, plan_id)
    `)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (q) query = query.ilike('email', `%${q}%`);
  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const hasMore = (data?.length ?? 0) > limit;
  const items = hasMore ? data!.slice(0, limit) : (data ?? []);
  const next_cursor = hasMore ? items[items.length - 1].created_at : null;

  return NextResponse.json({ users: items, next_cursor });
}
```

### `app/api/admin/users/[id]/credits/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, logAdminAction } from '@/lib/admin/auth';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { delta, reason } = await req.json();
  if (!reason || reason.length < 10) {
    return NextResponse.json({ error: 'Reason must be at least 10 characters.' }, { status: 400 });
  }
  if (typeof delta !== 'number' || delta === 0) {
    return NextResponse.json({ error: 'Invalid delta.' }, { status: 400 });
  }

  const { data: wallet } = await supabase
    .from('credit_wallets')
    .select('id, balance')
    .eq('user_id', params.id)
    .single();

  if (!wallet) return NextResponse.json({ error: 'User wallet not found.' }, { status: 404 });

  const beforeBalance = wallet.balance;
  const newBalance = Math.max(0, beforeBalance + delta);

  await supabase.from('credit_wallets').update({ balance: newBalance }).eq('id', wallet.id);

  // Log transaction
  await supabase.from('credit_transactions').insert({
    wallet_id: wallet.id,
    acting_user_id: params.id,
    action_type: 'admin_adjustment',
    delta,
    balance_after: newBalance,
    request_id: crypto.randomUUID(),
    actor: 'admin',
  });

  await logAdminAction({
    adminId,
    targetUserId: params.id,
    actionType: 'credit_adjust',
    reason,
    metadata: { before: beforeBalance, after: newBalance, delta },
  });

  return NextResponse.json({ balance: newBalance });
}
```

### `app/api/admin/users/[id]/block/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, logAdminAction } from '@/lib/admin/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { reason } = await req.json();

  await supabase
    .from('users')
    .update({ account_status: 'blocked' })
    .eq('id', params.id);

  // Invalidate all sessions
  await supabase.auth.admin.signOut(params.id, 'global');

  await logAdminAction({
    adminId,
    targetUserId: params.id,
    actionType: 'block',
    reason: reason ?? 'Admin block',
    metadata: {},
  });

  return NextResponse.json({ ok: true });
}
```

### `app/api/admin/users/[id]/unblock/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, logAdminAction } from '@/lib/admin/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  await supabase.from('users').update({ account_status: 'active' }).eq('id', params.id);

  await logAdminAction({
    adminId,
    targetUserId: params.id,
    actionType: 'unblock',
    reason: 'Admin unblock',
    metadata: {},
  });

  return NextResponse.json({ ok: true });
}
```

### `app/api/admin/users/[id]/trust/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, logAdminAction } from '@/lib/admin/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { score, reason } = await req.json();
  if (typeof score !== 'number' || score < 0 || score > 100) {
    return NextResponse.json({ error: 'Score must be 0–100.' }, { status: 400 });
  }

  const { data: user } = await supabase.from('users').select('trust_score').eq('id', params.id).single();

  await supabase.rpc('fn_apply_trust_delta', {
    p_user_id: params.id,
    p_delta: score - (user?.trust_score ?? 50),
    p_reason: `admin_override: ${reason}`,
  });

  await logAdminAction({
    adminId,
    targetUserId: params.id,
    actionType: 'trust_override',
    reason,
    metadata: { before: user?.trust_score, after: score },
  });

  return NextResponse.json({ trust_score: score });
}
```

### `app/api/admin/abuse-log/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const url = req.nextUrl;
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200);
  const cursor = url.searchParams.get('cursor');

  let query = supabase
    .from('abuse_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  const ip = url.searchParams.get('ip');
  const fingerprint = url.searchParams.get('fingerprint');
  const email = url.searchParams.get('email');
  const eventType = url.searchParams.get('event_type');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  if (ip) query = query.eq('ip_address', ip);
  if (fingerprint) query = query.eq('fingerprint_hash', fingerprint);
  if (email) query = query.eq('email', email);
  if (eventType) query = query.eq('event_type', eventType);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);
  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const hasMore = (data?.length ?? 0) > limit;
  const items = hasMore ? data!.slice(0, limit) : (data ?? []);
  const next_cursor = hasMore ? items[items.length - 1].created_at : null;

  return NextResponse.json({ items, next_cursor });
}
```

### `app/api/admin/blocklist/domains/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, logAdminAction } from '@/lib/admin/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { data } = await supabase
    .from('email_domain_blocklist')
    .select('domain, reason, added_at')
    .order('added_at', { ascending: false });

  return NextResponse.json({ domains: data ?? [] });
}

export async function POST(req: NextRequest) {
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { domain, reason } = await req.json();
  if (!domain) return NextResponse.json({ error: 'Domain required.' }, { status: 400 });

  await supabase.from('email_domain_blocklist').upsert({ domain, reason: reason ?? '', added_by: adminId });

  await logAdminAction({ adminId, actionType: 'domain_block', reason: reason ?? 'Admin block', metadata: { domain } });

  return NextResponse.json({ domain }, { status: 201 });
}
```

### `app/api/admin/blocklist/domains/[domain]/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, logAdminAction } from '@/lib/admin/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(req: NextRequest, { params }: { params: { domain: string } }) {
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  await supabase.from('email_domain_blocklist').delete().eq('domain', params.domain);

  await logAdminAction({ adminId, actionType: 'domain_unblock', reason: 'Admin removed', metadata: { domain: params.domain } });

  return new NextResponse(null, { status: 204 });
}
```

---

## Codebase Context

### Key Patterns in Use
- **Dual auth guard:** middleware injects `x-user-id`; `requireAdmin` checks `account_type=admin` in DB — both must pass.
- **Audit log on every mutation:** `logAdminAction` writes to `admin_actions` with before/after metadata.
- **Session invalidation:** block calls `supabase.auth.admin.signOut(userId, 'global')` — active within Supabase's session TTL (~5s).
- **Blocklist is live:** reading from `email_domain_blocklist` at signup time — no caching needed; change effective on next signup.

---

## Handoff from Previous Task
**Files changed by task 11:** `fn_apply_trust_delta` RPC available.
**Context for this task:** All tables and RLS policies exist (tasks 1–3).

---

## Implementation Steps
1. `lib/admin/auth.ts` — `requireAdmin` + `logAdminAction`.
2. All route handlers listed in Files section.
3. `npx tsc --noEmit`
4. Run: `/verify`

_Requirements: 12, 23, 28_

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| Non-admin JWT | 403 on all /admin/* |
| Credit adjust with reason < 10 chars | 400 |
| Block user | Set account_status=blocked + sign out globally |
| Domain blocklist change | Effective on next signup (no cache to bust) |
| Every admin mutation | Write admin_actions row with before/after |

---

## Acceptance Criteria
- [ ] Non-admin → 403 on all `/admin/*` routes
- [ ] Credit adjust without reason → 400
- [ ] Block invalidates all sessions within ~5s (Supabase global signout)
- [ ] Domain added → next signup with that domain blocked
- [ ] Every admin action → `admin_actions` row with before/after
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
