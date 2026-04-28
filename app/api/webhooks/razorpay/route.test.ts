import { describe, it, expect, vi, beforeAll } from 'vitest';
import crypto from 'node:crypto';

const SECRET = 'whsec_test_xyz';
beforeAll(() => { process.env.RAZORPAY_WEBHOOK_SECRET = SECRET; });

function signedRequest(body: object) {
  const raw = JSON.stringify(body);
  const sig = crypto.createHmac('sha256', SECRET).update(raw).digest('hex');
  return new Request('http://x/api/webhooks/razorpay', {
    method: 'POST',
    headers: { 'x-razorpay-signature': sig, 'content-type': 'application/json' },
    body: raw,
  });
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    from: (table: string) => ({
      insert: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'we-1' }, error: null }) }) }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: 'w-1' }, error: null }) }) }),
    }),
    rpc: () => Promise.resolve({ data: {}, error: null }),
  }),
}));

vi.mock('@/lib/billing/webhookHandlers', () => ({
  routeWebhookEvent: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from './route';

describe('POST /api/webhooks/razorpay', () => {
  it('returns 400 when signature is missing', async () => {
    const req = new Request('http://x/api/webhooks/razorpay', {
      method: 'POST',
      body: '{}',
    });
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(400);
  });

  it('returns 400 when signature does not match body', async () => {
    const req = new Request('http://x/api/webhooks/razorpay', {
      method: 'POST',
      headers: { 'x-razorpay-signature': 'badsig' },
      body: '{"event":"payment.captured","payload":{}}',
    });
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid signature');
  });

  it('returns 400 on malformed JSON body even with valid signature', async () => {
    const raw = 'not json';
    const sig = crypto.createHmac('sha256', SECRET).update(raw).digest('hex');
    const req = new Request('http://x/api/webhooks/razorpay', {
      method: 'POST',
      headers: { 'x-razorpay-signature': sig },
      body: raw,
    });
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(400);
  });

  it('returns 200 ok on valid payment.captured event', async () => {
    const req = signedRequest({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_1', order_id: 'ord_1', amount: 90000, currency: 'INR', notes: { userId: 'u1', credits: '500' } } } },
    });
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
