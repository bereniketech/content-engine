import { describe, it, expect } from 'vitest';
import { resolveTrustTier, requiresCaptcha } from './trust';

describe('resolveTrustTier', () => {
  it('returns full for score >= 80', () => {
    expect(resolveTrustTier(100)).toBe('full');
    expect(resolveTrustTier(80)).toBe('full');
  });
  it('returns standard for 40-79', () => {
    expect(resolveTrustTier(79)).toBe('standard');
    expect(resolveTrustTier(40)).toBe('standard');
  });
  it('returns reduced for 20-39', () => {
    expect(resolveTrustTier(39)).toBe('reduced');
    expect(resolveTrustTier(20)).toBe('reduced');
  });
  it('returns suspended for < 20', () => {
    expect(resolveTrustTier(19)).toBe('suspended');
    expect(resolveTrustTier(0)).toBe('suspended');
  });
});

describe('requiresCaptcha', () => {
  it('skips CAPTCHA for high trust users', () => {
    expect(requiresCaptcha(90, true)).toBe(false);
    expect(requiresCaptcha(80, false)).toBe(false);
  });
  it('requires CAPTCHA for mid-trust on suspicious actions only', () => {
    expect(requiresCaptcha(60, true)).toBe(true);
    expect(requiresCaptcha(60, false)).toBe(false);
  });
  it('always requires CAPTCHA for low-trust users', () => {
    expect(requiresCaptcha(30, false)).toBe(true);
    expect(requiresCaptcha(10, false)).toBe(true);
  });
});
