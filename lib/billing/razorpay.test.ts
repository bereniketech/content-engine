import { describe, it, expect, beforeAll } from 'vitest';
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

  it('returns false for wrong secret', () => {
    const body = '{"event":"test"}';
    const sig = crypto.createHmac('sha256', 'wrongsecret').update(body).digest('hex');
    expect(verifyWebhookSignature(body, sig)).toBe(false);
  });
});
