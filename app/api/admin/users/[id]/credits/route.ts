import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, logAdminAction } from '@/lib/admin/auth';
import crypto from 'crypto';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { delta, reason } = await req.json();
  const { id } = await params;
  if (!reason || reason.length < 10) {
    return NextResponse.json({ error: 'Reason must be at least 10 characters.' }, { status: 400 });
  }
  if (typeof delta !== 'number' || delta === 0) {
    return NextResponse.json({ error: 'Invalid delta.' }, { status: 400 });
  }

  const { data: wallet } = await supabase
    .from('credit_wallets')
    .select('id, balance')
    .eq('owner_id', id)
    .eq('owner_kind', 'user')
    .single();

  if (!wallet) return NextResponse.json({ error: 'User wallet not found.' }, { status: 404 });

  const beforeBalance = wallet.balance;
  const newBalance = Math.max(0, beforeBalance + delta);

  await supabase.from('credit_wallets').update({ balance: newBalance }).eq('id', wallet.id);

  await supabase.from('credit_transactions').insert({
    wallet_id: wallet.id,
    acting_user_id: id,
    action_type: 'admin_adjustment',
    delta,
    balance_after: newBalance,
    request_id: crypto.randomUUID(),
    actor: 'admin',
  });

  await logAdminAction({
    adminId,
    targetUserId: id,
    actionType: 'credit_adjust',
    reason,
    metadata: { before: beforeBalance, after: newBalance, delta },
  });

  return NextResponse.json({ balance: newBalance });
}
