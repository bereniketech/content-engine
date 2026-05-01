import { NextRequest, NextResponse } from 'next/server';
import { getActiveSubscription } from '@/lib/billing/subscriptions';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sub = await getActiveSubscription(userId);
  if (!sub) {
    return NextResponse.json({
      status: null,
      plan_name: null,
      monthly_credits: null,
      current_period_end: null,
      cancel_at_period_end: false,
      scheduled_plan_name: null,
    });
  }

  return NextResponse.json({
    status: sub.status,
    plan_name: (sub.plan as { name?: string } | null)?.name ?? null,
    monthly_credits: (sub.plan as { monthly_credits?: number } | null)?.monthly_credits ?? null,
    current_period_end: sub.current_period_end,
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    scheduled_plan_name: (sub.scheduled_plan as { name?: string } | null)?.name ?? null,
  });
}
