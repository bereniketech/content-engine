import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyOtp } from '@/lib/auth/otp';
import { Redis } from '@upstash/redis';
import { grantFreeCredits } from '@/lib/credits/freeGrant';

export async function POST(req: NextRequest) {
  const redis = Redis.fromEnv();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { user_id, otp } = await req.json();

  const lockKey = `otp:lock:${user_id}`;
  const locked = await redis.get(lockKey);
  if (locked) return NextResponse.json({ error: 'Too many attempts. Request a new code.' }, { status: 429 });

  const { data: verification } = await supabase
    .from('email_verifications')
    .select('*')
    .eq('user_id', user_id)
    .is('verified_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!verification || new Date(verification.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired OTP.' }, { status: 400 });
  }

  const valid = await verifyOtp(otp, verification.otp_hash);
  const newAttempts = verification.attempts + 1;

  if (!valid) {
    await supabase
      .from('email_verifications')
      .update({ attempts: newAttempts })
      .eq('id', verification.id);

    if (newAttempts >= 5) {
      await redis.set(lockKey, '1', { ex: 600 });
      await supabase.from('email_verifications').update({ expires_at: new Date().toISOString() }).eq('id', verification.id);
    }
    return NextResponse.json({ error: 'Invalid or expired OTP.' }, { status: 400 });
  }

  await supabase.from('email_verifications').update({ verified_at: new Date().toISOString() }).eq('id', verification.id);
  await supabase.from('users').update({ email_verified: true }).eq('id', user_id);

  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const fpHash = req.headers.get('x-fp-hash') ?? '';
  const { credits_granted } = await grantFreeCredits(user_id, ip, fpHash).catch(() => ({ credits_granted: 0 }));

  return NextResponse.json({ email_verified: true, credits_granted });
}
