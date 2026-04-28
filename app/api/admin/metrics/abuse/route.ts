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

  const days = parseInt(req.nextUrl.searchParams.get('days') ?? '7');
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: logs } = await supabase
    .from('abuse_logs')
    .select('ip_address, fingerprint_hash, event_type, created_at')
    .gte('created_at', since);

  const ipCount: Record<string, number> = {};
  const fpCount: Record<string, number> = {};
  for (const log of logs ?? []) {
    if (log.ip_address) ipCount[log.ip_address] = (ipCount[log.ip_address] ?? 0) + 1;
    if (log.fingerprint_hash) fpCount[log.fingerprint_hash] = (fpCount[log.fingerprint_hash] ?? 0) + 1;
  }

  const top_ips = Object.entries(ipCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([ip, count]) => ({ ip, count }));

  const top_fingerprints = Object.entries(fpCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([fp, count]) => ({ fp, count }));

  const { data: users } = await supabase.from('users').select('trust_score');
  const histogram = [
    { range: '0-19', count: 0 },
    { range: '20-39', count: 0 },
    { range: '40-79', count: 0 },
    { range: '80-100', count: 0 },
  ];
  for (const u of users ?? []) {
    const s = u.trust_score ?? 50;
    if (s < 20) histogram[0].count++;
    else if (s < 40) histogram[1].count++;
    else if (s < 80) histogram[2].count++;
    else histogram[3].count++;
  }

  return NextResponse.json({ top_ips, top_fingerprints, trust_histogram: histogram });
}
