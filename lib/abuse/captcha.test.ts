import { verifyCaptcha } from './captcha';

describe('verifyCaptcha', () => {
  it('returns false for empty token', async () => {
    expect(await verifyCaptcha('')).toBe(false);
  });

  it('returns true for success + score >= 0.5 + matching action', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, score: 0.7, action: 'generate' }),
    });
    expect(await verifyCaptcha('tok', 'generate')).toBe(true);
  });

  it('returns false on score < 0.5', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, score: 0.3, action: 'generate' }),
    });
    expect(await verifyCaptcha('tok', 'generate')).toBe(false);
  });

  it('returns false on action mismatch', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, score: 0.9, action: 'login' }),
    });
    expect(await verifyCaptcha('tok', 'generate')).toBe(false);
  });

  it('fail-closes on network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('net'));
    expect(await verifyCaptcha('tok')).toBe(false);
  });

  it('returns false when google returns ok=false', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    expect(await verifyCaptcha('tok')).toBe(false);
  });
});
