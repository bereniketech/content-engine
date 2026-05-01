import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateEmail } from '@/lib/abuse/emailValidate';
import { generateOtp, hashOtp } from '@/lib/auth/otp';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import {
  checkIpSignupLimit,
  detectVpn,
  checkDeviceFingerprint,
  checkIpEscalation,
  checkDeviceEscalation,
} from '@/lib/abuse/ipControl';
import { applyTrustEvent } from '@/lib/abuse/trust';

export async function POST(req: NextRequest) {
  const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'signup:rate',
  });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  if (!success) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

  const { allowed } = await checkIpSignupLimit(ip);
  if (!allowed) {
    await supabase.from('abuse_logs').insert({ event_type: 'signup_blocked', ip_address: ip, metadata: { reason: 'ip_limit' } });
    await checkIpEscalation(ip);
    return NextResponse.json({ error: 'Account creation limit reached from this location.' }, { status: 403 });
  }

  const body = await req.json();
  const { email, password, fingerprint_hash } = body;

  const validation = await validateEmail(email);
  if (!validation.valid) return NextResponse.json({ error: 'Invalid email format.' }, { status: 422 });
  if (validation.disposable) return NextResponse.json({ error: 'Disposable email addresses are not allowed.' }, { status: 422 });

  const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
  if (existing) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });

  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password: password ?? undefined,
    email_confirm: false,
  });
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

  const userId = authUser.user.id;
  const countryCode = req.headers.get('cf-ipcountry') ?? 'XX';

  await supabase.from('users').insert({
    id: userId,
    email,
    country_code: countryCode,
    trust_score: 50,
    signup_ip: ip,
  });

  await supabase.from('credit_wallets').insert({ owner_id: userId, owner_kind: 'user' });
  await supabase.from('user_ip_log').insert({ user_id: userId, ip_address: ip, event_type: 'signup' });

  const { isVpn } = await detectVpn(ip);
  if (isVpn) await applyTrustEvent(userId, 'vpn_detected');

  if (fingerprint_hash) {
    const { blocked } = await checkDeviceFingerprint(fingerprint_hash, userId);
    if (blocked) {
      await supabase.from('users').update({ account_status: 'blocked' }).eq('id', userId);
      await checkDeviceEscalation(fingerprint_hash);
      return NextResponse.json({ error: 'Account limit reached from this device.' }, { status: 403 });
    }
    await checkDeviceEscalation(fingerprint_hash);
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  await supabase.from('email_verifications').insert({
    user_id: userId,
    email,
    otp_hash: otpHash,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY! },
    body: JSON.stringify({ template: 'signup_verify_otp', userId, email, otp }),
  }).catch(() => {});

  return NextResponse.json({ user_id: userId }, { status: 201 });
}
