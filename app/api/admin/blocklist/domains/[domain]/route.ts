import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, logAdminAction } from '@/lib/admin/auth';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ domain: string }> }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { domain } = await params;

  await supabase.from('email_domain_blocklist').delete().eq('domain', domain);

  await logAdminAction({
    adminId,
    actionType: 'domain_unblock',
    reason: 'Admin removed',
    metadata: { domain },
  });

  return new NextResponse(null, { status: 204 });
}
