import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function parseEstimatedVisits(range: string): number {
  const nums = range.match(/[\d,]+/g);
  if (!nums || nums.length < 2) return 0;
  const low = parseInt(nums[0].replace(/,/g, ''), 10);
  const high = parseInt(nums[1].replace(/,/g, ''), 10);
  return Math.round((low + high) / 2);
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const supabase = createClient();

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', userId);

  const sessionIds = sessions?.map((s) => s.id) ?? [];

  if (sessionIds.length === 0) {
    return NextResponse.json({ seoAvg: 0, traffic: 0 });
  }

  const { data: assets } = await supabase
    .from('content_assets')
    .select('asset_type, content')
    .in('session_id', sessionIds)
    .in('asset_type', ['seo', 'traffic']);

  const seoAssets = assets?.filter((a) => a.asset_type === 'seo') ?? [];
  const trafficAssets = assets?.filter((a) => a.asset_type === 'traffic') ?? [];

  const seoAvg =
    seoAssets.length > 0
      ? Math.round(
          seoAssets.reduce((sum, a) => sum + ((a.content as Record<string, number>)?.seoScore ?? 0), 0) /
            seoAssets.length,
        )
      : 0;

  const traffic = trafficAssets.reduce((sum, a) => {
    const range = (a.content as Record<string, string>)?.estimatedRange ?? '';
    return sum + parseEstimatedVisits(range);
  }, 0);

  return NextResponse.json({ seoAvg, traffic });
}
