import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hashToken } from '@/lib/auth/magic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.redirect(new URL('/login?error=invalid', req.url));

  const hash = hashToken(token);

  const { data: verification } = await supabase
    .from('email_verifications')
    .select('*')
    .eq('magic_token_hash', hash)
    .is('verified_at', null)
    .single();

  if (!verification || new Date(verification.expires_at) < new Date()) {
    return NextResponse.redirect(new URL('/login?error=expired', req.url));
  }

  await supabase.from('email_verifications').update({ verified_at: new Date().toISOString() }).eq('id', verification.id);
  await supabase.from('users').update({ email_verified: true, last_active_at: new Date().toISOString() }).eq('id', verification.user_id);

  const { data: userRow } = await supabase.from('users').select('email').eq('id', verification.user_id).single();
  const { data: sessionData } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: userRow!.email,
  });

  if (sessionData?.properties?.action_link) {
    return NextResponse.redirect(sessionData.properties.action_link);
  }

  return NextResponse.redirect(new URL('/dashboard', req.url));
}
