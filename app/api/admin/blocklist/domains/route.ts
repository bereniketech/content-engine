import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, logAdminAction } from '@/lib/admin/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { data } = await supabase
    .from('email_domain_blocklist')
    .select('domain, reason, added_at')
    .order('added_at', { ascending: false });

  return NextResponse.json({ domains: data ?? [] });
}

export async function POST(req: NextRequest) {
  const adminId = await requireAdmin(req);
  if (!adminId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { domain, reason } = await req.json();
  if (!domain) return NextResponse.json({ error: 'Domain required.' }, { status: 400 });

  await supabase.from('email_domain_blocklist').upsert({ domain, reason: reason ?? '', added_by: adminId });

  await logAdminAction({ adminId, actionType: 'domain_block', reason: reason ?? 'Admin block', metadata: { domain } });

  return NextResponse.json({ domain }, { status: 201 });
}
