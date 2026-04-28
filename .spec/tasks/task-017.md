---
task: 017
feature: stability-roadmap
status: complete
model: haiku
supervisor: software-cto
agent: database-architect
depends_on: []
completed_at: 2026-04-28T17:48:00Z
---

# Task 017: Move PPP FX rates from hardcoded constants to database

## Objective
Create `fx_rates` table and update pricing logic to fetch rates from database, enabling daily updates.

## Files
### Modify
| File | What to change |
|------|---------------|
| `lib/pricing/ppp.ts` | Line 16: Replace hardcoded FX with database lookup |

## Code Templates

**SQL Migration:**
```sql
CREATE TABLE fx_rates (
  id SERIAL PRIMARY KEY,
  currency VARCHAR(3) UNIQUE,
  rate DECIMAL(10, 4) NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO fx_rates (currency, rate) VALUES
  ('INR', 83.0),
  ('EUR', 0.92),
  ('USD', 1.0);
```

**lib/pricing/ppp.ts:**
```typescript
export async function getFxRates(): Promise<Record<Currency, number>> {
  const supabase = createClient();
  const { data } = await supabase.from('fx_rates').select('currency, rate');
  const rates: Record<string, number> = {};
  (data ?? []).forEach(row => { rates[row.currency] = row.rate; });
  return rates as Record<Currency, number>;
}

export async function priceFor(tier: PppTier, currency: Currency, baseUsd: number): Promise<number> {
  const rates = await getFxRates();
  const raw = baseUsd * Number(tier.multiplier) * rates[currency];
  // ... rounding ...
}
```

## Acceptance Criteria
- [x] `fx_rates` table created
- [x] Initial rates inserted
- [x] `getFxRates()` fetches from database
- [x] `priceFor()` uses database rates
- [x] Test: Change rate in DB → pricing reflects immediately (test added: "reflects database rate changes immediately")
- [ ] Cron job added to update rates daily (optional for Phase 2)
- [x] `/verify` passes

## Implementation Summary
**Migration Created:** `supabase/migrations/20260428000010_fx_rates.sql`
- Creates `fx_rates` table with currency UNIQUE constraint
- Seeds initial rates (USD: 1.0, INR: 83.0, EUR: 0.92)
- Adds index on currency column for fast lookups
- Uses TIMESTAMPTZ for updated_at tracking

**Code Changes:**
1. **lib/pricing/ppp.ts**
   - New `getFxRates()` function queries database
   - Fallback to hardcoded defaults if database fails
   - `priceFor()` now async, fetches rates from DB
   
2. **lib/billing/razorpay.ts**
   - Updated `createOrder()` to await `priceFor()`
   
3. **app/pricing/page.tsx**
   - Pre-calculate prices with `Promise.all()`
   
4. **app/api/pricing/route.ts**
   - Parallel rate lookups with `Promise.all()`
   
5. **lib/pricing/ppp.test.ts**
   - Updated all tests to async/await
   - Added `getFxRates()` test with fallback coverage
   - Added test for immediate rate change reflection
   - Enhanced mocking for fx_rates table lookup

**Benefits:**
- Rates now updatable without code deployment
- Quarterly changes can be applied dynamically
- Database provides single source of truth
- Graceful fallback to hardcoded defaults if DB unavailable
