import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateOtp, hashOtp } from '@/lib/auth/otp';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { user_id } = await req.json();
  const cooldownKey = `otp:cooldown:${user_id}`;
  const inCooldown = await redis.get(cooldownKey);
  if (inCooldown) return NextResponse.json({ error: 'Please wait before requesting another code.' }, { status: 429 });

  const { data: user } = await supabase.from('users').select('email').eq('id', user_id).single();
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  await supabase.from('email_verifications').insert({
    user_id,
    email: user.email,
    otp_hash: otpHash,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  await redis.set(cooldownKey, '1', { ex: 60 });

  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY! },
    body: JSON.stringify({ template: 'signup_verify_resend', userId: user_id, email: user.email, otp }),
  }).catch(() => {});

  return NextResponse.json({ sent: true });
}
