import { priceFor, resolveTier, type PppTier } from './ppp';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
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
    select: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: matchData, error: null }),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: fallbackData, error: null }),
  };
  (createClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(filterChain) });
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
  beforeEach(() => jest.clearAllMocks());

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
