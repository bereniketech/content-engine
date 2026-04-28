import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const url = req.nextUrl;
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200);
  const cursor = url.searchParams.get('cursor');

  let query = supabase
    .from('abuse_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  const ip = url.searchParams.get('ip');
  const fingerprint = url.searchParams.get('fingerprint');
  const email = url.searchParams.get('email');
  const eventType = url.searchParams.get('event_type');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  if (ip) query = query.eq('ip_address', ip);
  if (fingerprint) query = query.eq('fingerprint_hash', fingerprint);
  if (email) query = query.eq('email', email);
  if (eventType) query = query.eq('event_type', eventType);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);
  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const hasMore = (data?.length ?? 0) > limit;
  const items = hasMore ? data!.slice(0, limit) : (data ?? []);
  const next_cursor = hasMore ? items[items.length - 1].created_at : null;

  return NextResponse.json({ items, next_cursor });
}
