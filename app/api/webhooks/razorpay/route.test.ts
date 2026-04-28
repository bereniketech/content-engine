import crypto from 'node:crypto';

const SECRET = 'whsec_test_xyz';
beforeAll(() => { process.env.RAZORPAY_WEBHOOK_SECRET = SECRET; });

function signedRequest(body: object, extraHeaders?: Record<string, string>) {
  const raw = JSON.stringify(body);
  const sig = crypto.createHmac('sha256', SECRET).update(raw).digest('hex');
  return new Request('http://x/api/webhooks/razorpay', {
    method: 'POST',
    headers: {
      'x-razorpay-signature': sig,
      'content-type': 'application/json',
      ...extraHeaders
    },
    body: raw,
  });
}

const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn(),
};

const mockRoutingFn = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase,
}));

jest.mock('@/lib/billing/webhookHandlers', () => ({
  routeWebhookEvent: mockRoutingFn,
}));

import { POST } from './route';

describe('POST /api/webhooks/razorpay - Signature Validation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

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

  it('logs invalid signature to abuse_logs', async () => {
    const abuseLogInsert = jest.fn().mockResolvedValue({ data: null, error: null });
    mockSupabase.from.mockReturnValue({ insert: abuseLogInsert });

    const req = new Request('http://x/api/webhooks/razorpay', {
      method: 'POST',
      headers: { 'x-razorpay-signature': 'invalid_sig', 'x-forwarded-for': '192.168.1.1' },
      body: '{"event":"test"}',
    });

    await POST(req as unknown as import('next/server').NextRequest);

    expect(abuseLogInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'webhook_signature_mismatch',
        ip_address: '192.168.1.1',
      })
    );
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

  it('extracts IP from x-forwarded-for header correctly', async () => {
    const abuseLogInsert = jest.fn().mockResolvedValue({ data: null, error: null });
    mockSupabase.from.mockReturnValue({ insert: abuseLogInsert });

    const req = new Request('http://x/api/webhooks/razorpay', {
      method: 'POST',
      headers: {
        'x-razorpay-signature': 'badsig',
        'x-forwarded-for': '203.0.113.1, 198.51.100.1'
      },
      body: '{}',
    });

    await POST(req as unknown as import('next/server').NextRequest);

    expect(abuseLogInsert).toHaveBeenCalledWith(
      expect.objectContaining({ ip_address: '203.0.113.1' })
    );
  });
});

describe('POST /api/webhooks/razorpay - Idempotency', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('prevents duplicate processing via idempotency key on first insert', async () => {
    const insertFn = jest.fn().mockResolvedValue({
      data: { id: 'we-1' },
      error: null,
    });
    const selectFn = jest.fn().mockReturnValue({
      maybeSingle: () => Promise.resolve({ data: { id: 'we-1' }, error: null }),
    });
    const updateFn = jest.fn().mockReturnValue({
      eq: () => Promise.resolve({ data: null, error: null }),
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'webhook_events') {
        return {
          insert: insertFn,
          update: updateFn,
        };
      }
      return {};
    });

    mockRoutingFn.mockResolvedValue(undefined);

    const req = signedRequest({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_1',
            order_id: 'ord_1',
            amount: 90000,
            currency: 'INR',
            notes: { userId: 'u1', credits: '500' }
          }
        }
      },
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.replayed).toBeUndefined();

    // Verify idempotency key was extracted from payment entity
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotency_key: 'pay_1',
      })
    );
  });

  it('returns 200 replayed=true on duplicate idempotency key (unique constraint)', async () => {
    const insertFn = jest.fn().mockResolvedValue({
      data: null,
      error: { code: '23505' }, // Unique constraint violation
    });

    mockSupabase.from.mockReturnValue({
      insert: insertFn,
    });

    const req = signedRequest({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_1',
            order_id: 'ord_1',
            amount: 90000,
            currency: 'INR',
            notes: { userId: 'u1', credits: '500' }
          }
        }
      },
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.replayed).toBe(true);
  });

  it('returns 200 replayed=true when insert returns no data', async () => {
    const insertFn = jest.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      insert: insertFn,
    });

    const req = signedRequest({
      event: 'subscription.activated',
      payload: {
        subscription: {
          entity: {
            id: 'sub_1',
            current_start: 1700000000,
            current_end: 1702678000,
            notes: { userId: 'u1', planId: 'plan_1' }
          }
        }
      },
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.replayed).toBe(true);
  });

  it('extracts idempotency key from subscription entity when no payment', async () => {
    const insertFn = jest.fn().mockResolvedValue({
      data: { id: 'we-1' },
      error: null,
    });
    const updateFn = jest.fn().mockReturnValue({
      eq: () => Promise.resolve({ data: null, error: null }),
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'webhook_events') {
        return { insert: insertFn, update: updateFn };
      }
      return {};
    });
    mockRoutingFn.mockResolvedValue(undefined);

    const req = signedRequest({
      event: 'subscription.activated',
      payload: {
        subscription: {
          entity: {
            id: 'sub_1',
            current_start: 1700000000,
            current_end: 1702678000,
            notes: { userId: 'u1', planId: 'plan_1' }
          }
        }
      },
    });

    await POST(req as unknown as import('next/server').NextRequest);

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotency_key: 'sub_1',
      })
    );
  });

  it('extracts idempotency key from refund entity', async () => {
    const insertFn = jest.fn().mockResolvedValue({
      data: { id: 'we-1' },
      error: null,
    });
    const updateFn = jest.fn().mockReturnValue({
      eq: () => Promise.resolve({ data: null, error: null }),
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'webhook_events') {
        return { insert: insertFn, update: updateFn };
      }
      return {};
    });
    mockRoutingFn.mockResolvedValue(undefined);

    const req = signedRequest({
      event: 'payment.refunded',
      payload: {
        refund: {
          entity: {
            id: 'rfnd_1',
            payment_id: 'pay_1',
            amount: 50000,
            notes: { reason: 'customer_request' }
          }
        }
      },
    });

    await POST(req as unknown as import('next/server').NextRequest);

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotency_key: 'rfnd_1',
      })
    );
  });

  it('generates random UUID when no entity id available', async () => {
    const insertFn = jest.fn().mockResolvedValue({
      data: { id: 'we-1' },
      error: null,
    });
    const updateFn = jest.fn().mockReturnValue({
      eq: () => Promise.resolve({ data: null, error: null }),
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'webhook_events') {
        return { insert: insertFn, update: updateFn };
      }
      return {};
    });
    mockRoutingFn.mockResolvedValue(undefined);

    const req = signedRequest({
      event: 'payment.failed',
      payload: { },
    });

    await POST(req as unknown as import('next/server').NextRequest);

    const calls = insertFn.mock.calls;
    const idempotencyKey = calls[0]?.[0]?.idempotency_key;
    // Should be a valid UUID format
    expect(idempotencyKey).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});

describe('POST /api/webhooks/razorpay - Event Routing', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('routes payment.captured event correctly', async () => {
    const insertFn = jest.fn().mockResolvedValue({ data: { id: 'we-1' }, error: null });
    const updateFn = jest.fn().mockReturnValue({ eq: () => Promise.resolve({ data: null, error: null }) });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'webhook_events') return { insert: insertFn, update: updateFn };
      return {};
    });
    mockRoutingFn.mockResolvedValue(undefined);

    const payload = { payment: { entity: { id: 'pay_1', order_id: 'ord_1', amount: 90000, currency: 'INR', notes: { userId: 'u1', credits: '500' } } } };
    const req = signedRequest({ event: 'payment.captured', payload });

    await POST(req as unknown as import('next/server').NextRequest);

    expect(mockRoutingFn).toHaveBeenCalledWith('payment.captured', payload, mockSupabase);
  });

  it('routes payment.failed event correctly', async () => {
    const insertFn = jest.fn().mockResolvedValue({ data: { id: 'we-1' }, error: null });
    const updateFn = jest.fn().mockReturnValue({ eq: () => Promise.resolve({ data: null, error: null }) });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'webhook_events') return { insert: insertFn, update: updateFn };
      return {};
    });
    mockRoutingFn.mockResolvedValue(undefined);

    const payload = { payment: { entity: { id: 'pay_1', error_description: 'Card declined' } } };
    const req = signedRequest({ event: 'payment.failed', payload });

    await POST(req as unknown as import('next/server').NextRequest);

    expect(mockRoutingFn).toHaveBeenCalledWith('payment.failed', payload, mockSupabase);
  });

  it('routes subscription.activated event correctly', async () => {
    const insertFn = jest.fn().mockResolvedValue({ data: { id: 'we-1' }, error: null });
    const updateFn = jest.fn().mockReturnValue({ eq: () => Promise.resolve({ data: null, error: null }) });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'webhook_events') return { insert: insertFn, update: updateFn };
      return {};
    });
    mockRoutingFn.mockResolvedValue(undefined);

    const payload = { subscription: { entity: { id: 'sub_1', current_start: 1700000000, current_end: 1702678000, notes: { userId: 'u1', planId: 'plan_1' } } } };
    const req = signedRequest({ event: 'subscription.activated', payload });

    await POST(req as unknown as import('next/server').NextRequest);

    expect(mockRoutingFn).toHaveBeenCalledWith('subscription.activated', payload, mockSupabase);
  });

  it('routes subscription.charged event correctly', async () => {
    const insertFn = jest.fn().mockResolvedValue({ data: { id: 'we-1' }, error: null });
    const updateFn = jest.fn().mockReturnValue({ eq: () => Promise.resolve({ data: null, error: null }) });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'webhook_events') return { insert: insertFn, update: updateFn };
      return {};
    });
    mockRoutingFn.mockResolvedValue(undefined);

    const payload = { subscription: { entity: { id: 'sub_1', current_start: 1700000000, current_end: 1702678000, notes: { userId: 'u1', planId: 'plan_1' } } }, payment: { entity: { id: 'pay_1' } } };
    const req = signedRequest({ event: 'subscription.charged', payload });

    await POST(req as unknown as import('next/server').NextRequest);

    expect(mockRoutingFn).toHaveBeenCalledWith('subscription.charged', payload, mockSupabase);
  });

  it('routes subscription.cancelled event correctly', async () => {
    const insertFn = jest.fn().mockResolvedValue({ data: { id: 'we-1' }, error: null });
    const updateFn = jest.fn().mockReturnValue({ eq: () => Promise.resolve({ data: null, error: null }) });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'webhook_events') return { insert: insertFn, update: updateFn };
      return {};
    });
    mockRoutingFn.mockResolvedValue(undefined);

    const payload = { subscription: { entity: { id: 'sub_1', notes: { userId: 'u1', planId: 'plan_1' } } } };
    const req = signedRequest({ event: 'subscription.cancelled', payload });

    await POST(req as unknown as import('next/server').NextRequest);

    expect(mockRoutingFn).toHaveBeenCalledWith('subscription.cancelled', payload, mockSupabase);
  });

  it('routes payment.refunded event correctly', async () => {
    const insertFn = jest.fn().mockResolvedValue({ data: { id: 'we-1' }, error: null });
    const updateFn = jest.fn().mockReturnValue({ eq: () => Promise.resolve({ data: null, error: null }) });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'webhook_events') return { insert: insertFn, update: updateFn };
      return {};
    });
    mockRoutingFn.mockResolvedValue(undefined);

    const payload = { refund: { entity: { id: 'rfnd_1', payment_id: 'pay_1', amount: 50000, notes: { reason: 'customer_request' } } }, payment: { entity: { id: 'pay_1', notes: { userId: 'u1', credits: '500' } } } };
    const req = signedRequest({ event: 'payment.refunded', payload });

    await POST(req as unknown as import('next/server').NextRequest);

    expect(mockRoutingFn).toHaveBeenCalledWith('payment.refunded', payload, mockSupabase);
  });
});

describe('POST /api/webhooks/razorpay - Webhook Processing', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates processed_at timestamp on successful routing', async () => {
    const insertFn = jest.fn().mockResolvedValue({ data: { id: 'we-1' }, error: null });
    const updateFn = jest.fn().mockReturnValue({ eq: () => Promise.resolve({ data: null, error: null }) });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'webhook_events') return { insert: insertFn, update: updateFn };
      return {};
    });
    mockRoutingFn.mockResolvedValue(undefined);

    const req = signedRequest({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_1', order_id: 'ord_1', amount: 90000, currency: 'INR', notes: { userId: 'u1', credits: '500' } } } },
    });

    await POST(req as unknown as import('next/server').NextRequest);

    // Verify update was called with processed_at
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        processed_at: expect.any(String),
      })
    );
  });

  it('returns 500 on webhook insertion error (non-duplicate)', async () => {
    const insertFn = jest.fn().mockResolvedValue({
      data: null,
      error: { code: 'SOME_ERROR' },
    });

    mockSupabase.from.mockReturnValue({ insert: insertFn });

    const req = signedRequest({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_1', order_id: 'ord_1', amount: 90000, currency: 'INR', notes: { userId: 'u1', credits: '500' } } } },
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Storage error');
  });

  it('returns 500 on webhook event routing error', async () => {
    const insertFn = jest.fn().mockResolvedValue({ data: { id: 'we-1' }, error: null });
    const updateFn = jest.fn().mockReturnValue({ eq: () => Promise.resolve({ data: null, error: null }) });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'webhook_events') return { insert: insertFn, update: updateFn };
      return {};
    });
    mockRoutingFn.mockRejectedValue(new Error('Processing failed'));

    const req = signedRequest({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_1', order_id: 'ord_1', amount: 90000, currency: 'INR', notes: { userId: 'u1', credits: '500' } } } },
    });

    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Processing error');
  });

  it('stores webhook event with correct payload structure', async () => {
    const insertFn = jest.fn().mockResolvedValue({ data: { id: 'we-1' }, error: null });
    const updateFn = jest.fn().mockReturnValue({ eq: () => Promise.resolve({ data: null, error: null }) });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'webhook_events') return { insert: insertFn, update: updateFn };
      return {};
    });
    mockRoutingFn.mockResolvedValue(undefined);

    const payload = { payment: { entity: { id: 'pay_1', order_id: 'ord_1', amount: 90000, currency: 'INR', notes: { userId: 'u1', credits: '500' } } } };
    const req = signedRequest({ event: 'payment.captured', payload });

    await POST(req as unknown as import('next/server').NextRequest);

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'razorpay',
        event_type: 'payment.captured',
        payload: payload,
      })
    );
  });

  it('stores signature in webhook_events table', async () => {
    const insertFn = jest.fn().mockResolvedValue({ data: { id: 'we-1' }, error: null });
    const updateFn = jest.fn().mockReturnValue({ eq: () => Promise.resolve({ data: null, error: null }) });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'webhook_events') return { insert: insertFn, update: updateFn };
      return {};
    });
    mockRoutingFn.mockResolvedValue(undefined);

    const req = signedRequest({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_1', order_id: 'ord_1', amount: 90000, currency: 'INR', notes: { userId: 'u1', credits: '500' } } } },
    });

    await POST(req as unknown as import('next/server').NextRequest);

    // Verify signature is stored (extracted from request header in actual flow)
    const insertCall = insertFn.mock.calls[0]?.[0];
    expect(insertCall?.signature).toBeDefined();
    expect(typeof insertCall?.signature).toBe('string');
  });
});
