import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, logAdminAction } from '@/lib/admin/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  await supabase.from('users').update({ account_status: 'active' }).eq('id', params.id);

  await logAdminAction({
    adminId,
    targetUserId: params.id,
    actionType: 'unblock',
    reason: 'Admin unblock',
    metadata: {},
  });

  return NextResponse.json({ ok: true });
}
