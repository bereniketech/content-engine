import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const token = req.cookies.get('__Secure-sb-access')?.value;
  if (token) {
    await supabase.auth.admin.signOut(token);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('__Secure-sb-access');
  res.cookies.delete('__Secure-sb-refresh');
  return res;
}
