import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const TRUST_UPGRADE_TTL_SECONDS = 60 * 60 * 24 * 30;
const PAID_FLOOR = 80;
const CHARGEBACK_PENALTY = 40;

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function applyPaymentTrustUpgrade(userId: string): Promise<{ previous: number; current: number }> {
  const supabase = adminClient();
  const { data: user } = await supabase
    .from('users')
    .select('trust_score')
    .eq('id', userId)
    .single();

  if (!user) return { previous: 0, current: 0 };

  const previous = user.trust_score ?? 0;
  const current = Math.max(previous, PAID_FLOOR);

  if (current !== previous) {
    await supabase.from('users').update({ trust_score: current }).eq('id', userId);
    await supabase.from('trust_score_events').insert({
      user_id: userId,
      previous_score: previous,
      new_score: current,
      delta: current - previous,
      reason: 'payment_success',
    });
  }

  await redis.set(`trust_upgrade:${userId}`, current, { ex: TRUST_UPGRADE_TTL_SECONDS });

  return { previous, current };
}

export async function applyChargebackPenalty(userId: string): Promise<{ previous: number; current: number }> {
  const supabase = adminClient();
  const { data: user } = await supabase
    .from('users')
    .select('trust_score')
    .eq('id', userId)
    .single();

  if (!user) return { previous: 0, current: 0 };

  const previous = user.trust_score ?? 0;
  const current = Math.max(0, previous - CHARGEBACK_PENALTY);

  await supabase.from('users').update({ trust_score: current }).eq('id', userId);
  await supabase.from('trust_score_events').insert({
    user_id: userId,
    previous_score: previous,
    new_score: current,
    delta: current - previous,
    reason: 'chargeback',
  });

  await redis.del(`trust_upgrade:${userId}`);

  return { previous, current };
}

export async function isTrustUpgraded(userId: string): Promise<boolean> {
  const v = await redis.get(`trust_upgrade:${userId}`);
  return v !== null && v !== undefined;
}
