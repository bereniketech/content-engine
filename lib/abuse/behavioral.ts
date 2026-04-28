import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function checkActionFrequency(userId: string): Promise<{ abusive: boolean }> {
  const key = `freq:${userId}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);
  if (count > 30) {
    await redis.set(`cooldown:${userId}`, '1', { ex: 300 });
    return { abusive: true };
  }
  return { abusive: false };
}

export async function isInCooldown(userId: string): Promise<boolean> {
  return !!(await redis.get(`cooldown:${userId}`));
}

export async function checkIdenticalRequest(
  userId: string,
  promptHash: string
): Promise<{ flagged: boolean }> {
  const key = `identical:${userId}:${promptHash}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 1800);
  return { flagged: count > 10 };
}

export async function checkSignupSpeed(
  signupAt: Date,
  firstActionAt: Date
): Promise<{ botSignal: boolean }> {
  const diffMs = firstActionAt.getTime() - signupAt.getTime();
  return { botSignal: diffMs < 5000 };
}
