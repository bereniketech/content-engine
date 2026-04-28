import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: team, error: teamErr } = await supabase
    .from('teams')
    .select('id, name, owner_user_id')
    .eq('id', params.id)
    .single();
  if (teamErr || !team) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: members } = await supabase
    .from('team_members')
    .select('user_id, role, joined_at, users:users!user_id(email)')
    .eq('team_id', params.id);

  const periodStart = new Date();
  periodStart.setDate(1);
  periodStart.setHours(0, 0, 0, 0);

  const { data: walletRow } = await supabase
    .from('credit_wallets')
    .select('id')
    .eq('owner_id', params.id)
    .eq('owner_kind', 'team')
    .single();

  const usageByUser: Record<string, number> = {};
  if (walletRow) {
    const { data: txRows } = await supabase
      .from('credit_transactions')
      .select('acting_user_id, delta')
      .eq('wallet_id', walletRow.id)
      .lt('delta', 0)
      .gte('created_at', periodStart.toISOString());
    for (const r of txRows ?? []) {
      usageByUser[r.acting_user_id] = (usageByUser[r.acting_user_id] ?? 0) + Math.abs(r.delta);
    }
  }

  return NextResponse.json({
    id: team.id,
    name: team.name,
    owner_user_id: team.owner_user_id,
    members: (members ?? []).map((m: Record<string, unknown>) => ({
      user_id: m.user_id,
      email: (m.users as { email?: string } | null)?.email ?? null,
      role: m.role,
      joined_at: m.joined_at,
      credits_used_this_period: usageByUser[m.user_id as string] ?? 0,
    })),
  });
}
