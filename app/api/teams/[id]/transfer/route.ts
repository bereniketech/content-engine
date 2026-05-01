import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { new_owner_id } = await req.json();
  const { id } = await params;
  if (!new_owner_id) return NextResponse.json({ error: 'new_owner_id required' }, { status: 400 });

  const { data: team } = await supabase
    .from('teams')
    .select('id, owner_user_id')
    .eq('id', id)
    .single();
  if (!team || team.owner_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: target } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', id)
    .eq('user_id', new_owner_id)
    .maybeSingle();
  if (!target) {
    return NextResponse.json({ error: 'New owner must be a team member.' }, { status: 400 });
  }

  const { error } = await supabase.rpc('fn_transfer_team_ownership', {
    p_team_id: id,
    p_old_owner: user.id,
    p_new_owner: new_owner_id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message: 'Ownership transferred' });
}
