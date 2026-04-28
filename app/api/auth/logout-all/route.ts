import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  await supabase.auth.admin.signOut(userId, 'global');

  const res = NextResponse.json({ ok: true });
  res.cookies.delete('__Secure-sb-access');
  res.cookies.delete('__Secure-sb-refresh');
  return res;
}
