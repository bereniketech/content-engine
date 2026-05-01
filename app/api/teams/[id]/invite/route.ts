import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateInviteToken, inviteExpiry } from '@/lib/teams/invites';
import { sendEmail } from '@/lib/email/sender';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { email } = await req.json();
  const { id } = await params;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  const { data: team } = await supabase
    .from('teams')
    .select('id, name, owner_user_id')
    .eq('id', id)
    .single();
  if (!team || team.owner_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: existingInvite } = await supabase
    .from('team_invites')
    .select('id')
    .eq('team_id', id)
    .eq('invited_email', email)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (existingInvite) {
    return NextResponse.json({ error: 'Active invite already exists for this email.' }, { status: 409 });
  }

  const { raw, hash } = generateInviteToken();

  const { error } = await supabase.from('team_invites').insert({
    team_id: id,
    invited_email: email,
    token_hash: hash,
    expires_at: inviteExpiry(),
    invited_by: user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const acceptUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/teams/accept?token=${raw}&team=${id}`;
  const { data: inviter } = await supabase.from('users').select('email').eq('id', user.id).single();

  await sendEmail('team_invite', email, {
    inviter: inviter?.email ?? 'A team owner',
    team_name: team.name,
    accept_url: acceptUrl,
  });

  return NextResponse.json({ message: 'Invitation sent' });
}
