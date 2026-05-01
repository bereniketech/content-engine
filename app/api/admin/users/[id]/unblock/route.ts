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

  const { id } = await params;
  await supabase.from('users').update({ account_status: 'active' }).eq('id', id);

  await logAdminAction({
    adminId,
    targetUserId: id,
    actionType: 'unblock',
    reason: 'Admin unblock',
    metadata: {},
  });

  return NextResponse.json({ ok: true });
}
