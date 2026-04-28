import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveSubscription, getPlan } from '@/lib/billing/subscriptions';

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { new_plan_id } = await req.json();
  const sub = await getActiveSubscription(user.id);
  if (!sub) return NextResponse.json({ error: 'No active subscription.' }, { status: 400 });

  const newPlan = await getPlan(new_plan_id);
  if (!newPlan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

  if (newPlan.monthly_credits >= (sub.plan as { monthly_credits: number }).monthly_credits) {
    return NextResponse.json({ error: 'New plan must be lower tier.' }, { status: 400 });
  }

  await supabase
    .from('subscriptions')
    .update({
      scheduled_plan_id: newPlan.id,
      scheduled_change_at: sub.current_period_end,
    })
    .eq('id', sub.id);

  const date = new Date(sub.current_period_end).toISOString().split('T')[0];
  return NextResponse.json({
    message: `Your plan will change on ${date}.`,
    effective_at: sub.current_period_end,
  });
}
