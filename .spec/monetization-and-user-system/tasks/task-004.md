---
task: 004
feature: monetization-and-user-system
status: pending
model: haiku
supervisor: software-cto
agent: software-developer-expert
depends_on: [1]
---

# Task 004: PPP Tiers Seed + Geo Lookup Edge Function

## Skills
- .kit/skills/data-backend/postgres-patterns/SKILL.md
- .kit/skills/development/code-writing-software-development/SKILL.md
- .kit/skills/development/api-design/SKILL.md
- .kit/skills/core/karpathy-principles/SKILL.md

## Agents
- .kit/agents/software-company/engineering/software-developer-expert.md

## Commands
- .kit/commands/core/task-handoff.md
- .kit/commands/development/verify.md

> Load the skills and agents listed above before reading anything else. Do not load any context not declared here. Follow paths exactly.

---

## Objective
Seed the PPP tier table, subscription plans, and disposable-email blocklist; ship a `lib/pricing/ppp.ts` resolver and a Supabase Edge Function `geo-lookup` that returns ISO country code from request IP with Upstash caching.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `supabase/migrations/20260428000003_seed_ppp_plans_blocklist.sql` | Seed `ppp_tiers`, `subscription_plans`, `email_domain_blocklist` |
| `lib/pricing/ppp.ts` | Tier resolver and currency-aware price calculation |
| `supabase/functions/geo-lookup/index.ts` | Edge Function: IP → country code with Upstash cache |
| `supabase/functions/geo-lookup/deno.json` | Deno import map for Edge Function |
| `lib/pricing/ppp.test.ts` | Unit tests for `priceFor` and `resolveTier` |

### Modify
_(none)_

---

## Dependencies
```bash
# Install (skip if already in package.json):
npm install @upstash/redis

# Env vars (names only — add values to .env):
UPSTASH_REDIS_REST_URL=Upstash Redis REST URL
UPSTASH_REDIS_REST_TOKEN=Upstash Redis REST token
NEXT_PUBLIC_SUPABASE_URL=Supabase URL (client-safe)
SUPABASE_SERVICE_ROLE_KEY=Supabase service role key (server only)
```

---

## API Contracts

```
GET /functions/v1/geo-lookup
Auth: none (Edge Function — relies on CF / request headers)
Request: (no body) — reads CF-IPCountry, X-Forwarded-For
Response 200: { country_code: "IN" }
Response 502: { error: "GEO_LOOKUP_FAILED" }
```

---

## Code Templates

### `supabase/migrations/20260428000003_seed_ppp_plans_blocklist.sql`
```sql
-- =====================================================================
-- PPP tiers + subscription plans + disposable email blocklist seed
-- =====================================================================

INSERT INTO ppp_tiers (tier_name, countries, multiplier, price_usd, price_inr, price_eur) VALUES
('Tier1',
 '["US","GB","CA","AU","NZ","SG","JP","CH","NO","SE","DK","IS"]'::jsonb,
 1.000, 9.00, 749.00, 8.30),
('Tier2',
 '["DE","FR","IT","ES","NL","BE","AT","FI","IE","PT","PL","CZ","HU","RO","SK","GR","CY","LU","EE","LV","LT","MT","SI","BG","HR","RS","UA","TR"]'::jsonb,
 0.800, 7.20, 599.00, 6.60),
('Tier3',
 '["IN","PK","BD","LK","NP","MM","ID","TH","VN","PH","MY","KH","LA","TL","BT"]'::jsonb,
 0.500, 4.50, 379.00, 4.10),
('Tier4',
 '["XX"]'::jsonb,
 0.300, 2.70, 229.00, 2.50);

INSERT INTO subscription_plans (name, monthly_credits, feature_limits, price_tiers, active) VALUES
('Starter', 500,
 '{"image_gen_per_day": 50, "team_seats": 1}'::jsonb,
 '{"USD": 9, "INR": 749, "EUR": 8.30}'::jsonb, true),
('Pro', 2000,
 '{"image_gen_per_day": 200, "team_seats": 1}'::jsonb,
 '{"USD": 29, "INR": 2399, "EUR": 26.50}'::jsonb, true),
('Team', 5000,
 '{"image_gen_per_day": 500, "team_seats": 5}'::jsonb,
 '{"USD": 79, "INR": 6499, "EUR": 72.30}'::jsonb, true);

INSERT INTO email_domain_blocklist (domain, reason) VALUES
('mailinator.com','disposable'), ('guerrillamail.com','disposable'),
('tempmail.com','disposable'), ('throwaway.email','disposable'),
('yopmail.com','disposable'), ('fakeinbox.com','disposable'),
('trashmail.com','disposable'), ('sharklasers.com','disposable'),
('guerrillamailblock.com','disposable'), ('grr.la','disposable'),
('guerrillamail.info','disposable'), ('spam4.me','disposable'),
('maildrop.cc','disposable'), ('dispostable.com','disposable'),
('10minutemail.com','disposable'), ('10minutemail.net','disposable'),
('mohmal.com','disposable'), ('mailnesia.com','disposable'),
('mailnull.com','disposable'), ('spamgourmet.com','disposable'),
('trashmail.me','disposable'), ('discard.email','disposable'),
('mailexpire.com','disposable'), ('incognitomail.com','disposable'),
('filzmail.com','disposable'), ('throwam.com','disposable'),
('owlpic.com','disposable'), ('sogetthis.com','disposable'),
('mt2015.com','disposable'), ('mt2014.com','disposable'),
('spamfree24.org','disposable'), ('spamfree.eu','disposable'),
('nada.email','disposable'), ('spamgob.com','disposable'),
('spamhereplease.com','disposable'), ('mailsac.com','disposable'),
('throwem.com','disposable'), ('tempinbox.com','disposable'),
('0-mail.com','disposable'), ('0815.ru','disposable'),
('jetable.fr.nf','disposable'), ('noref.in','disposable'),
('zzz.com','disposable'), ('discardmail.com','disposable'),
('spamgold.com','disposable'), ('spam.la','disposable'),
('mailzilla.com','disposable'), ('spaml.de','disposable'),
('trashmailer.com','disposable')
ON CONFLICT (domain) DO NOTHING;
```

### `lib/pricing/ppp.ts`
```typescript
import { createClient } from '@/lib/supabase/server';

export type Currency = 'INR' | 'USD' | 'EUR';

export type PppTier = {
  id: number;
  tier_name: string;
  multiplier: number;
  price_usd: number | null;
  price_inr: number | null;
  price_eur: number | null;
  countries: string[];
};

const FX: Record<Currency, number> = { USD: 1, INR: 83, EUR: 0.92 };

export async function resolveTier(countryCode: string): Promise<PppTier> {
  const supabase = createClient();
  const cc = (countryCode || 'XX').toUpperCase();

  const { data, error } = await supabase
    .from('ppp_tiers')
    .select('id, tier_name, multiplier, price_usd, price_inr, price_eur, countries')
    .filter('countries', 'cs', JSON.stringify([cc]))
    .maybeSingle();

  if (error) throw error;
  if (data) return data as PppTier;

  // Fallback: Tier4
  const { data: fallback, error: fbErr } = await supabase
    .from('ppp_tiers')
    .select('id, tier_name, multiplier, price_usd, price_inr, price_eur, countries')
    .eq('tier_name', 'Tier4')
    .single();

  if (fbErr || !fallback) throw new Error('PPP_TIER_FALLBACK_MISSING');
  return fallback as PppTier;
}

export function priceFor(tier: PppTier, currency: Currency, baseUsd: number): number {
  const raw = baseUsd * Number(tier.multiplier) * FX[currency];
  if (currency === 'INR') return Math.round(raw / 10) * 10;
  return Math.round(raw);
}
```

### `supabase/functions/geo-lookup/index.ts`
```typescript
// Supabase Edge Function (Deno runtime)
import { Redis } from 'https://esm.sh/@upstash/redis@1.34.0';

const redis = new Redis({
  url:   Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});

const CC_RE = /^[A-Z]{2}$/;

function getIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? '0.0.0.0';
}

async function lookupViaIpapi(ip: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 1500);
  try {
    const res = await fetch(`https://ipapi.co/${ip}/country/`, { signal: ctrl.signal });
    if (!res.ok) return 'XX';
    const text = (await res.text()).trim().toUpperCase();
    return CC_RE.test(text) ? text : 'XX';
  } catch {
    return 'XX';
  } finally {
    clearTimeout(t);
  }
}

Deno.serve(async (req: Request) => {
  try {
    const cf = req.headers.get('cf-ipcountry');
    if (cf && CC_RE.test(cf.toUpperCase())) {
      return Response.json({ country_code: cf.toUpperCase() });
    }

    const ip = getIp(req);
    const cacheKey = `geo:${ip}`;
    const cached = await redis.get<string>(cacheKey);
    if (cached && CC_RE.test(cached)) {
      return Response.json({ country_code: cached });
    }

    const cc = await lookupViaIpapi(ip);
    await redis.set(cacheKey, cc, { ex: 3600 });
    return Response.json({ country_code: cc });
  } catch (_e) {
    return Response.json({ error: 'GEO_LOOKUP_FAILED' }, { status: 502 });
  }
});
```

### `supabase/functions/geo-lookup/deno.json`
```json
{
  "imports": {
    "@upstash/redis": "https://esm.sh/@upstash/redis@1.34.0"
  }
}
```

---

## Codebase Context

### Key Code Snippets
```typescript
// Supabase server client — lib/supabase/server.ts (created in earlier scaffolding)
// import { createClient } from '@/lib/supabase/server';
```

### Key Patterns in Use
- **Tier4 = catch-all:** countries jsonb contains `"XX"` so `resolveTier` always succeeds even without seeding every ISO code.
- **Edge Function caches at the IP:** `geo:${ip}` with 1h TTL — avoids hitting ipapi.co on every page load.
- **CF-IPCountry first:** if Cloudflare routing is used, prefer the header — zero latency.

### Architecture Decisions Affecting This Task
- ADR: PPP multiplier × FX rate is computed in Postgres-mirrored TS — tier source of truth lives in `ppp_tiers`, but app does the math at request time.
- ADR: INR rounded to nearest 10; USD/EUR rounded to nearest 1.

---

## Handoff from Previous Task
> Populated by /task-handoff after prior task completes.
**Files changed by previous task:** _(filled via /task-handoff after Task 1)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps
1. `supabase/migrations/20260428000003_seed_ppp_plans_blocklist.sql` — write seed SQL
2. `lib/pricing/ppp.ts` — write tier resolver + `priceFor`
3. `supabase/functions/geo-lookup/index.ts` + `deno.json` — write edge function
4. `lib/pricing/ppp.test.ts` — write unit tests
5. Run: `supabase db reset`
6. Run: `supabase functions deploy geo-lookup`
7. Run: `npm test lib/pricing/ppp.test.ts`
8. Run: `/verify`

_Requirements: 10, 14_
_Skills: .kit/skills/data-backend/postgres-patterns/SKILL.md_

---

## Test Cases

### File: `lib/pricing/ppp.test.ts`
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { priceFor, resolveTier, type PppTier } from './ppp';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

const tier1: PppTier = {
  id: 1, tier_name: 'Tier1', multiplier: 1.0,
  price_usd: 9, price_inr: 749, price_eur: 8.3,
  countries: ['US','GB','CA','AU','NZ','SG','JP','CH','NO','SE','DK','IS'],
};
const tier3: PppTier = {
  id: 3, tier_name: 'Tier3', multiplier: 0.5,
  price_usd: 4.5, price_inr: 379, price_eur: 4.1,
  countries: ['IN','PK','BD','LK','NP','MM','ID','TH','VN','PH','MY','KH','LA','TL','BT'],
};
const tier4: PppTier = {
  id: 4, tier_name: 'Tier4', multiplier: 0.3,
  price_usd: 2.7, price_inr: 229, price_eur: 2.5,
  countries: ['XX'],
};

function mockSupabase(matchData: PppTier | null, fallbackData: PppTier = tier4) {
  const filterChain = {
    select: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: matchData, error: null }),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: fallbackData, error: null }),
  };
  (createClient as any).mockReturnValue({ from: vi.fn().mockReturnValue(filterChain) });
  return filterChain;
}

describe('priceFor', () => {
  it('Tier1 USD: $9 base → $9', () => {
    expect(priceFor(tier1, 'USD', 9)).toBe(9);
  });
  it('Tier3 USD: $9 * 0.5 → $5 (rounded)', () => {
    expect(priceFor(tier3, 'USD', 9)).toBe(5);
  });
  it('Tier1 INR: $9 * 83 = 747 → rounds to 750', () => {
    expect(priceFor(tier1, 'INR', 9)).toBe(750);
  });
  it('Tier3 INR: $9 * 0.5 * 83 = 373.5 → rounds to 370', () => {
    expect(priceFor(tier3, 'INR', 9)).toBe(370);
  });
  it('Tier1 EUR: $9 * 0.92 = 8.28 → rounds to 8', () => {
    expect(priceFor(tier1, 'EUR', 9)).toBe(8);
  });
  it('Tier4 USD: $9 * 0.3 = 2.7 → rounds to 3', () => {
    expect(priceFor(tier4, 'USD', 9)).toBe(3);
  });
});

describe('resolveTier', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns matching tier for known country', async () => {
    mockSupabase(tier3);
    const t = await resolveTier('IN');
    expect(t.tier_name).toBe('Tier3');
  });

  it('falls back to Tier4 for unknown country', async () => {
    mockSupabase(null, tier4);
    const t = await resolveTier('ZZ');
    expect(t.tier_name).toBe('Tier4');
  });

  it('uppercases country code', async () => {
    const chain = mockSupabase(tier1);
    await resolveTier('us');
    expect(chain.filter).toHaveBeenCalledWith('countries', 'cs', JSON.stringify(['US']));
  });

  it('treats empty string as XX → Tier4', async () => {
    mockSupabase(null, tier4);
    const t = await resolveTier('');
    expect(t.tier_name).toBe('Tier4');
  });
});
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| `countryCode` is empty / null | Treat as `'XX'` → falls through to Tier4 |
| Country not in any tier's `countries` array | Return Tier4 (fallback `.single()` query) |
| Tier4 row missing | `throw new Error('PPP_TIER_FALLBACK_MISSING')` |
| Edge function: `CF-IPCountry` valid | Return immediately, skip cache + lookup |
| Edge function: ipapi.co timeout (>1500ms) | Return `'XX'` (do not throw) |
| Edge function: any uncaught error | Respond `502 { error: 'GEO_LOOKUP_FAILED' }` |
| Currency = INR | Round to nearest 10 (`Math.round(raw / 10) * 10`) |
| Currency = USD or EUR | Round to nearest 1 (`Math.round(raw)`) |

---

## Acceptance Criteria
- [ ] WHEN seed migration runs THEN `SELECT count(*) FROM ppp_tiers` returns 4
- [ ] WHEN seed migration runs THEN `SELECT count(*) FROM subscription_plans WHERE active` returns 3
- [ ] WHEN seed migration runs THEN `SELECT count(*) FROM email_domain_blocklist` returns >= 49
- [ ] WHEN `resolveTier('IN')` is called THEN tier_name == 'Tier3'
- [ ] WHEN `resolveTier('ZZ')` is called THEN tier_name == 'Tier4'
- [ ] WHEN `priceFor(tier3, 'INR', 9)` runs THEN result == 370
- [ ] WHEN edge function receives `CF-IPCountry: IN` THEN response is `{country_code:'IN'}`
- [ ] All existing tests pass
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** `supabase/migrations/20260428000003_seed_ppp_plans_blocklist.sql`, `lib/pricing/ppp.ts`, `lib/pricing/ppp.test.ts`, `supabase/functions/geo-lookup/index.ts`, `supabase/functions/geo-lookup/deno.json`
**Decisions made:** Tests adapted to Jest (project uses Jest not Vitest); ppp_tiers seeded with 4 tiers (Tier1-4); 49 disposable domains seeded; geo-lookup uses CF-IPCountry header first then Upstash cache then ipapi.co fallback with 1500ms timeout.
**Context for next task:** email_domain_blocklist is now seeded; Task 5 validator reads from it via Supabase client.
**Open questions:** None.

Status: COMPLETE
Completed: 2026-04-28T00:03:00Z
