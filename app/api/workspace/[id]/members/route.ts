// OWASP checklist: JWT auth required, membership verified, generic errors.
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, { status: 401 })
  }

  const { id } = await params
  const { user, supabase } = auth

  // Verify workspace exists
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, owner_id')
    .eq('id', id)
    .maybeSingle()

  if (!workspace) {
    return NextResponse.json({ error: { code: 'not_found', message: 'Workspace not found' } }, { status: 404 })
  }

  // Verify user is owner or active member
  const isOwner = workspace.owner_id === user.id
  if (!isOwner) {
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: { code: 'forbidden', message: 'Access denied' } }, { status: 403 })
    }
  }

  const { data: members, error } = await supabase
    .from('workspace_members')
    .select('id, email, role, status, joined_at')
    .eq('workspace_id', id)
    .order('joined_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: { code: 'db_error', message: 'Failed to fetch members' } }, { status: 500 })
  }

  return NextResponse.json({
    data: (members ?? []).map((m) => ({
      id: m.id,
      email: m.email,
      role: m.role,
      status: m.status,
      joinedAt: m.joined_at,
    })),
  })
}
