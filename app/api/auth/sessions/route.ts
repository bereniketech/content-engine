import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data } = await supabase
    .from('user_devices')
    .select('id, fingerprint_hash, user_agent, ip, last_seen, created_at')
    .eq('user_id', userId)
    .order('last_seen', { ascending: false });

  return NextResponse.json({ sessions: data ?? [] });
}
