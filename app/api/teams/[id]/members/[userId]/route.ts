import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/sender';

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; userId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: team } = await supabase
    .from('teams')
    .select('id, name, owner_user_id')
    .eq('id', params.id)
    .single();
  if (!team || team.owner_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (params.userId === team.owner_user_id) {
    return NextResponse.json({ error: 'Cannot remove owner. Transfer first.' }, { status: 400 });
  }

  const { error } = await supabase.rpc('fn_remove_team_member', {
    p_team_id: params.id,
    p_user_id: params.userId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: removed } = await supabase.from('users').select('email').eq('id', params.userId).single();
  if (removed?.email) {
    await sendEmail('team_member_removed', removed.email, { team_name: team.name });
  }

  return new Response(null, { status: 204 });
}
