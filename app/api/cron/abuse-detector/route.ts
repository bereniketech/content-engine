import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyAdmin } from '@/lib/alerts/notify';

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const alerts: string[] = [];
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // 1. IP subnet spike: >50 new signups from same /24 in 1 hour
  const { data: recentSignups } = await supabase
    .from('user_ip_log')
    .select('ip_address, user_id')
    .eq('event_type', 'signup')
    .gte('created_at', oneHourAgo);

  const subnetMap: Record<string, Set<string>> = {};
  for (const row of recentSignups ?? []) {
    if (!row.ip_address) continue;
    const parts = (row.ip_address as string).split('.');
    if (parts.length < 4) continue;
    const subnet = parts.slice(0, 3).join('.');
    if (!subnetMap[subnet]) subnetMap[subnet] = new Set();
    subnetMap[subnet].add(row.user_id as string);
  }
  for (const [subnet, users] of Object.entries(subnetMap)) {
    if (users.size > 50) {
      alerts.push(`IP subnet spike: ${subnet}.0/24 — ${users.size} signups in 1h`);
      await notifyAdmin({
        type: 'abuse_spike',
        message: `${users.size} new accounts from subnet ${subnet}.0/24 in 1 hour`,
        severity: 'critical',
        metadata: { subnet, count: users.size },
      });
    }
  }

  // 2. Fingerprint spike: >10 users from same fingerprint in 24h
  const { data: fpRows } = await supabase
    .from('user_devices')
    .select('fingerprint_hash, user_id')
    .gte('created_at', oneDayAgo);

  const fpMap: Record<string, Set<string>> = {};
  for (const row of fpRows ?? []) {
    if (!row.fingerprint_hash) continue;
    if (!fpMap[row.fingerprint_hash as string]) fpMap[row.fingerprint_hash as string] = new Set();
    fpMap[row.fingerprint_hash as string].add(row.user_id as string);
  }
  for (const [fp, users] of Object.entries(fpMap)) {
    if (users.size > 10) {
      alerts.push(`Fingerprint spike: ${fp.slice(0, 8)}… — ${users.size} accounts in 24h`);

      await supabase.from('abuse_logs').insert({
        fingerprint_hash: fp,
        event_type: 'auto_block',
        rule_triggered: 'fingerprint_spike_10plus',
        action_taken: 'blocked',
        metadata: { count: users.size, user_ids: [...users].slice(0, 10) },
      });

      await notifyAdmin({
        type: 'fingerprint_spike',
        message: `${users.size} accounts from fingerprint ${fp.slice(0, 8)}… in 24h. Auto-blocked.`,
        severity: 'critical',
        metadata: { fp: fp.slice(0, 8), count: users.size },
      });
    }
  }

  // 3. Payment failure spike: >20 failed payments in 5 min
  const { count: failedCount } = await supabase
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed')
    .gte('created_at', fiveMinAgo);

  if ((failedCount ?? 0) > 20) {
    alerts.push(`Payment failure spike: ${failedCount} failures in 5 min`);
    await notifyAdmin({
      type: 'payment_failure_spike',
      message: `${failedCount} payment failures in 5 minutes`,
      severity: 'critical',
      metadata: { count: failedCount },
    });
  }

  return NextResponse.json({ ok: true, alerts_fired: alerts.length, alerts });
}
