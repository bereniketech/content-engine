import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rzp } from '@/lib/billing/razorpay';
import { getActiveSubscription } from '@/lib/billing/subscriptions';

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sub = await getActiveSubscription(user.id);
  if (!sub) return NextResponse.json({ error: 'No active subscription.' }, { status: 400 });

  await rzp.subscriptions.cancel(sub.razorpay_subscription_id, true);

  await supabase
    .from('subscriptions')
    .update({ cancel_at_period_end: true })
    .eq('id', sub.id);

  return NextResponse.json({
    message: `Subscription will end on ${sub.current_period_end}`,
    ends_at: sub.current_period_end,
  });
}
