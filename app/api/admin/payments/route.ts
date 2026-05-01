import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin/auth';

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const url = req.nextUrl;
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200);
  const cursor = url.searchParams.get('cursor');
  const status = url.searchParams.get('status');
  const userId = url.searchParams.get('user_id');

  let query = supabase
    .from('payments')
    .select('id, user_id, razorpay_payment_id, amount, currency, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (status) query = query.eq('status', status);
  if (userId) query = query.eq('user_id', userId);
  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const hasMore = (data?.length ?? 0) > limit;
  const items = hasMore ? data!.slice(0, limit) : (data ?? []);
  const next_cursor = hasMore ? items[items.length - 1].created_at : null;

  return NextResponse.json({ items, next_cursor });
}
