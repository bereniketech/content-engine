import { headers } from 'next/headers';
import { resolveTier, priceFor } from '@/lib/pricing/ppp';

const PLANS = [
  { id: 'starter', name: 'Starter', credits: 200, base_usd: 9, features: ['200 credits/mo', 'Email support'] },
  { id: 'pro', name: 'Pro', credits: 1000, base_usd: 29, features: ['1,000 credits/mo', 'Priority support', 'API access'] },
  { id: 'team', name: 'Team', credits: 5000, base_usd: 79, features: ['5,000 shared credits/mo', 'Team management', 'SSO'] },
];

const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', INR: '₹', EUR: '€' };

export default async function PricingPage() {
  const country = headers().get('cf-ipcountry') ?? 'XX';
  const tier = await resolveTier(country);
  const currency = country === 'IN' ? 'INR' : country === 'DE' || country === 'FR' ? 'EUR' : 'USD';

  // Pre-calculate all prices since priceFor is now async
  const prices = await Promise.all(
    PLANS.map((plan) =>
      priceFor(tier, currency as 'USD' | 'INR' | 'EUR', plan.base_usd)
    )
  );

  return (
    <div className="mx-auto max-w-4xl py-16 px-4">
      <h1 className="mb-2 text-center text-3xl font-bold text-white">Simple, honest pricing</h1>
      <p className="mb-10 text-center text-gray-400">Prices shown in your local currency.</p>

      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan, idx) => {
          const amount = prices[idx];
          const symbol = CURRENCY_SYMBOL[currency] ?? '$';
          return (
            <div key={plan.id} className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h2 className="text-lg font-semibold text-white">{plan.name}</h2>
              <p className="mt-2 text-3xl font-bold text-white">
                {symbol}{amount}
                <span className="text-sm font-normal text-gray-400">/mo</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-400">
                {plan.features.map((f) => <li key={f}>✓ {f}</li>)}
              </ul>
              <a
                href="/login?redirect=/billing"
                className="mt-6 block rounded bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-500"
              >
                Get started
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
