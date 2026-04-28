import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', params.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { data: wallet } = await supabase
    .from('credit_wallets')
    .select('id')
    .eq('owner_id', params.id)
    .eq('owner_kind', 'team')
    .single();

  if (!wallet) return NextResponse.json({ error: 'Team wallet not found.' }, { status: 404 });

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const periodEnd = now.toISOString();

  const { data: txns } = await supabase
    .from('credit_transactions')
    .select('acting_user_id, delta')
    .eq('wallet_id', wallet.id)
    .lt('delta', 0)
    .gte('created_at', periodStart);

  const usageMap: Record<string, number> = {};
  for (const tx of txns ?? []) {
    usageMap[tx.acting_user_id] = (usageMap[tx.acting_user_id] ?? 0) + Math.abs(tx.delta);
  }

  const { data: members } = await supabase
    .from('team_members')
    .select('user_id, users(email, last_active_at)')
    .eq('team_id', params.id);

  const memberStats = (members ?? []).map((m: Record<string, unknown>) => ({
    user_id: m.user_id,
    email: (m.users as { email?: string } | null)?.email ?? '',
    credits_used: usageMap[m.user_id as string] ?? 0,
    last_active_at: (m.users as { last_active_at?: string } | null)?.last_active_at ?? null,
  }));

  return NextResponse.json({
    period_start: periodStart,
    period_end: periodEnd,
    members: memberStats,
    total_credits_used: Object.values(usageMap).reduce((a, b) => a + b, 0),
  });
}
