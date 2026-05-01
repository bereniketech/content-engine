import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveWallet } from '@/lib/credits/wallet';

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const url = req.nextUrl;
  const cursor = url.searchParams.get('cursor');
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 50);

  const wallet = await resolveWallet(userId);
  if (!wallet) return NextResponse.json({ items: [], next_cursor: null });

  let query = supabase
    .from('credit_transactions')
    .select('id, action_type, amount, created_at, acting_user_id, request_id')
    .eq('wallet_id', wallet.id)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const hasMore = (data?.length ?? 0) > limit;
  const items = hasMore ? data!.slice(0, limit) : (data ?? []);
  const next_cursor = hasMore ? items[items.length - 1].created_at : null;

  return NextResponse.json({ items, next_cursor });
}
