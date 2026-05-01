import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, logAdminAction } from '@/lib/admin/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { score, reason } = await req.json();
  const { id } = await params;
  if (typeof score !== 'number' || score < 0 || score > 100) {
    return NextResponse.json({ error: 'Score must be 0–100.' }, { status: 400 });
  }

  const { data: user } = await supabase.from('users').select('trust_score').eq('id', id).single();

  await supabase.rpc('fn_apply_trust_delta', {
    p_user_id: id,
    p_delta: score - (user?.trust_score ?? 50),
    p_reason: `admin_override: ${reason}`,
  });

  await logAdminAction({
    adminId,
    targetUserId: id,
    actionType: 'trust_override',
    reason: reason ?? 'Admin override',
    metadata: { before: user?.trust_score, after: score },
  });

  return NextResponse.json({ trust_score: score });
}
