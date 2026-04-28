import Razorpay from 'razorpay';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { resolveTier, priceFor } from '@/lib/pricing/ppp';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const TIER_RANK: Record<string, number> = { Tier1: 4, Tier2: 3, Tier3: 2, Tier4: 1 };

function higherTier(a: { tier_name: string }, b: { tier_name: string }) {
  return (TIER_RANK[a.tier_name] ?? 4) >= (TIER_RANK[b.tier_name] ?? 4) ? a : b;
}

export async function createOrder(params: {
  userId: string;
  packId: string;
  countryCode: string;
  detectedCountryCode?: string;
}): Promise<{ orderId: string; amount: number; currency: 'INR' | 'USD' }> {
  const supabase = adminClient();
  const { data: pack } = await supabase
    .from('credit_packs')
    .select('id, base_usd_price, credits_granted')
    .eq('id', params.packId)
    .single();
  if (!pack) throw new Error(`Pack not found: ${params.packId}`);

  const storedTier = await resolveTier(params.countryCode);
  const detectedTier = params.detectedCountryCode
    ? await resolveTier(params.detectedCountryCode)
    : storedTier;
  const effectiveTier = higherTier(storedTier, detectedTier);

  const currency: 'INR' | 'USD' = params.countryCode === 'IN' ? 'INR' : 'USD';
  const localized = priceFor(effectiveTier, currency, pack.base_usd_price);
  const amount = Math.round(localized * 100);

  const order = await rzp.orders.create({
    amount,
    currency,
    receipt: `pack_${params.userId.slice(0, 8)}_${Date.now()}`,
    notes: {
      userId: params.userId,
      packId: params.packId,
      tier: effectiveTier.tier_name,
      credits: String(pack.credits_granted),
    },
  });

  await supabase.from('payments').insert({
    user_id: params.userId,
    razorpay_order_id: order.id,
    amount,
    currency,
    status: 'created',
    metadata: { packId: params.packId, tier: effectiveTier.tier_name },
  });

  return { orderId: order.id as string, amount, currency };
}

export async function createSubscription(params: {
  userId: string;
  planId: string;
  razorpayPlanId: string;
}): Promise<{ subscriptionId: string; hostedUrl: string }> {
  const sub = await rzp.subscriptions.create({
    plan_id: params.razorpayPlanId,
    total_count: 12,
    quantity: 1,
    customer_notify: 1,
    notes: { userId: params.userId, planId: params.planId },
  });
  return { subscriptionId: sub.id, hostedUrl: (sub as Record<string, unknown>).short_url as string ?? '' };
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
