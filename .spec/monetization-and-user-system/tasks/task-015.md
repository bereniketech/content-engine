---
task: 015
feature: monetization-and-user-system
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: [3, 14]
---

# Task 015: Razorpay Webhook Handler — Signature Verify + Idempotency

## Skills
- .kit/skills/development/api-design/SKILL.md
- .kit/skills/testing-quality/security-review/SKILL.md
- .kit/skills/data-backend/postgres-patterns/SKILL.md
- .kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-backend-expert.md
- .kit/agents/software-company/security/security-architect.md

## Commands
- .kit/commands/core/task-handoff.md
- .kit/commands/development/verify.md

> Load the skills and agents listed above before reading anything else.

---

## Objective
Receive Razorpay webhook events, verify HMAC signature on raw body, deduplicate by idempotency key, route by event type to handlers (payment captured/failed/refunded, subscription activated/charged/cancelled), and credit wallets atomically.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `app/api/webhooks/razorpay/route.ts` | Webhook handler — verify, dedupe, route, persist |
| `lib/billing/webhookHandlers.ts` | Per-event handlers (extracted for testability) |
| `supabase/migrations/20260428000005_fn_credit_topup.sql` | Atomic credit wallet topup function |
| `app/api/webhooks/razorpay/route.test.ts` | Tests: signature mismatch, dedup, replay |

### Modify
| File | What to change |
|------|---------------|
| `lib/email/sender.ts` (task 20 stub) | Confirm `sendEmail(template, userId, data)` signature exists |

---

## Dependencies
```bash
# No new npm packages
# ENV: RAZORPAY_WEBHOOK_SECRET (already set in task 14)
```

---

## API Contracts
```
POST /api/webhooks/razorpay
Headers: x-razorpay-signature: <HMAC-SHA256 hex>
Body:    Razorpay event JSON
Auth:    none (signature replaces auth)
Response 200 { ok: true } | 200 { ok: true, replayed: true } | 400 invalid sig | 500 processing error
```

---

## Code Templates

### `app/api/webhooks/razorpay/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { verifyWebhookSignature } from '@/lib/billing/razorpay';
import { createClient } from '@/lib/supabase/server';
import { routeWebhookEvent } from '@/lib/billing/webhookHandlers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  const supabase = createClient();

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error('webhook_signature_mismatch', { ip });
    await supabase.from('abuse_logs').insert({
      event_type: 'webhook_signature_mismatch',
      ip,
      metadata: { signature, body_preview: rawBody.slice(0, 200) },
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: { event: string; payload: Record<string, any> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const idempotencyKey =
    event.payload?.payment?.entity?.id ??
    event.payload?.subscription?.entity?.id ??
    event.payload?.refund?.entity?.id ??
    crypto.randomUUID();

  // Insert webhook_events with ON CONFLICT DO NOTHING via unique idempotency_key
  const { data: inserted, error: insertErr } = await supabase
    .from('webhook_events')
    .insert({
      provider: 'razorpay',
      event_type: event.event,
      idempotency_key: idempotencyKey,
      payload: event.payload,
      signature,
    })
    .select('id')
    .maybeSingle();

  if (insertErr) {
    // Unique-violation means we've seen this key before — replay
    if (insertErr.code === '23505') {
      return NextResponse.json({ ok: true, replayed: true });
    }
    console.error('webhook_insert_error', insertErr);
    return NextResponse.json({ error: 'Storage error' }, { status: 500 });
  }
  if (!inserted) {
    return NextResponse.json({ ok: true, replayed: true });
  }

  try {
    await routeWebhookEvent(event.event, event.payload, supabase);
    await supabase
      .from('webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', inserted.id);
  } catch (err) {
    console.error('webhook_processing_error', err);
    // Leave processed_at NULL — Razorpay will retry per their schedule
    return NextResponse.json({ error: 'Processing error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

### `lib/billing/webhookHandlers.ts`
```typescript
import { applyTrustEvent } from '@/lib/abuse/trust';
import { sendEmail } from '@/lib/email/sender';

type Supa = ReturnType<typeof import('@/lib/supabase/server').createClient>;

export async function routeWebhookEvent(
  eventType: string,
  payload: Record<string, any>,
  supabase: Supa
): Promise<void> {
  switch (eventType) {
    case 'payment.captured':         return handlePaymentCaptured(payload, supabase);
    case 'payment.failed':           return handlePaymentFailed(payload, supabase);
    case 'subscription.activated':   return handleSubscriptionActivated(payload, supabase);
    case 'subscription.charged':     return handleSubscriptionCharged(payload, supabase);
    case 'subscription.cancelled':   return handleSubscriptionCancelled(payload, supabase);
    case 'payment.refunded':         return handlePaymentRefunded(payload, supabase);
    default:
      console.warn('unhandled_webhook_event', eventType);
  }
}

async function handlePaymentCaptured(payload: any, supabase: Supa) {
  const payment = payload.payment.entity;
  const userId = payment.notes?.userId as string;
  const packId = payment.notes?.packId as string | undefined;
  const credits = Number(payment.notes?.credits ?? 0);

  await supabase
    .from('payments')
    .update({ status: 'captured', razorpay_payment_id: payment.id })
    .eq('razorpay_order_id', payment.order_id);

  if (packId && credits > 0) {
    const { data: wallet } = await supabase
      .from('credit_wallets')
      .select('id')
      .eq('owner_id', userId)
      .eq('owner_kind', 'user')
      .single();
    if (wallet) {
      await supabase.rpc('fn_credit_topup', {
        p_wallet_id: wallet.id,
        p_amount: credits,
        p_payment_id: payment.id,
      });
    }
  }

  await applyTrustEvent(userId, 'payment_success');
  await sendEmail('payment_captured', userId, {
    amount: payment.amount / 100,
    currency: payment.currency,
    credits,
  });
}

async function handlePaymentFailed(payload: any, supabase: Supa) {
  const payment = payload.payment.entity;
  await supabase
    .from('payments')
    .update({ status: 'failed', razorpay_payment_id: payment.id })
    .eq('razorpay_order_id', payment.order_id);
  if (payment.notes?.userId) {
    await sendEmail('payment_failed', payment.notes.userId, {
      reason: payment.error_description ?? 'Payment failed',
    });
  }
}

async function handleSubscriptionActivated(payload: any, supabase: Supa) {
  const sub = payload.subscription.entity;
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      period_start: new Date(sub.current_start * 1000).toISOString(),
      period_end: new Date(sub.current_end * 1000).toISOString(),
    })
    .eq('razorpay_subscription_id', sub.id);

  // Grant initial monthly credits
  const userId = sub.notes?.userId as string;
  const planId = sub.notes?.planId as string;
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('monthly_credits')
    .eq('id', planId)
    .single();
  if (plan && userId) {
    const { data: wallet } = await supabase
      .from('credit_wallets')
      .select('id')
      .eq('owner_id', userId)
      .eq('owner_kind', 'user')
      .single();
    if (wallet) {
      await supabase.rpc('fn_credit_topup', {
        p_wallet_id: wallet.id,
        p_amount: plan.monthly_credits,
        p_payment_id: sub.id,
      });
    }
    await sendEmail('subscription_activated', userId, { planId });
  }
}

async function handleSubscriptionCharged(payload: any, supabase: Supa) {
  const sub = payload.subscription.entity;
  const userId = sub.notes?.userId as string;
  const planId = sub.notes?.planId as string;
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      period_start: new Date(sub.current_start * 1000).toISOString(),
      period_end: new Date(sub.current_end * 1000).toISOString(),
    })
    .eq('razorpay_subscription_id', sub.id);

  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('monthly_credits')
    .eq('id', planId)
    .single();
  if (plan && userId) {
    const { data: wallet } = await supabase
      .from('credit_wallets').select('id')
      .eq('owner_id', userId).eq('owner_kind', 'user').single();
    if (wallet) {
      await supabase.rpc('fn_credit_topup', {
        p_wallet_id: wallet.id,
        p_amount: plan.monthly_credits,
        p_payment_id: payload.payment?.entity?.id ?? sub.id,
      });
    }
  }
}

async function handleSubscriptionCancelled(payload: any, supabase: Supa) {
  const sub = payload.subscription.entity;
  await supabase
    .from('subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('razorpay_subscription_id', sub.id);
  if (sub.notes?.userId) {
    await sendEmail('subscription_cancelled', sub.notes.userId, {});
  }
}

async function handlePaymentRefunded(payload: any, supabase: Supa) {
  const refund = payload.refund.entity;
  const payment = payload.payment?.entity;
  await supabase
    .from('payments')
    .update({ status: 'refunded' })
    .eq('razorpay_payment_id', payment?.id ?? refund.payment_id);

  // Deduct equivalent credits if applicable
  const credits = Number(payment?.notes?.credits ?? 0);
  const userId = payment?.notes?.userId as string | undefined;
  if (userId && credits > 0) {
    const { data: wallet } = await supabase
      .from('credit_wallets').select('id')
      .eq('owner_id', userId).eq('owner_kind', 'user').single();
    if (wallet) {
      await supabase.rpc('fn_credit_topup', {
        p_wallet_id: wallet.id,
        p_amount: -credits,
        p_payment_id: refund.id,
      });
    }
    await sendEmail('payment_refunded', userId, { amount: refund.amount / 100 });
  }
}
```

### `supabase/migrations/20260428000005_fn_credit_topup.sql`
```sql
CREATE OR REPLACE FUNCTION fn_credit_topup(
  p_wallet_id uuid,
  p_amount integer,
  p_payment_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev integer;
  v_new integer;
BEGIN
  SELECT balance INTO v_prev FROM credit_wallets WHERE id = p_wallet_id FOR UPDATE;
  IF v_prev IS NULL THEN
    RAISE EXCEPTION 'Wallet % not found', p_wallet_id;
  END IF;
  v_new := GREATEST(0, v_prev + p_amount);
  UPDATE credit_wallets SET balance = v_new, updated_at = now() WHERE id = p_wallet_id;
  INSERT INTO credit_ledger (wallet_id, delta, balance_after, reason, reference_id)
  VALUES (p_wallet_id, p_amount, v_new, CASE WHEN p_amount > 0 THEN 'topup' ELSE 'refund' END, p_payment_id);
  RETURN jsonb_build_object('previous', v_prev, 'new', v_new, 'delta', p_amount);
END;
$$;

REVOKE ALL ON FUNCTION fn_credit_topup(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_credit_topup(uuid, integer, text) TO service_role;
```

---

## Codebase Context

### Key Code Snippets
```typescript
// webhook_events (task 2): id, provider, event_type, idempotency_key UNIQUE, payload, signature, processed_at, created_at
// payments (task 2): razorpay_order_id, razorpay_payment_id, status, metadata
// subscriptions (task 2): razorpay_subscription_id, status, period_start, period_end, cancelled_at
// credit_wallets (task 2): id, owner_id, owner_kind, balance
// credit_ledger (task 2): wallet_id, delta, balance_after, reason, reference_id, created_at
```

### Key Patterns in Use
- **Pattern:** Read raw body via `req.text()` BEFORE any parsing — Next.js App Router does not consume the body, so signature verification works.
- **Pattern:** Idempotency via UNIQUE constraint on `webhook_events.idempotency_key`; PG error 23505 == replay.
- **Pattern:** `processed_at IS NULL` after handler error → Razorpay's retry policy re-delivers; we accept duplicate delivery.
- **Pattern:** All credit mutations route through `fn_credit_topup` for atomicity + ledger entry.

### Architecture Decisions
- ADR: 200 OK on replay (instead of 409) — Razorpay treats non-2xx as retry trigger; replays must short-circuit cleanly.
- ADR: 500 (not 200) on handler error so Razorpay retries; we tolerate idempotent retries because of UNIQUE key.
- ADR: Refunds reduce credits (negative delta) but cannot drive balance below 0 (clamped in SQL).

---

## Handoff from Previous Task
**Files changed by previous task:** task 14 (`lib/billing/razorpay.ts` with verifyWebhookSignature, createOrder).
**Decisions made:** notes carry `userId`, `packId|planId`, `credits`, `tier`.
**Context for this task:** webhook_events table exists from task 2 with UNIQUE(idempotency_key).
**Open questions left:** sendEmail is a stub in task 20 — calls compile but no-op.

---

## Implementation Steps
1. `supabase/migrations/20260428000005_fn_credit_topup.sql` — write SQL.
2. Run: `npx supabase db push`
3. `lib/billing/webhookHandlers.ts` — implement all 6 handlers + router.
4. `app/api/webhooks/razorpay/route.ts` — implement POST.
5. `app/api/webhooks/razorpay/route.test.ts` — tests.
6. Configure Razorpay dashboard webhook URL → `https://<domain>/api/webhooks/razorpay` with same secret as RAZORPAY_WEBHOOK_SECRET.
7. Run: `npx tsc --noEmit`
8. Run: `npm test -- app/api/webhooks/razorpay`
9. Run: `/verify`

_Requirements: 7, 8, 9, 12_

---

## Test Cases

### File: `app/api/webhooks/razorpay/route.test.ts`
```typescript
import { describe, it, expect, vi, beforeAll } from 'vitest';
import crypto from 'node:crypto';
import { POST } from './route';

const SECRET = 'whsec_test_xyz';
beforeAll(() => { process.env.RAZORPAY_WEBHOOK_SECRET = SECRET; });

function signedRequest(body: object) {
  const raw = JSON.stringify(body);
  const sig = crypto.createHmac('sha256', SECRET).update(raw).digest('hex');
  return new Request('http://x/api/webhooks/razorpay', {
    method: 'POST',
    headers: { 'x-razorpay-signature': sig, 'content-type': 'application/json' },
    body: raw,
  }) as any;
}

describe('POST /api/webhooks/razorpay', () => {
  it('returns 400 when signature is missing', async () => {
    const req = new Request('http://x/api/webhooks/razorpay', {
      method: 'POST',
      body: '{}',
    }) as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when signature does not match body', async () => {
    const req = new Request('http://x/api/webhooks/razorpay', {
      method: 'POST',
      headers: { 'x-razorpay-signature': 'badsig' },
      body: '{"event":"payment.captured"}',
    }) as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid signature');
  });

  it('logs abuse_logs entry on signature mismatch', async () => {
    // verify supabase.from('abuse_logs').insert was called with event_type='webhook_signature_mismatch'
  });

  it('returns 200 ok on first valid payment.captured event', async () => {
    const req = signedRequest({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_1', order_id: 'ord_1', amount: 90000, currency: 'INR', notes: { userId: 'u1', packId: 'p1', credits: '500' } } } },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.replayed).toBeUndefined();
  });

  it('returns 200 replayed=true on duplicate idempotency_key', async () => {
    const event = {
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_dup', order_id: 'ord_dup', amount: 100, currency: 'USD', notes: { userId: 'u1' } } } },
    };
    await POST(signedRequest(event));
    const res2 = await POST(signedRequest(event));
    const body = await res2.json();
    expect(res2.status).toBe(200);
    expect(body.replayed).toBe(true);
  });

  it('returns 500 on handler error and leaves processed_at NULL', async () => {
    // mock routeWebhookEvent to throw; verify processed_at not updated
  });

  it('returns 400 on malformed JSON body even with valid signature', async () => {
    const raw = 'not json';
    const sig = crypto.createHmac('sha256', SECRET).update(raw).digest('hex');
    const req = new Request('http://x/api/webhooks/razorpay', {
      method: 'POST',
      headers: { 'x-razorpay-signature': sig },
      body: raw,
    }) as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('credits wallet via fn_credit_topup on payment.captured', async () => {
    // verify supabase.rpc('fn_credit_topup', { p_wallet_id, p_amount: 500, p_payment_id }) was called
  });

  it('applies payment_success trust event on captured', async () => {
    // verify applyTrustEvent called with userId, 'payment_success'
  });

  it('updates subscription status=active on subscription.activated', async () => {
    // verify .update({ status: 'active', period_start, period_end })
  });

  it('grants monthly_credits on subscription.charged', async () => {
    // verify rpc fn_credit_topup with plan.monthly_credits
  });

  it('deducts credits on payment.refunded', async () => {
    // verify rpc fn_credit_topup with negative p_amount
  });

  it('marks subscription cancelled on subscription.cancelled', async () => {
    // verify .update({ status: 'cancelled', cancelled_at })
  });

  it('logs unhandled events and returns 200', async () => {
    const req = signedRequest({ event: 'order.notification', payload: {} });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| Missing or empty signature header | 400 Invalid signature, log to abuse_logs |
| Signature mismatch | 400 Invalid signature, log to abuse_logs |
| Body is not valid JSON (sig still valid) | 400 Invalid JSON |
| Idempotency key already exists | 200 { ok: true, replayed: true }, do NOT re-route |
| Handler throws | 500, leave processed_at NULL → Razorpay retries |
| Unknown event type | Warn-log, 200 OK (don't ask for retry) |
| payment.captured | Mark payment captured, credit wallet, +30 trust, send email |
| payment.failed | Mark payment failed, send email |
| payment.refunded | Mark payment refunded, deduct credits (clamped at 0), send email |
| subscription.activated | Status=active, grant monthly_credits, send email |
| subscription.charged | Status=active, grant monthly_credits, extend period_end |
| subscription.cancelled | Status=cancelled, set cancelled_at, send email |
| Wallet not found for user in handler | Skip credit op (don't throw, don't retry) |
| User has no notes.userId | Skip user-specific actions, still mark payment |

---

## Acceptance Criteria
- [ ] WHEN signature is invalid THEN 400 returned and `abuse_logs` row inserted with event_type='webhook_signature_mismatch'.
- [ ] WHEN the same payment.captured event is delivered twice THEN second call returns `{ ok: true, replayed: true }` and credits are NOT applied twice.
- [ ] WHEN payment.captured arrives THEN payments.status='captured', wallet balance increases by `notes.credits`, trust score +30, and `credit_ledger` row exists.
- [ ] WHEN handler throws THEN 500 returned and `processed_at` remains NULL (so Razorpay retries).
- [ ] WHEN subscription.activated arrives THEN subscriptions.status='active' and monthly_credits granted exactly once per subscription period.
- [ ] WHEN payment.refunded arrives THEN payments.status='refunded' and wallet balance decreases (clamped ≥ 0).
- [ ] WHEN unknown event type arrives with valid signature THEN 200 OK and warning logged (no retry storm).
- [ ] Concurrent duplicate deliveries cannot double-credit: verified by UNIQUE constraint + FOR UPDATE in fn_credit_topup.
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm test -- app/api/webhooks/razorpay` — all pass
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
