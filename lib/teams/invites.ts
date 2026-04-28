import { randomBytes, createHash } from 'crypto';

export function generateInviteToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url');
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

export function hashInviteToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function inviteExpiry(): string {
  return new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
}
