---
task: 014
feature: monetization-and-user-system
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: [4, 7, 8]
---

# Task 014: Razorpay Checkout Integration — Orders & PPP Pricing

## Skills
- .kit/skills/development/api-design/SKILL.md
- .kit/skills/development/code-writing-software-development/SKILL.md
- .kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md
- .kit/skills/data-backend/postgres-patterns/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-backend-expert.md
- .kit/agents/software-company/product/fintech-payments-expert.md

## Commands
- .kit/commands/core/task-handoff.md
- .kit/commands/development/verify.md

> Load the skills and agents listed above before reading anything else.

---

## Objective
Wire Razorpay SDK for one-time orders (credit topups) and recurring subscriptions, expose localized pricing endpoint with PPP, and protect against VPN-based tier arbitrage.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `lib/billing/razorpay.ts` | Razorpay SDK wrapper: createOrder, createSubscription, verifyWebhookSignature |
| `app/api/subscriptions/route.ts` | POST creates subscription + DB row |
| `app/api/pricing/route.ts` | GET localized pricing for tier |
| `lib/billing/razorpay.test.ts` | Tests for amount math, currency selection, signature verify |

### Modify
| File | What to change |
|------|---------------|
| `app/api/credits/topup/route.ts` (task 8 stub) | Replace stub with real `createOrder` call |
| `lib/pricing/ppp.ts` (task 4) | Confirm exports `resolveTier`, `priceFor` exist |

---

## Dependencies
```bash
npm install razorpay
# ENV:
#   RAZORPAY_KEY_ID
#   RAZORPAY_KEY_SECRET
#   RAZORPAY_WEBHOOK_SECRET
#   NEXT_PUBLIC_RAZORPAY_KEY_ID  # for client-side checkout
```

---

## API Contracts
```
POST /api/subscriptions
Auth: required
Request:  { plan_id: string }
Response: { subscription_id: string; hosted_url: string }

POST /api/credits/topup
Auth: required
Request:  { pack_id: string }
Response: { razorpay_order_id: string; amount: number; currency: 'INR' | 'USD'; payment_id: string }

GET /api/pricing
Auth: optional
Response: { tier: string; currency: string; plans: Array<{ id, name, baseUsd, localized }> }
Cache:    s-maxage=300
```

---

## Code Templates

### `lib/billing/razorpay.ts`
```typescript
import Razorpay from 'razorpay';
import crypto from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { resolveTier, priceFor } from '@/lib/pricing/ppp';

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function createOrder(params: {
  userId: string;
  packId: string;
  countryCode: string;
  detectedCountryCode?: string;
}): Promise<{ orderId: string; amount: number; currency: 'INR' | 'USD' }> {
  const supabase = createClient();
  const { data: pack } = await supabase
    .from('credit_packs')
    .select('id, base_usd_price, credits_granted')
    .eq('id', params.packId)
    .single();
  if (!pack) throw new Error(`Pack not found: ${params.packId}`);

  // VPN tier protection: pick higher tier (lower discount) if mismatch
  const storedTier = await resolveTier(params.countryCode);
  const detectedTier = params.detectedCountryCode
    ? await resolveTier(params.detectedCountryCode)
    : storedTier;
  const effectiveTier = compareTiers(storedTier, detectedTier);

  const currency: 'INR' | 'USD' = params.countryCode === 'IN' ? 'INR' : 'USD';
  const localized = priceFor(effectiveTier, currency, pack.base_usd_price);
  const amount = Math.round(localized * 100); // smallest unit

  const order = await rzp.orders.create({
    amount,
    currency,
    receipt: `pack_${params.userId.slice(0, 8)}_${Date.now()}`,
    notes: {
      userId: params.userId,
      packId: params.packId,
      tier: effectiveTier,
      credits: String(pack.credits_granted),
    },
  });

  // Persist payment row in 'created' state
  await supabase.from('payments').insert({
    user_id: params.userId,
    razorpay_order_id: order.id,
    amount,
    currency,
    status: 'created',
    metadata: { packId: params.packId, tier: effectiveTier },
  });

  return { orderId: order.id, amount, currency };
}

export async function createSubscription(params: {
  userId: string;
  planId: string;
  razorpayPlanId: string;
}): Promise<{ subscriptionId: string; hostedUrl: string }> {
  const sub = await rzp.subscriptions.create({
    plan_id: params.razorpayPlanId,
    total_count: 12,
    quantity: 1,
    customer_notify: 1,
    notes: { userId: params.userId, planId: params.planId },
  });
  return { subscriptionId: sub.id, hostedUrl: (sub as any).short_url ?? '' };
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Tier ordering: Tier1 (USD full) > Tier2 > Tier3 > Tier4 (deepest discount)
const TIER_RANK: Record<string, number> = { Tier1: 4, Tier2: 3, Tier3: 2, Tier4: 1 };
function compareTiers(a: string, b: string): string {
  return (TIER_RANK[a] ?? 4) >= (TIER_RANK[b] ?? 4) ? a : b;
}
```

### `app/api/subscriptions/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSubscription } from '@/lib/billing/razorpay';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as { plan_id: string };
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('id, razorpay_plan_id, name')
    .eq('id', body.plan_id)
    .single();
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

  const { subscriptionId, hostedUrl } = await createSubscription({
    userId: user.id,
    planId: plan.id,
    razorpayPlanId: plan.razorpay_plan_id,
  });

  await supabase.from('subscriptions').insert({
    user_id: user.id,
    plan_id: plan.id,
    razorpay_subscription_id: subscriptionId,
    status: 'pending',
  });

  return NextResponse.json({ subscription_id: subscriptionId, hosted_url: hostedUrl });
}
```

### `app/api/pricing/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveTier, priceFor } from '@/lib/pricing/ppp';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let countryCode = 'XX';
  if (user) {
    const { data: u } = await supabase.from('users').select('country_code').eq('id', user.id).single();
    countryCode = u?.country_code ?? 'XX';
  } else {
    const headerCountry = req.headers.get('x-vercel-ip-country');
    if (headerCountry) countryCode = headerCountry;
  }
  const tier = await resolveTier(countryCode);
  const currency: 'INR' | 'USD' = countryCode === 'IN' ? 'INR' : 'USD';

  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('id, name, base_usd_price, monthly_credits')
    .order('base_usd_price');

  const localized = (plans ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    baseUsd: p.base_usd_price,
    localized: priceFor(tier, currency, p.base_usd_price),
    monthlyCredits: p.monthly_credits,
  }));

  return NextResponse.json(
    { tier, currency, plans: localized },
    { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' } }
  );
}
```

### Modification to `app/api/credits/topup/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createOrder } from '@/lib/billing/razorpay';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as { pack_id: string };
  const { data: u } = await supabase.from('users').select('country_code').eq('id', user.id).single();
  const detected = req.headers.get('x-vercel-ip-country') ?? undefined;

  const { orderId, amount, currency } = await createOrder({
    userId: user.id,
    packId: body.pack_id,
    countryCode: u?.country_code ?? 'XX',
    detectedCountryCode: detected,
  });

  return NextResponse.json({
    razorpay_order_id: orderId,
    amount,
    currency,
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  });
}
```

---

## Codebase Context

### Key Code Snippets
```typescript
// lib/pricing/ppp.ts (task 4) — resolveTier(countryCode), priceFor(tier, currency, baseUsd)
// subscription_plans (task 2): id, name, base_usd_price, monthly_credits, razorpay_plan_id
// credit_packs (task 2): id, base_usd_price, credits_granted
// payments (task 2): id, user_id, razorpay_order_id, razorpay_payment_id, amount, currency, status, metadata
// subscriptions (task 2): id, user_id, plan_id, razorpay_subscription_id, status, period_end
```

### Key Patterns in Use
- **Pattern:** All amounts persisted in smallest currency unit (paise for INR, cents for USD).
- **Pattern:** `notes` map on Razorpay objects always carries `userId` + `packId|planId` for webhook routing.
- **Pattern:** Pricing endpoint cached at edge (s-maxage=300) since tier rarely changes per session.

### Architecture Decisions
- ADR: Currency choice keyed only on `countryCode === 'IN'` — only India uses INR; rest of world quoted in USD per Razorpay International setup.
- ADR: VPN protection picks the *higher* tier (less discount) on mismatch to prevent India-rate fraud from non-India IPs.
- ADR: Subscription created in `pending` state; webhook `subscription.activated` flips to `active` (task 15).

---

## Handoff from Previous Task
**Files changed by previous task:** task 4 (PPP), task 7 (auth/middleware), task 8 (topup stub).
**Decisions made:** Tier1-4 nomenclature; INR only for IN.
**Context for this task:** topup stub returned dummy data — replace with Razorpay createOrder.
**Open questions left:** none.

---

## Implementation Steps
1. `npm install razorpay`
2. `lib/billing/razorpay.ts` — implement createOrder + createSubscription + verifyWebhookSignature.
3. `app/api/subscriptions/route.ts` — implement POST.
4. `app/api/pricing/route.ts` — implement GET with edge cache headers.
5. Replace `app/api/credits/topup/route.ts` body with real createOrder call.
6. Add Razorpay env vars to `.env.local` and Vercel.
7. Run: `npx tsc --noEmit`
8. Run: `npm test -- lib/billing`
9. Run: `/verify`

_Requirements: 7, 9, 10, 12_

---

## Test Cases

### File: `lib/billing/razorpay.test.ts`
```typescript
import { describe, it, expect, vi } from 'vitest';
import crypto from 'node:crypto';
import { verifyWebhookSignature } from './razorpay';

describe('verifyWebhookSignature', () => {
  beforeAll(() => { process.env.RAZORPAY_WEBHOOK_SECRET = 'testsecret'; });

  it('returns true for valid HMAC SHA256', () => {
    const body = '{"event":"payment.captured"}';
    const sig = crypto.createHmac('sha256', 'testsecret').update(body).digest('hex');
    expect(verifyWebhookSignature(body, sig)).toBe(true);
  });

  it('returns false for tampered body', () => {
    const body = '{"event":"payment.captured"}';
    const sig = crypto.createHmac('sha256', 'testsecret').update(body).digest('hex');
    expect(verifyWebhookSignature('{"event":"refund"}', sig)).toBe(false);
  });

  it('returns false for empty signature', () => {
    expect(verifyWebhookSignature('{}', '')).toBe(false);
  });

  it('returns false for length-mismatched signature (timing-safe path)', () => {
    expect(verifyWebhookSignature('{}', 'abc')).toBe(false);
  });
});

describe('createOrder amount math', () => {
  it('uses INR for IN country code', async () => {
    // mocked supabase + razorpay; verify currency='INR' was sent to rzp.orders.create
  });
  it('uses USD for non-IN country code', async () => {
    // verify currency='USD'
  });
  it('multiplies localized price by 100 for smallest unit', async () => {
    // localized=9 USD -> amount=900 cents
  });
  it('VPN protection picks higher tier when stored=Tier3 detected=Tier1', async () => {
    // expected effective tier = Tier1 (less discount)
  });
});
```

### File: `app/api/pricing/route.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import { GET } from './route';

describe('GET /api/pricing', () => {
  it('returns INR currency for IN user', async () => {
    // mock auth + users.country_code='IN'
    // assert response.currency === 'INR'
  });
  it('returns USD for anonymous request without geo header', async () => {
    // assert currency === 'USD' and tier resolves from 'XX'
  });
  it('sends Cache-Control: s-maxage=300', async () => {
    const res = await GET(new Request('http://x/api/pricing') as any);
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=300');
  });
});
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| countryCode === 'IN' | Currency = INR |
| countryCode !== 'IN' | Currency = USD |
| Stored tier and detected (IP) tier differ | Use the higher tier (Tier1 > Tier2 > Tier3 > Tier4) |
| Pack not found | 404 with error message |
| Plan not found | 404 with error message |
| Razorpay order create fails | Bubble error → 500 (caller logs) |
| Webhook signature length mismatch | Return false BEFORE timingSafeEqual to avoid throw |
| Empty signature header | Return false |
| Anonymous pricing request with x-vercel-ip-country | Use header for tier resolution |
| Anonymous pricing request without header | Default to 'XX' (Tier1, no discount) |

---

## Acceptance Criteria
- [ ] WHEN an Indian user requests pricing THEN response.currency === 'INR' and prices are in INR.
- [ ] WHEN a US user requests topup pack with base $9 USD THEN order.amount === 900 (cents) and currency 'USD'.
- [ ] WHEN stored country_code is 'IN' but x-vercel-ip-country is 'US' THEN higher tier is used (US pricing).
- [ ] WHEN webhook signature is valid HMAC-SHA256 of body with secret THEN verify returns true.
- [ ] WHEN webhook signature is wrong length THEN verify returns false (no timingSafeEqual throw).
- [ ] WHEN POST /api/subscriptions succeeds THEN a subscriptions row exists with status='pending'.
- [ ] WHEN GET /api/pricing succeeds THEN response carries Cache-Control s-maxage=300.
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm test -- lib/billing` — all pass
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
