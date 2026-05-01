import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;
function getRedis(): Redis {
  if (!_redis) _redis = Redis.fromEnv();
  return _redis;
}

export async function checkActionFrequency(userId: string): Promise<{ abusive: boolean }> {
  const key = `freq:${userId}`;
  const count = await getRedis().incr(key);
  if (count === 1) await getRedis().expire(key, 60);
  if (count > 30) {
    await getRedis().set(`cooldown:${userId}`, '1', { ex: 300 });
    return { abusive: true };
  }
  return { abusive: false };
}

export async function isInCooldown(userId: string): Promise<boolean> {
  return !!(await getRedis().get(`cooldown:${userId}`));
}

export async function checkIdenticalRequest(
  userId: string,
  promptHash: string
): Promise<{ flagged: boolean }> {
  const key = `identical:${userId}:${promptHash}`;
  const count = await getRedis().incr(key);
  if (count === 1) await getRedis().expire(key, 1800);
  return { flagged: count > 10 };
}

export async function checkSignupSpeed(
  signupAt: Date,
  firstActionAt: Date
): Promise<{ botSignal: boolean }> {
  const diffMs = firstActionAt.getTime() - signupAt.getTime();
  return { botSignal: diffMs < 5000 };
}
