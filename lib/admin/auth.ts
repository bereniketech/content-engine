import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function requireAdmin(req: NextRequest): Promise<string | null> {
  const userId = req.headers.get('x-user-id');
  if (!userId) return null;

  const { data: user } = await supabase
    .from('users')
    .select('account_type')
    .eq('id', userId)
    .single();

  if (user?.account_type !== 'admin') return null;
  return userId;
}

export async function logAdminAction(opts: {
  adminId: string;
  targetUserId?: string;
  actionType: string;
  reason: string;
  metadata: Record<string, unknown>;
}) {
  await supabase.from('admin_actions').insert({
    admin_id: opts.adminId,
    target_user_id: opts.targetUserId ?? null,
    action_type: opts.actionType,
    reason: opts.reason,
    metadata: opts.metadata,
  });
}
