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

export async function getFxRates(): Promise<Record<Currency, number>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('fx_rates')
    .select('currency, rate');

  if (error) {
    console.error('Failed to fetch FX rates:', error);
    // Fallback to hardcoded defaults if database fails
    return { USD: 1, INR: 83, EUR: 0.92 };
  }

  const rates: Record<string, number> = {};
  (data ?? []).forEach((row) => {
    rates[row.currency] = Number(row.rate);
  });

  // Ensure all required currencies have a value
  return {
    USD: rates['USD'] ?? 1,
    INR: rates['INR'] ?? 83,
    EUR: rates['EUR'] ?? 0.92,
  };
}

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

export async function priceFor(
  tier: PppTier,
  currency: Currency,
  baseUsd: number
): Promise<number> {
  const rates = await getFxRates();
  const raw = baseUsd * Number(tier.multiplier) * rates[currency];
  if (currency === 'INR') return Math.round(raw / 10) * 10;
  return Math.round(raw);
}
