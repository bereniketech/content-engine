import { Redis } from '@upstash/redis';
import { createClient } from '@supabase/supabase-js';
import { applyTrustEvent } from '@/lib/abuse/trust';

const redis = Redis.fromEnv();

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function checkIpSignupLimit(
  ip: string
): Promise<{ allowed: boolean; count: number }> {
  const key = `signup:ip:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 86400);
  if (count > 3) {
    const supabase = adminClient();
    const since = new Date(Date.now() - 86400_000).toISOString();
    const { count: dbCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('signup_ip', ip)
      .gte('created_at', since);
    return { allowed: (dbCount ?? 0) < 3, count: dbCount ?? count };
  }
  return { allowed: count <= 3, count };
}

export async function detectVpn(
  ip: string
): Promise<{ isVpn: boolean; cached: boolean }> {
  const cacheKey = `vpn:${ip}`;
  const cached = await redis.get<boolean>(cacheKey);
  if (cached !== null && cached !== undefined) return { isVpn: cached, cached: true };
  try {
    const res = await fetch(
      `https://ipqualityscore.com/api/json/ip/${process.env.IPQS_API_KEY}/${ip}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) {
      return { isVpn: false, cached: false };
    }
    const data = (await res.json()) as { vpn?: boolean; proxy?: boolean };
    const isVpn = !!(data.vpn || data.proxy);
    await redis.set(cacheKey, isVpn, { ex: 3600 });
    return { isVpn, cached: false };
  } catch {
    return { isVpn: false, cached: false };
  }
}

export async function checkDeviceFingerprint(
  fpHash: string,
  newUserId: string
): Promise<{ accountCount: number; blocked: boolean }> {
  const supabase = adminClient();
  const { data: existing } = await supabase
    .from('user_devices')
    .select('user_id')
    .eq('fingerprint_hash', fpHash);
  const uniqueUsers = new Set((existing ?? []).map((d: { user_id: string }) => d.user_id));
  const accountCount = uniqueUsers.size;

  if (accountCount >= 4) {
    return { accountCount, blocked: true };
  }
  if (accountCount >= 2) {
    for (const uid of uniqueUsers) {
      await applyTrustEvent(uid, 'multi_account_device');
    }
    await applyTrustEvent(newUserId, 'multi_account_device');
  }
  await supabase.from('user_devices').insert({
    user_id: newUserId,
    fingerprint_hash: fpHash,
  });
  return { accountCount, blocked: false };
}

export async function checkIpEscalation(ip: string): Promise<void> {
  const supabase = adminClient();
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const { count } = await supabase
    .from('abuse_logs')
    .select('id', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .eq('event_type', 'signup_blocked')
    .gte('created_at', since);
  if ((count ?? 0) >= 3) {
    await fireAdminAlert({ kind: 'ip_escalation', ip, blockedSignups: count });
  }
}

export async function checkDeviceEscalation(fpHash: string): Promise<{ autoBlock: boolean }> {
  const supabase = adminClient();
  const since = new Date(Date.now() - 86400_000).toISOString();
  const { data } = await supabase
    .from('user_devices')
    .select('user_id')
    .eq('fingerprint_hash', fpHash)
    .gte('created_at', since);
  const distinct = new Set((data ?? []).map((d: { user_id: string }) => d.user_id));
  if (distinct.size > 10) {
    for (const uid of distinct) {
      await supabase.from('users').update({ account_status: 'blocked' }).eq('id', uid);
    }
    await fireAdminAlert({ kind: 'device_escalation', fpHash, accountCount: distinct.size });
    return { autoBlock: true };
  }
  return { autoBlock: false };
}

async function fireAdminAlert(payload: Record<string, unknown>): Promise<void> {
  const url = process.env.ADMIN_ALERT_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, timestamp: new Date().toISOString() }),
      signal: AbortSignal.timeout(3000),
    });
  } catch (err) {
    console.error('admin_alert_failed', err);
  }
}
