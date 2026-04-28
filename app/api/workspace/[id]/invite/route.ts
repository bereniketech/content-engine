// OWASP checklist: JWT auth required, admin/owner verified, email validated, member limit enforced.
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { sendWorkspaceInviteEmail } from '@/lib/workspace-email'

const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

export async function POST(
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

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: { code: 'validation_error', message: 'Invalid JSON body' } }, { status: 400 })
  }

  const { email, role } = body as { email?: unknown; role?: unknown }

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: { code: 'validation_error', message: 'Valid email required' } }, { status: 400 })
  }

  const validRoles = ['writer', 'editor', 'admin']
  if (!role || typeof role !== 'string' || !validRoles.includes(role)) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'role must be writer, editor, or admin' } },
      { status: 400 }
    )
  }

  // Verify workspace exists
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name, owner_id, feature_enabled')
    .eq('id', id)
    .maybeSingle()

  if (!workspace) {
    return NextResponse.json({ error: { code: 'not_found', message: 'Workspace not found' } }, { status: 404 })
  }

  if (!workspace.feature_enabled) {
    return NextResponse.json({ error: { code: 'feature_disabled', message: 'Workspace feature is not enabled' } }, { status: 403 })
  }

  // Verify caller is admin or owner
  const isOwner = workspace.owner_id === user.id
  if (!isOwner) {
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: { code: 'forbidden', message: 'Only admins and owners can invite members' } }, { status: 403 })
    }
  }

  // Count existing members (max 25)
  const { count } = await supabase
    .from('workspace_members')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', id)
    .neq('status', 'removed')

  if ((count ?? 0) >= 25) {
    return NextResponse.json(
      { error: { code: 'limit_exceeded', message: 'Maximum 25 members per workspace' } },
      { status: 422 }
    )
  }

  // Check for existing member
  const { data: existingMember } = await supabase
    .from('workspace_members')
    .select('id, status')
    .eq('workspace_id', id)
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (existingMember && existingMember.status !== 'removed') {
    return NextResponse.json(
      { error: { code: 'conflict', message: 'Email is already a workspace member' } },
      { status: 409 }
    )
  }

  const { data: newMember, error: insertError } = await supabase
    .from('workspace_members')
    .insert({
      workspace_id: id,
      email: email.toLowerCase(),
      role,
      status: 'pending',
    })
    .select('id, email, role, status')
    .single()

  if (insertError || !newMember) {
    return NextResponse.json({ error: { code: 'db_error', message: 'Failed to create invitation' } }, { status: 500 })
  }

  // Send notification (best-effort, non-blocking)
  void sendWorkspaceInviteEmail(email, workspace.name as string, user.email ?? 'team').catch(() => {})

  return NextResponse.json(
    {
      data: {
        id: newMember.id,
        email: newMember.email,
        role: newMember.role,
        status: newMember.status,
      },
    },
    { status: 201 }
  )
}
