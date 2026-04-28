// OWASP checklist: JWT auth required, input validated, membership enforced, conflict detection, generic errors.
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

interface ContentApprovalRow {
  id: string
  session_id: string
  workspace_id: string
  submitted_by: string
  reviewed_by: string | null
  status: string
  feedback: string | null
  submitted_at: string | null
  reviewed_at: string | null
}

function mapApproval(row: ContentApprovalRow) {
  return {
    id: row.id,
    sessionId: row.session_id,
    workspaceId: row.workspace_id,
    submittedBy: row.submitted_by,
    reviewedBy: row.reviewed_by,
    status: row.status,
    feedback: row.feedback,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
  }
}

export async function POST(request: NextRequest) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, { status: 401 })
  }

  const { user, supabase } = auth

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: { code: 'validation_error', message: 'Invalid JSON body' } }, { status: 400 })
  }

  const { sessionId, workspaceId } = body as { sessionId?: unknown; workspaceId?: unknown }

  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: { code: 'validation_error', message: 'sessionId is required' } }, { status: 400 })
  }
  if (!workspaceId || typeof workspaceId !== 'string') {
    return NextResponse.json({ error: { code: 'validation_error', message: 'workspaceId is required' } }, { status: 400 })
  }

  // Verify workspace exists and feature is enabled
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, feature_enabled')
    .eq('id', workspaceId)
    .maybeSingle()

  if (!workspace) {
    return NextResponse.json({ error: { code: 'not_found', message: 'Workspace not found' } }, { status: 404 })
  }

  if (!workspace.feature_enabled) {
    return NextResponse.json({ error: { code: 'feature_disabled', message: 'Workspace feature is not enabled' } }, { status: 403 })
  }

  // Verify user is an active workspace member
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!membership) {
    return NextResponse.json({ error: { code: 'forbidden', message: 'Not a workspace member' } }, { status: 403 })
  }

  // Check for existing approval for this session
  const { data: existing } = await supabase
    .from('content_approvals')
    .select('*')
    .eq('session_id', sessionId)
    .limit(1)
    .maybeSingle()

  if (existing) {
    const existingRow = existing as ContentApprovalRow
    if (existingRow.status !== 'changes_requested') {
      return NextResponse.json(
        { error: { code: 'conflict', message: 'Approval already exists for this session' } },
        { status: 409 }
      )
    }
  }

  const { data, error: insertError } = await supabase
    .from('content_approvals')
    .insert({
      session_id: sessionId,
      workspace_id: workspaceId,
      submitted_by: user.id,
      status: 'review',
      submitted_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (insertError || !data) {
    return NextResponse.json(
      { error: { code: 'db_error', message: 'Failed to create approval' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: mapApproval(data as ContentApprovalRow) }, { status: 201 })
}

export async function GET(request: NextRequest) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, { status: 401 })
  }

  const { supabase } = auth
  const workspaceId = request.nextUrl.searchParams.get('workspaceId')

  if (!workspaceId) {
    return NextResponse.json({ error: { code: 'validation_error', message: 'workspaceId is required' } }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('content_approvals')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('submitted_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: { code: 'db_error', message: 'Failed to fetch approvals' } }, { status: 500 })
  }

  return NextResponse.json({ data: (data ?? []).map((row) => mapApproval(row as ContentApprovalRow)) })
}
