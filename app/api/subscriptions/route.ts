import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRzp } from '@/lib/billing/razorpay';
import { getActiveSubscription, getPlan } from '@/lib/billing/subscriptions';

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { plan_id } = await req.json();
  if (!plan_id) return NextResponse.json({ error: 'plan_id required' }, { status: 400 });

  const existing = await getActiveSubscription(user.id);
  if (existing && existing.status === 'active') {
    return NextResponse.json({ error: 'You already have an active subscription.' }, { status: 409 });
  }

  const plan = await getPlan(plan_id);
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

  const rzpSub = await getRzp().subscriptions.create({
    plan_id: plan.razorpay_plan_id,
    total_count: 12,
    customer_notify: 1,
    notes: { user_id: user.id, plan_id: plan.id },
  });

  const { data: row, error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: user.id,
      plan_id: plan.id,
      razorpay_subscription_id: rzpSub.id,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    hosted_url: (rzpSub as unknown as Record<string, unknown>).short_url ?? '',
    subscription_id: row.id,
  });
}
