import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;
function getRedis(): Redis {
  if (!_redis) _redis = Redis.fromEnv();
  return _redis;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type TrustEvent =
  | 'disposable_email'
  | 'vpn_detected'
  | 'multi_account_device'
  | 'email_verified'
  | 'payment_success'
  | 'consistent_7day_usage'
  | 'admin_abuse_flag'
  | 'rapid_signup'
  | 'action_frequency_abuse'
  | 'identical_requests';

const DELTAS: Partial<Record<TrustEvent, number>> = {
  disposable_email: -30,
  vpn_detected: -15,
  multi_account_device: -25,
  email_verified: 10,
  payment_success: 30,
  consistent_7day_usage: 5,
  rapid_signup: -20,
  action_frequency_abuse: -10,
  identical_requests: -5,
};

export async function applyTrustEvent(
  userId: string,
  event: TrustEvent
): Promise<{ newScore: number; delta: number }> {
  const supabase = getSupabase();

  if (event === 'admin_abuse_flag') {
    const { data: user } = await supabase
      .from('users')
      .select('trust_score')
      .eq('id', userId)
      .single();
    if (!user) throw new Error('User not found');
    const prev = user.trust_score;
    await supabase.from('users').update({ trust_score: 0 }).eq('id', userId);
    await supabase.from('trust_score_events').insert({
      user_id: userId,
      previous_score: prev,
      new_score: 0,
      delta: -prev,
      reason: event,
    });
    if (prev > 0) {
      await supabase.from('users').update({ account_status: 'restricted' }).eq('id', userId);
    }
    return { newScore: 0, delta: -prev };
  }

  const delta = DELTAS[event];
  if (delta === undefined) throw new Error(`Unknown trust event: ${event}`);

  const { data, error } = await supabase.rpc('fn_apply_trust_delta', {
    p_user_id: userId,
    p_delta: delta,
    p_reason: event,
  });
  if (error) throw error;
  const result = data as { previous_score: number; new_score: number };

  if (result.new_score < 20) {
    await supabase.from('users').update({ account_status: 'restricted' }).eq('id', userId);
  }

  return { newScore: result.new_score, delta };
}

export function resolveTrustTier(
  score: number
): 'full' | 'standard' | 'reduced' | 'suspended' {
  if (score >= 80) return 'full';
  if (score >= 40) return 'standard';
  if (score >= 20) return 'reduced';
  return 'suspended';
}

export function requiresCaptcha(score: number, isSuspiciousAction: boolean): boolean {
  if (score >= 80) return false;
  if (score >= 40 && isSuspiciousAction) return true;
  if (score < 40) return true;
  return false;
}

export async function getEffectiveTrustScore(userId: string): Promise<number> {
  const cached = await getRedis().get(`trust_upgrade:${userId}`);
  if (cached !== null && cached !== undefined) {
    return Number(cached);
  }
  const supabase = getSupabase();
  const { data } = await supabase
    .from('users')
    .select('trust_score')
    .eq('id', userId)
    .single();
  return data?.trust_score ?? 0;
}
