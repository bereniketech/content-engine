import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveTier, priceFor } from '@/lib/pricing/ppp';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let countryCode = 'XX';
  if (user) {
    const { data: u } = await supabase.from('users').select('country_code').eq('id', user.id).single();
    countryCode = u?.country_code ?? 'XX';
  } else {
    const headerCountry = req.headers.get('x-vercel-ip-country');
    if (headerCountry) countryCode = headerCountry;
  }
  const tier = await resolveTier(countryCode);
  const currency: 'INR' | 'USD' = countryCode === 'IN' ? 'INR' : 'USD';

  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('id, name, base_usd_price, monthly_credits')
    .order('base_usd_price');

  const localizedPrices = await Promise.all(
    (plans ?? []).map((p) =>
      priceFor(tier, currency, p.base_usd_price)
    )
  );

  const localized = (plans ?? []).map((p, idx) => ({
    id: p.id,
    name: p.name,
    baseUsd: p.base_usd_price,
    localized: localizedPrices[idx],
    monthlyCredits: p.monthly_credits,
  }));

  return NextResponse.json(
    { tier: tier.tier_name, currency, plans: localized },
    { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' } }
  );
}
