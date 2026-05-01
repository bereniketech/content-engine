import { NextRequest, NextResponse } from 'next/server';
import { getActiveSubscription } from '@/lib/billing/subscriptions';

const FALLBACK_POST_COUNTS: Record<string, number> = {
  social_x: 10,
  social_linkedin: 3,
  social_instagram: 4,
  social_pinterest: 5,
};

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const sub = await getActiveSubscription(userId);
  const planLimits = (sub?.plan as { limits?: { post_counts?: Record<string, number> } } | null)
    ?.limits?.post_counts;

  return NextResponse.json({ postCounts: planLimits ?? FALLBACK_POST_COUNTS });
}
