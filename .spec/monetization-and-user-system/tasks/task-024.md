---
task: 024
feature: monetization-and-user-system
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: [1, 7, 15, 16]
---

# Task 024: Analytics Endpoints + Admin Dashboard Charts

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
Implement nightly credit aggregation (cron → `daily_credit_aggregates`), conversion event emission on first paid payment, admin metrics endpoints (revenue, abuse, conversion), and admin analytics UI page with Recharts charts.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `supabase/migrations/20260428000009_fn_rollup_daily_credits.sql` | SECURITY DEFINER nightly rollup function |
| `app/api/cron/daily-credit-rollup/route.ts` | Vercel cron handler calling rollup |
| `app/api/admin/metrics/revenue/route.ts` | MRR, churn, by-country |
| `app/api/admin/metrics/abuse/route.ts` | Rules fired/hour, top IPs/fingerprints, trust histogram |
| `app/api/admin/metrics/conversion/route.ts` | Free→paid rate, ARPU, failed payment rate |
| `app/admin/analytics/page.tsx` | Charts dashboard (Recharts) |

### Modify
| File | What to change |
|------|---------------|
| `app/api/webhooks/razorpay/route.ts` (task 15) | Emit `conversion` event log on first payment.captured |

---

## Dependencies
```bash
npm install recharts
# ENV:
CRON_SECRET=   # shared secret for Vercel cron routes
```

---

## API Contracts
```
GET /api/admin/metrics/revenue?months=6
  Admin only
  → { mrr: number; by_country: {country_code, amount}[]; new_vs_returning: {new, returning} }

GET /api/admin/metrics/abuse?days=7
  Admin only
  → { rules_fired_per_hour: {hour, count}[]; top_ips: {ip, count}[]; trust_histogram: {range, count}[] }

GET /api/admin/metrics/conversion?days=30
  Admin only
  → { free_to_paid_rate: number; arpu: number; failed_payment_rate: number; by_country: {country_code, rate}[] }
```

---

## Code Templates

### `supabase/migrations/20260428000009_fn_rollup_daily_credits.sql`
```sql
CREATE OR REPLACE FUNCTION fn_rollup_daily_credits(p_date date DEFAULT CURRENT_DATE - 1)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO daily_credit_aggregates (user_id, action_type, credits_used, day)
  SELECT
    acting_user_id,
    action_type,
    SUM(ABS(delta)) AS credits_used,
    p_date
  FROM credit_transactions
  WHERE created_at >= p_date
    AND created_at < p_date + 1
    AND delta < 0   -- debits only
  GROUP BY acting_user_id, action_type
  ON CONFLICT (user_id, action_type, day)
  DO UPDATE SET credits_used = EXCLUDED.credits_used;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION fn_rollup_daily_credits(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_rollup_daily_credits(date) TO service_role;
```

### `app/api/cron/daily-credit-rollup/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  // Verify Vercel cron secret
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data, error } = await supabase.rpc('fn_rollup_daily_credits');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, rows_upserted: data });
}
```

### `app/api/admin/metrics/revenue/route.ts`
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

  const months = parseInt(req.nextUrl.searchParams.get('months') ?? '6');
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  // MRR: sum of captured payments in current month
  const { data: mrrData } = await supabase
    .from('payments')
    .select('amount_cents')
    .eq('status', 'captured')
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

  const mrr = (mrrData ?? []).reduce((sum, p) => sum + p.amount_cents, 0) / 100;

  // By country
  const { data: byCountry } = await supabase
    .from('payments')
    .select('amount_cents, users(country_code)')
    .eq('status', 'captured')
    .gte('created_at', since.toISOString());

  const countryMap: Record<string, number> = {};
  for (const p of byCountry ?? []) {
    const cc = (p.users as any)?.country_code ?? 'XX';
    countryMap[cc] = (countryMap[cc] ?? 0) + p.amount_cents / 100;
  }

  return NextResponse.json({
    mrr,
    by_country: Object.entries(countryMap).map(([country_code, amount]) => ({ country_code, amount })),
    new_vs_returning: { new: 0, returning: 0 }, // placeholder — implement with payment count per user
  });
}
```

### `app/api/admin/metrics/abuse/route.ts`
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

  const days = parseInt(req.nextUrl.searchParams.get('days') ?? '7');
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: logs } = await supabase
    .from('abuse_logs')
    .select('ip_address, fingerprint_hash, event_type, created_at')
    .gte('created_at', since);

  // Top IPs
  const ipCount: Record<string, number> = {};
  const fpCount: Record<string, number> = {};
  for (const log of logs ?? []) {
    if (log.ip_address) ipCount[log.ip_address] = (ipCount[log.ip_address] ?? 0) + 1;
    if (log.fingerprint_hash) fpCount[log.fingerprint_hash] = (fpCount[log.fingerprint_hash] ?? 0) + 1;
  }

  const top_ips = Object.entries(ipCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([ip, count]) => ({ ip, count }));

  const top_fingerprints = Object.entries(fpCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([fp, count]) => ({ fp, count }));

  // Trust histogram
  const { data: users } = await supabase.from('users').select('trust_score');
  const histogram = [
    { range: '0-19', count: 0 },
    { range: '20-39', count: 0 },
    { range: '40-79', count: 0 },
    { range: '80-100', count: 0 },
  ];
  for (const u of users ?? []) {
    const s = u.trust_score;
    if (s < 20) histogram[0].count++;
    else if (s < 40) histogram[1].count++;
    else if (s < 80) histogram[2].count++;
    else histogram[3].count++;
  }

  return NextResponse.json({ top_ips, top_fingerprints, trust_histogram: histogram });
}
```

### `app/api/admin/metrics/conversion/route.ts`
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

  const days = parseInt(req.nextUrl.searchParams.get('days') ?? '30');
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', since);
  const { count: paidUsers } = await supabase.from('payments').select('user_id', { count: 'exact', head: true })
    .eq('status', 'captured').gte('created_at', since);

  const { data: payments } = await supabase.from('payments').select('amount_cents, status').gte('created_at', since);
  const captured = (payments ?? []).filter((p) => p.status === 'captured');
  const failed = (payments ?? []).filter((p) => p.status === 'failed');

  const totalRevenue = captured.reduce((s, p) => s + p.amount_cents, 0) / 100;
  const arpu = paidUsers && paidUsers > 0 ? totalRevenue / paidUsers : 0;
  const failedRate = payments?.length ? failed.length / payments.length : 0;
  const conversionRate = totalUsers && totalUsers > 0 ? (paidUsers ?? 0) / totalUsers : 0;

  return NextResponse.json({
    free_to_paid_rate: conversionRate,
    arpu,
    failed_payment_rate: failedRate,
    total_users: totalUsers,
    paid_users: paidUsers,
  });
}
```

### `app/admin/analytics/page.tsx`
```tsx
'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminAnalyticsPage() {
  const [revenue, setRevenue] = useState<any>(null);
  const [abuse, setAbuse] = useState<any>(null);
  const [conversion, setConversion] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/metrics/revenue').then((r) => r.json()).then(setRevenue);
    fetch('/api/admin/metrics/abuse').then((r) => r.json()).then(setAbuse);
    fetch('/api/admin/metrics/conversion').then((r) => r.json()).then(setConversion);
  }, []);

  const COLORS = ['#ef4444', '#f97316', '#22c55e', '#6366f1'];

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-white">Analytics</h1>

      {conversion && (
        <section aria-labelledby="conversion-heading">
          <h2 id="conversion-heading" className="mb-3 font-semibold text-white">Conversion</h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Free→Paid Rate', value: `${((conversion.free_to_paid_rate ?? 0) * 100).toFixed(1)}%` },
              { label: 'ARPU', value: `$${(conversion.arpu ?? 0).toFixed(2)}` },
              { label: 'Failed Payment Rate', value: `${((conversion.failed_payment_rate ?? 0) * 100).toFixed(1)}%` },
              { label: 'Total Users (30d)', value: conversion.total_users ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded border border-gray-800 bg-gray-900 p-4">
                <dt className="text-xs text-gray-400">{label}</dt>
                <dd className="mt-1 text-xl font-bold text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {revenue && (
        <section aria-labelledby="revenue-heading">
          <h2 id="revenue-heading" className="mb-3 font-semibold text-white">Revenue by Country</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenue.by_country ?? []} aria-label="Revenue by country bar chart">
              <XAxis dataKey="country_code" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
              <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {abuse && (
        <section aria-labelledby="trust-heading">
          <h2 id="trust-heading" className="mb-3 font-semibold text-white">Trust Score Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart aria-label="Trust score distribution pie chart">
              <Pie data={abuse.trust_histogram ?? []} dataKey="count" nameKey="range" cx="50%" cy="50%" outerRadius={80}>
                {(abuse.trust_histogram ?? []).map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
            </PieChart>
          </ResponsiveContainer>
        </section>
      )}
    </div>
  );
}
```

---

## Codebase Context

### Key Patterns in Use
- **Nightly cron:** Vercel cron (configured in `vercel.json`) calls `POST /api/cron/daily-credit-rollup` with `CRON_SECRET`.
- **`daily_credit_aggregates`:** upsert on `(user_id, action_type, day)` — idempotent, safe to re-run.
- **Recharts:** client-side charts; all charts have `aria-label` for accessibility.

### `vercel.json` cron config (add if not present)
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-credit-rollup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

---

## Handoff from Previous Task
**Files changed by task 15:** `payment.captured` webhook handler available for conversion event hook.
**Files changed by task 21:** admin auth helpers (`requireAdmin`, `logAdminAction`).
**Context for this task:** `daily_credit_aggregates`, `payments`, `abuse_logs`, `users` tables exist (task 1).

---

## Implementation Steps
1. Migration: `fn_rollup_daily_credits`.
2. `app/api/cron/daily-credit-rollup/route.ts`.
3. Three metrics API endpoints.
4. `app/admin/analytics/page.tsx`.
5. Add cron to `vercel.json`.
6. `npx tsc --noEmit`
7. Run: `/verify`

_Requirements: 27_

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| Cron runs without valid secret | 401 |
| Rollup re-runs on same date | Upsert — idempotent, no double-count |
| Admin calls metrics without admin account_type | 403 |
| No payments in period | Return 0 values, not 500 |

---

## Acceptance Criteria
- [ ] Nightly rollup populates `daily_credit_aggregates` without errors
- [ ] Re-running rollup on same date produces same result (idempotent upsert)
- [ ] Revenue endpoint returns aggregated MRR for current month
- [ ] Conversion endpoint returns rate, ARPU, failed payment rate
- [ ] Charts render on `/admin/analytics` without console errors
- [ ] Non-admin → 403 on all metrics endpoints
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
