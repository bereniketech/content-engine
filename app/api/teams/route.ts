import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id, role, teams(id, name, owner_user_id)')
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) return NextResponse.json({ team: null });

  const teamRow = membership.teams as unknown as { id: string; name: string; owner_user_id: string } | null;
  if (!teamRow) return NextResponse.json({ team: null });

  const { data: members } = await supabase
    .from('team_members')
    .select('user_id, role, users(email)')
    .eq('team_id', teamRow.id);

  return NextResponse.json({
    team: {
      id: teamRow.id,
      name: teamRow.name,
      owner_id: teamRow.owner_user_id,
      members: (members ?? []).map((m) => ({
        user_id: m.user_id,
        email: (m.users as unknown as { email: string } | null)?.email ?? '',
        role: m.role,
        credits_used: 0,
      })),
    },
  });
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { name } = await req.json();
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_user_id', userId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'You already own a team.' }, { status: 409 });
  }

  const { data, error } = await supabase.rpc('fn_create_team', {
    p_owner_id: userId,
    p_name: name,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ team_id: (data as { team_id: string }).team_id, team_name: name });
}
