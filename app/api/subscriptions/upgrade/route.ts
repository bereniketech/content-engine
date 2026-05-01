import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRzp } from '@/lib/billing/razorpay';
import { getActiveSubscription, getPlan, calcProration } from '@/lib/billing/subscriptions';

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { new_plan_id } = await req.json();
  const sub = await getActiveSubscription(user.id);
  if (!sub || sub.status !== 'active') {
    return NextResponse.json({ error: 'No active subscription.' }, { status: 400 });
  }
  const newPlan = await getPlan(new_plan_id);
  if (!newPlan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

  if (newPlan.monthly_credits <= (sub.plan as { monthly_credits: number }).monthly_credits) {
    return NextResponse.json({ error: 'New plan must be higher tier.' }, { status: 400 });
  }

  const delta = calcProration(
    (sub.plan as { monthly_credits: number }).monthly_credits,
    newPlan.monthly_credits,
    new Date(sub.current_period_end)
  );

  const { data: wallet } = await supabase
    .from('credit_wallets')
    .select('id')
    .eq('owner_id', user.id)
    .eq('owner_kind', 'user')
    .single();

  if (delta > 0 && wallet) {
    await supabase.rpc('fn_credit_topup', {
      p_wallet_id: wallet.id,
      p_amount: delta,
      p_payment_id: `upgrade:${sub.id}:${Date.now()}`,
    });
  }

  const rzp = getRzp();
  await rzp.subscriptions.update(sub.razorpay_subscription_id, {
    plan_id: newPlan.razorpay_plan_id,
    schedule_change_at: 'now',
  } as Parameters<typeof rzp.subscriptions.update>[1]);

  await supabase
    .from('subscriptions')
    .update({ plan_id: newPlan.id, updated_at: new Date().toISOString() })
    .eq('id', sub.id);

  return NextResponse.json({ message: 'Plan upgraded', credits_added: delta });
}
