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

  const days = parseInt(req.nextUrl.searchParams.get('days') ?? '30');
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', since);

  const { count: paidUsers } = await supabase
    .from('payments')
    .select('user_id', { count: 'exact', head: true })
    .eq('status', 'captured')
    .gte('created_at', since);

  const { data: payments } = await supabase
    .from('payments')
    .select('amount, status')
    .gte('created_at', since);

  const captured = (payments ?? []).filter((p) => p.status === 'captured');
  const failed = (payments ?? []).filter((p) => p.status === 'failed');

  const totalRevenue = captured.reduce((s, p) => s + (p.amount ?? 0), 0) / 100;
  const arpu = paidUsers && paidUsers > 0 ? totalRevenue / paidUsers : 0;
  const failedRate = payments?.length ? failed.length / payments.length : 0;
  const conversionRate = totalUsers && totalUsers > 0 ? (paidUsers ?? 0) / totalUsers : 0;

  return NextResponse.json({
    free_to_paid_rate: conversionRate,
    arpu,
    failed_payment_rate: failedRate,
    total_users: totalUsers,
    paid_users: paidUsers,
  });
}
