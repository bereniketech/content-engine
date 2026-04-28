---
task: 023
feature: monetization-and-user-system
status: pending
model: sonnet
supervisor: software-cto
agent: web-frontend-expert
depends_on: [7, 8, 16, 18, 19]
---

# Task 023: User Dashboard UI

## Skills
- .kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md
- .kit/skills/development/build-website-web-app/SKILL.md
- .kit/skills/core/karpathy-principles/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-frontend-expert.md

## Commands
- .kit/commands/core/task-handoff.md
- .kit/commands/development/verify.md

> Load the skills and agents listed above before reading anything else.

---

## Objective
Build the user-facing dashboard: balance card with count-up animation, subscription status, usage history, billing history, account/sessions page, team management page, and PPP-aware pricing page. Status banners for unverified email, past-due subscription, low credits, and account restriction. WCAG 2.2 AA.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `app/(app)/dashboard/page.tsx` | Main dashboard: balance, subscription, usage, CTAs |
| `app/(app)/billing/page.tsx` | Billing history with Razorpay invoice links |
| `app/(app)/account/page.tsx` | Profile + sessions list with revoke |
| `app/(app)/teams/page.tsx` | Team management: create, invite, members, transfer |
| `app/(marketing)/pricing/page.tsx` | PPP-aware pricing page |
| `components/dashboard/BalanceCard.tsx` | Balance with count-up animation |
| `components/dashboard/StatusBanner.tsx` | Dismissible status banners |
| `components/dashboard/UsageHistory.tsx` | Paginated credit transaction list |

### Modify
_(none)_

---

## Dependencies
```bash
# No new packages — Tailwind + existing shadcn components
```

---

## Code Templates

### `components/dashboard/BalanceCard.tsx`
```tsx
'use client';
import { useEffect, useState, useRef } from 'react';

export default function BalanceCard({ balance }: { balance: number }) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number>();
  const prefersReduced = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  useEffect(() => {
    if (prefersReduced) { setDisplayed(balance); return; }
    const start = 0;
    const duration = 400;
    const startTime = performance.now();
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setDisplayed(Math.floor(progress * balance));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [balance, prefersReduced]);

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-6" aria-label={`Credit balance: ${balance}`}>
      <p className="text-sm text-gray-400">Credit Balance</p>
      <p className="mt-1 text-4xl font-bold text-white" aria-live="polite">{displayed.toLocaleString()}</p>
      <p className="mt-1 text-xs text-gray-500">credits remaining</p>
    </div>
  );
}
```

### `components/dashboard/StatusBanner.tsx`
```tsx
'use client';

type BannerType = 'email-not-verified' | 'subscription-past-due' | 'low-credits' | 'account-restricted';

const BANNERS: Record<BannerType, { bg: string; message: string; cta?: { label: string; href: string } }> = {
  'email-not-verified': {
    bg: 'bg-yellow-900/40 border-yellow-700',
    message: 'Please verify your email to unlock all features and free credits.',
    cta: { label: 'Resend code', href: '/account?verify=1' },
  },
  'subscription-past-due': {
    bg: 'bg-red-900/40 border-red-700',
    message: 'Your payment failed. Please update your payment method to avoid service interruption.',
    cta: { label: 'Update payment', href: '/billing' },
  },
  'low-credits': {
    bg: 'bg-orange-900/40 border-orange-700',
    message: 'Your credit balance is running low.',
    cta: { label: 'Top up', href: '/pricing' },
  },
  'account-restricted': {
    bg: 'bg-red-900/40 border-red-700',
    message: 'Your account has been restricted. Contact support for assistance.',
  },
};

export default function StatusBanner({ type }: { type: BannerType }) {
  const banner = BANNERS[type];
  return (
    <div role="alert" className={`mb-4 flex items-center justify-between rounded border px-4 py-3 text-sm ${banner.bg}`}>
      <span className="text-gray-200">{banner.message}</span>
      {banner.cta && (
        <a href={banner.cta.href} className="ml-4 shrink-0 font-medium text-white underline hover:no-underline">
          {banner.cta.label}
        </a>
      )}
    </div>
  );
}
```

### `app/(app)/dashboard/page.tsx`
```tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import BalanceCard from '@/components/dashboard/BalanceCard';
import StatusBanner from '@/components/dashboard/StatusBanner';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [userRes, walletRes, subRes] = await Promise.all([
    supabase.from('users').select('email_verified, account_status, trust_score').eq('id', user.id).single(),
    supabase.from('credit_wallets').select('balance').eq('user_id', user.id).single(),
    supabase.from('subscriptions')
      .select('status, subscription_plans(name, monthly_credits), current_period_end')
      .eq('user_id', user.id)
      .in('status', ['active', 'past_due', 'pending'])
      .maybeSingle(),
  ]);

  const profile = userRes.data;
  const balance = walletRes.data?.balance ?? 0;
  const subscription = subRes.data;

  return (
    <div className="mx-auto max-w-5xl py-8 px-4">
      {!profile?.email_verified && <StatusBanner type="email-not-verified" />}
      {subscription?.status === 'past_due' && <StatusBanner type="subscription-past-due" />}
      {profile?.account_status === 'restricted' && <StatusBanner type="account-restricted" />}

      <h1 className="mb-6 text-2xl font-bold text-white">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <BalanceCard balance={balance} />

        {/* Subscription card */}
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
          <p className="text-sm text-gray-400">Subscription</p>
          {subscription ? (
            <>
              <p className="mt-1 text-xl font-semibold text-white capitalize">
                {(subscription.subscription_plans as any)?.name ?? '—'}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {subscription.status} · Renews {subscription.current_period_end
                  ? new Date(subscription.current_period_end).toLocaleDateString()
                  : '—'}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-gray-400">No active plan</p>
          )}
        </div>

        {/* CTA card */}
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6 flex flex-col gap-3">
          <a href="/pricing" className="rounded bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-500">
            {subscription ? 'Upgrade plan' : 'Get started'}
          </a>
          <a href="/pricing#topup" className="rounded border border-gray-700 px-4 py-2 text-center text-sm text-gray-300 hover:bg-gray-800">
            Buy credits
          </a>
        </div>
      </div>
    </div>
  );
}
```

### `app/(app)/account/page.tsx`
```tsx
'use client';
import { useState, useEffect } from 'react';

type SessionRow = { id: string; user_agent: string; last_seen_ip: string; last_seen_at: string };

export default function AccountPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    fetch('/api/auth/sessions').then((r) => r.json()).then((j) => setSessions(j.sessions ?? []));
  }, []);

  async function revoke(id: string) {
    await fetch(`/api/auth/sessions/${id}`, { method: 'DELETE' });
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="mx-auto max-w-2xl py-8 px-4">
      <h1 className="mb-6 text-2xl font-bold text-white">Account</h1>
      <section aria-labelledby="sessions-heading">
        <h2 id="sessions-heading" className="mb-3 text-lg font-semibold text-white">Active Sessions</h2>
        <ul className="space-y-2" role="list">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded border border-gray-800 bg-gray-900 px-4 py-3 text-sm">
              <div>
                <p className="text-gray-200 truncate max-w-xs">{s.user_agent || 'Unknown device'}</p>
                <p className="text-gray-500 text-xs">{s.last_seen_ip} · Last seen {new Date(s.last_seen_at).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => revoke(s.id)}
                aria-label={`Revoke session for ${s.user_agent}`}
                className="ml-4 text-xs text-red-400 hover:text-red-300 underline"
              >
                Revoke
              </button>
            </li>
          ))}
          {sessions.length === 0 && <li className="text-gray-500 text-sm">No active sessions found.</li>}
        </ul>
      </section>
    </div>
  );
}
```

### `app/(marketing)/pricing/page.tsx`
```tsx
import { headers } from 'next/headers';
import { resolveTier, priceFor } from '@/lib/pricing/ppp';

const PLANS = [
  { id: 'starter', name: 'Starter', credits: 200, base_usd: 9, features: ['200 credits/mo', 'Email support'] },
  { id: 'pro', name: 'Pro', credits: 1000, base_usd: 29, features: ['1,000 credits/mo', 'Priority support', 'API access'] },
  { id: 'team', name: 'Team', credits: 5000, base_usd: 79, features: ['5,000 shared credits/mo', 'Team management', 'SSO'] },
];

export default function PricingPage() {
  const country = headers().get('cf-ipcountry') ?? 'XX';
  const tier = resolveTier(country);

  return (
    <div className="mx-auto max-w-4xl py-16 px-4">
      <h1 className="mb-2 text-center text-3xl font-bold text-white">Simple, honest pricing</h1>
      <p className="mb-10 text-center text-gray-400">Prices shown in your local currency.</p>

      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const { amount, currency } = priceFor(tier, plan.base_usd);
          return (
            <div key={plan.id} className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h2 className="text-lg font-semibold text-white">{plan.name}</h2>
              <p className="mt-2 text-3xl font-bold text-white">
                {currency} {amount}
                <span className="text-sm font-normal text-gray-400">/mo</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-400">
                {plan.features.map((f) => <li key={f}>✓ {f}</li>)}
              </ul>
              <a
                href="/login?redirect=/billing"
                className="mt-6 block rounded bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-500"
              >
                Get started
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Codebase Context

### Key Patterns in Use
- **Server components for data fetching:** dashboard and pricing pages are RSCs; no client-side data fetching on initial load.
- **Count-up animation:** uses `requestAnimationFrame` with 400ms duration; skips entirely on `prefers-reduced-motion`.
- **Status banners:** `role=alert` for screen reader announcement; dismissible via JS state.
- **PPP pricing page:** reads `cf-ipcountry` header server-side; calls `resolveTier` from task 4 lib.

---

## Handoff from Previous Task
**Files changed by tasks 7, 8, 16:** sessions API, balance API, subscription API all functional.
**Files changed by task 4:** `lib/pricing/ppp.ts` with `resolveTier` + `priceFor`.
**Context for this task:** All API endpoints exist — UI just calls them.

---

## Implementation Steps
1. `components/dashboard/BalanceCard.tsx` — count-up animation component.
2. `components/dashboard/StatusBanner.tsx` — multi-type banner.
3. `app/(app)/dashboard/page.tsx` — main dashboard RSC.
4. `app/(app)/account/page.tsx` — sessions management.
5. `app/(app)/billing/page.tsx` — billing history table.
6. `app/(app)/teams/page.tsx` — team management.
7. `app/(marketing)/pricing/page.tsx` — PPP-aware pricing.
8. Start dev server, verify all pages render, test banners, test session revoke.
9. `npx tsc --noEmit`
10. Run: `/verify`

_Requirements: 10, 24_

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| User not logged in | Redirect to /login (layout guard) |
| `prefers-reduced-motion` | Skip count-up, show static balance immediately |
| Subscription past_due | Show red banner above fold |
| Email not verified | Show yellow banner above fold |
| Country unknown (XX) | Show Tier 1 (base) pricing |

---

## Acceptance Criteria
- [ ] Dashboard renders balance/subscription/CTA in 3-up at lg, stacked at <md
- [ ] Balance count-up animates 0→balance in 400ms; skip if `prefers-reduced-motion`
- [ ] Past-due banner appears when subscription status is past_due
- [ ] Email-not-verified banner appears until email_verified=true
- [ ] Pricing displays Tier 3 prices for IN user
- [ ] Session revoke removes row without reload errors
- [ ] AA contrast on all text (4.5:1 minimum)
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
