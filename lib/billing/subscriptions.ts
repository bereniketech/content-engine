import { createClient } from '@/lib/supabase/server';

export interface PlanRow {
  id: string;
  name: string;
  monthly_credits: number;
  monthly_price_inr: number;
  razorpay_plan_id: string;
}

export async function getActiveSubscription(userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('*, plan:subscription_plans!plan_id(*), scheduled_plan:subscription_plans!scheduled_plan_id(*)')
    .eq('user_id', userId)
    .in('status', ['active', 'past_due', 'pending'])
    .maybeSingle();
  return data;
}

export async function getPlan(planId: string): Promise<PlanRow | null> {
  const supabase = createClient();
  const { data } = await supabase.from('subscription_plans').select('*').eq('id', planId).single();
  return data as PlanRow | null;
}

export function calcProration(currentMonthly: number, newMonthly: number, periodEnd: Date): number {
  const now = Date.now();
  const end = periodEnd.getTime();
  const daysRemaining = Math.max(0, Math.ceil((end - now) / 86_400_000));
  const delta = newMonthly - currentMonthly;
  return Math.round((delta * daysRemaining) / 30);
}
