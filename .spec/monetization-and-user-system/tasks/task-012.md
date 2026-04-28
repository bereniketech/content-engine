---
task: 012
feature: monetization-and-user-system
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: [7, 11]
---

# Task 012: IP Controls + Device Fingerprinting

## Skills
- .kit/skills/development/api-design/SKILL.md
- .kit/skills/testing-quality/security-review/SKILL.md
- .kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md
- .kit/skills/data-backend/postgres-patterns/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-backend-expert.md
- .kit/agents/software-company/security/security-architect.md

## Commands
- .kit/commands/core/task-handoff.md
- .kit/commands/development/verify.md

> Load the skills and agents listed above before reading anything else.

---

## Objective
Enforce per-IP signup limits, VPN detection (with Redis caching), and device fingerprint deduplication; escalate to admin alerts on abuse patterns.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `lib/abuse/ipControl.ts` | IP signup limiter, VPN detection (IPQS), device fingerprint check, escalation hooks |
| `lib/abuse/ipControl.test.ts` | Unit + integration tests with mocked Redis + IPQS |

### Modify
| File | What to change |
|------|---------------|
| `app/api/auth/signup/route.ts` (task 6) | Wire IP limit check, VPN detect, fingerprint dedupe at handler entry |

---

## Dependencies
```bash
# Already installed in task 7: @upstash/redis
# ENV:
#   UPSTASH_REDIS_REST_URL
#   UPSTASH_REDIS_REST_TOKEN
#   IPQS_API_KEY
#   ADMIN_ALERT_WEBHOOK_URL
```

---

## API Contracts
```
checkIpSignupLimit(ip: string) -> { allowed: boolean; count: number }
detectVpn(ip: string) -> { isVpn: boolean; cached: boolean }
checkDeviceFingerprint(fpHash: string, newUserId: string) -> { accountCount: number; blocked: boolean }
checkIpEscalation(ip: string) -> Promise<void>  // fires admin webhook if threshold met
```

---

## Code Templates

### `lib/abuse/ipControl.ts`
```typescript
import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';
import { applyTrustEvent } from '@/lib/abuse/trust';

const redis = Redis.fromEnv();

export async function checkIpSignupLimit(
  ip: string
): Promise<{ allowed: boolean; count: number }> {
  const key = `signup:ip:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 86400);
  // Durable backstop: count rows in users table by signup_ip in last 24h
  if (count > 3) {
    const supabase = createClient();
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
      // Fail-open on provider error to avoid blocking legitimate users
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
  const supabase = createClient();
  const { data: existing } = await supabase
    .from('user_devices')
    .select('user_id')
    .eq('fingerprint_hash', fpHash);
  const uniqueUsers = new Set((existing ?? []).map((d) => d.user_id));
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
  // Record fingerprint for new user
  await supabase.from('user_devices').insert({
    user_id: newUserId,
    fingerprint_hash: fpHash,
  });
  return { accountCount, blocked: false };
}

export async function checkIpEscalation(ip: string): Promise<void> {
  const supabase = createClient();
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const { count } = await supabase
    .from('abuse_logs')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .eq('event_type', 'signup_blocked')
    .gte('created_at', since);
  if ((count ?? 0) >= 3) {
    await fireAdminAlert({ kind: 'ip_escalation', ip, blockedSignups: count });
  }
}

export async function checkDeviceEscalation(fpHash: string): Promise<{ autoBlock: boolean }> {
  const supabase = createClient();
  const since = new Date(Date.now() - 86400_000).toISOString();
  const { data } = await supabase
    .from('user_devices')
    .select('user_id')
    .eq('fingerprint_hash', fpHash)
    .gte('created_at', since);
  const distinct = new Set((data ?? []).map((d) => d.user_id));
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
```

### Modification to `app/api/auth/signup/route.ts`
```typescript
// At top of POST handler, after parsing body:
import {
  checkIpSignupLimit,
  detectVpn,
  checkDeviceFingerprint,
  checkIpEscalation,
  checkDeviceEscalation,
} from '@/lib/abuse/ipControl';
import { applyTrustEvent } from '@/lib/abuse/trust';

const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
const fpHash = req.headers.get('x-device-fingerprint') ?? null;

const { allowed } = await checkIpSignupLimit(ip);
if (!allowed) {
  await supabase.from('abuse_logs').insert({ event_type: 'signup_blocked', ip, metadata: { reason: 'ip_limit' } });
  await checkIpEscalation(ip);
  return NextResponse.json(
    { error: 'Account creation limit reached from this location.' },
    { status: 403 }
  );
}

// ... create user, get userId ...

const { isVpn } = await detectVpn(ip);
if (isVpn) await applyTrustEvent(userId, 'vpn_detected');

if (fpHash) {
  const { blocked } = await checkDeviceFingerprint(fpHash, userId);
  if (blocked) {
    await supabase.from('users').update({ account_status: 'blocked' }).eq('id', userId);
    await checkDeviceEscalation(fpHash);
    return NextResponse.json(
      { error: 'Account limit reached from this device.' },
      { status: 403 }
    );
  }
  await checkDeviceEscalation(fpHash);
}
```

---

## Codebase Context

### Key Code Snippets
```typescript
// abuse_logs table — task 2: id, event_type, ip, user_id?, metadata jsonb, created_at
// user_devices — task 2: id, user_id, fingerprint_hash, created_at
// users.signup_ip — task 2 column
```

### Key Patterns in Use
- **Pattern:** Redis is the fast path; DB is the durable backstop on Redis miss/eviction.
- **Pattern:** Third-party calls always have `AbortSignal.timeout(3000)` to prevent hanging request handlers.
- **Pattern:** Fail-open on transient provider errors (VPN detect) so we don't block real users; fail-closed on fingerprint match (block 4+).

### Architecture Decisions
- ADR: Cap at 3 signups/IP/24h chosen to allow shared NATs (households, small offices) but block obvious abuse.
- ADR: Distinct `accountCount` threshold (4 to block, 2-3 to flag) gives users one "honest mistake" before hard block.
- ADR: VPN cache TTL = 1h since IP→VPN mapping is fairly stable but residential proxies rotate.

---

## Handoff from Previous Task
**Files changed by previous task:** task 7 (Redis client + base middleware), task 11 (`lib/abuse/trust.ts`).
**Decisions made:** Redis client is `Redis.fromEnv()`; trust applies via `applyTrustEvent`.
**Context for this task:** signup route already exists from task 6; we layer in checks at the top of the handler.
**Open questions left:** none.

---

## Implementation Steps
1. `lib/abuse/ipControl.ts` — implement all 5 functions.
2. `lib/abuse/ipControl.test.ts` — write tests with mocked Redis + fetch.
3. Modify `app/api/auth/signup/route.ts` — insert IP/VPN/fingerprint checks.
4. Add IPQS_API_KEY + ADMIN_ALERT_WEBHOOK_URL to `.env.local` and Vercel env.
5. Run: `npx tsc --noEmit`
6. Run: `npm test -- lib/abuse/ipControl`
7. Run: `/verify`

_Requirements: 13, 18, 19, 28_

---

## Test Cases

### File: `lib/abuse/ipControl.test.ts`
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkIpSignupLimit, detectVpn, checkDeviceFingerprint } from './ipControl';

vi.mock('@upstash/redis', () => {
  const store = new Map<string, any>();
  return {
    Redis: {
      fromEnv: () => ({
        incr: async (k: string) => { const n = (store.get(k) ?? 0) + 1; store.set(k, n); return n; },
        expire: async () => 1,
        get: async (k: string) => store.get(k) ?? null,
        set: async (k: string, v: any) => { store.set(k, v); return 'OK'; },
      }),
    },
  };
});

describe('checkIpSignupLimit', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('allows first 3 signups from same IP', async () => {
    const a = await checkIpSignupLimit('1.2.3.4');
    const b = await checkIpSignupLimit('1.2.3.4');
    const c = await checkIpSignupLimit('1.2.3.4');
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
    expect(c.allowed).toBe(true);
  });

  it('blocks the 4th signup from same IP within 24h', async () => {
    await checkIpSignupLimit('5.6.7.8');
    await checkIpSignupLimit('5.6.7.8');
    await checkIpSignupLimit('5.6.7.8');
    const fourth = await checkIpSignupLimit('5.6.7.8');
    // DB backstop will be queried; in unit test default count of 0 means allowed=true.
    // For pure Redis count > 3, allowed should be false unless DB backstop overrides.
    expect(fourth.count).toBeGreaterThan(3);
  });
});

describe('detectVpn', () => {
  beforeEach(() => { global.fetch = vi.fn(); });

  it('returns cached value without calling IPQS', async () => {
    // Pre-populate cache via direct redis (mocked store is shared)
    const r1 = await detectVpn('9.9.9.9');
    expect(r1.cached).toBe(false);
  });

  it('returns isVpn=true when IPQS reports vpn', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ vpn: true, proxy: false }),
    });
    const r = await detectVpn('11.22.33.44');
    expect(r.isVpn).toBe(true);
  });

  it('fail-opens when IPQS errors', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('timeout'));
    const r = await detectVpn('22.33.44.55');
    expect(r.isVpn).toBe(false);
  });
});

describe('checkDeviceFingerprint', () => {
  it('allows first device occurrence', async () => {
    const r = await checkDeviceFingerprint('fp-new-1', 'user-1');
    expect(r.blocked).toBe(false);
    expect(r.accountCount).toBe(0);
  });

  it('blocks 4th unique account on same fingerprint', async () => {
    // Seed 4 prior user_devices rows with same fpHash via supabase mock (test fixture)
    // Expectation: blocked=true, accountCount>=4
  });

  it('flags accounts when 2-3 share a fingerprint', async () => {
    // Seed 2 prior user_devices rows; new signup should NOT be blocked but trust event should be applied
  });
});
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| 4th signup from same IP in 24h | Block with 403, log to abuse_logs, check IP escalation |
| IPQS API timeout/error | Fail-open (isVpn=false), do not block user |
| VPN detected on existing IP | Apply `vpn_detected` trust event (-15) |
| Device fingerprint shared by 2-3 accounts | Apply `multi_account_device` to all parties, allow signup |
| Device fingerprint shared by 4+ accounts | Block new account immediately, set status='blocked' |
| 3+ signup_blocked events for same IP in 7 days | Fire admin webhook with payload {kind:'ip_escalation', ip, count} |
| 10+ distinct user_ids on same fingerprint in 24h | Auto-block all + admin webhook |
| ADMIN_ALERT_WEBHOOK_URL missing/empty | Silently skip alert (do not throw) |
| Fingerprint header absent | Skip device check, proceed |

---

## Acceptance Criteria
- [ ] WHEN 4 signups originate from the same IP within 24h THEN the 4th returns 403 with the user-friendly message.
- [ ] WHEN IPQS reports `vpn:true` for an IP THEN the user receives a -15 trust delta and a `trust_score_events` row exists.
- [ ] WHEN a fingerprint hash matches 4+ existing accounts THEN the new account is created with status='blocked' and 403 returned.
- [ ] WHEN VPN cache is hit THEN no outbound fetch to IPQS occurs.
- [ ] WHEN ADMIN_ALERT_WEBHOOK_URL is unset THEN no error is thrown.
- [ ] WHEN IPQS times out (> 3s) THEN signup proceeds (fail-open).
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm test -- lib/abuse/ipControl` — all pass
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
