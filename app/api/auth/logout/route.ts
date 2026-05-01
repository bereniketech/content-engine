import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_AUTH_COOKIE, SUPABASE_REFRESH_COOKIE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const token = req.cookies.get(SUPABASE_AUTH_COOKIE)?.value;
  if (token) {
    await supabase.auth.admin.signOut(token);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SUPABASE_AUTH_COOKIE);
  res.cookies.delete(SUPABASE_REFRESH_COOKIE);
  return res;
}
