import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateMagicToken } from '@/lib/auth/magic';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '10 m'),
  prefix: 'magic:email',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const { success } = await ratelimit.limit(email);
  if (!success) return NextResponse.json({ error: 'Too many login attempts. Please try again in 10 minutes.' }, { status: 429 });

  const { data: user } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
  if (!user) return NextResponse.json({ sent: true });

  const { raw, hash } = generateMagicToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await supabase.from('email_verifications').insert({
    user_id: user.id,
    email,
    magic_token_hash: hash,
    expires_at: expiresAt,
  });

  const magicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/magic-link/callback?token=${raw}`;

  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY! },
    body: JSON.stringify({ template: 'magic_link', userId: user.id, email, magicUrl }),
  }).catch(() => {});

  return NextResponse.json({ sent: true });
}
