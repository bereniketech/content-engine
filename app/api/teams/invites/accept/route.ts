import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hashInviteToken } from '@/lib/teams/invites';

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { token, team_id } = await req.json();
  if (!token || !team_id) {
    return NextResponse.json({ error: 'token and team_id required' }, { status: 400 });
  }

  const tokenHash = hashInviteToken(token);
  const { data: invite } = await supabase
    .from('team_invites')
    .select('id, invited_email, expires_at, accepted_at')
    .eq('team_id', team_id)
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (!invite || invite.accepted_at !== null || new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired invite link.' }, { status: 400 });
  }

  const { error } = await supabase.rpc('fn_accept_team_invite', {
    p_invite_id: invite.id,
    p_user_id: user.id,
    p_team_id: team_id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message: 'Joined team' });
}
