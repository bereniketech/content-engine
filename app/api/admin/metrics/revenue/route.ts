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

  const months = parseInt(req.nextUrl.searchParams.get('months') ?? '6');
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const { data: mrrData } = await supabase
    .from('payments')
    .select('amount')
    .eq('status', 'captured')
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

  const mrr = (mrrData ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0) / 100;

  const { data: byCountry } = await supabase
    .from('payments')
    .select('amount, users(country_code)')
    .eq('status', 'captured')
    .gte('created_at', since.toISOString());

  const countryMap: Record<string, number> = {};
  for (const p of byCountry ?? []) {
    const cc = (p.users as { country_code?: string } | null)?.country_code ?? 'XX';
    countryMap[cc] = (countryMap[cc] ?? 0) + (p.amount ?? 0) / 100;
  }

  return NextResponse.json({
    mrr,
    by_country: Object.entries(countryMap).map(([country_code, amount]) => ({ country_code, amount })),
    new_vs_returning: { new: 0, returning: 0 },
  });
}
