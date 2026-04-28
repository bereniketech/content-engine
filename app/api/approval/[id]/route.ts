// OWASP checklist: JWT auth required, state machine enforced, self-approval blocked, input validated, generic errors.
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

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['review'],
  review: ['approved', 'changes_requested'],
  changes_requested: ['review'],
  approved: ['published'],
  published: [],
}

function validateTransition(current: string, next: string): boolean {
  return VALID_TRANSITIONS[current]?.includes(next) ?? false
}

const REVIEWER_STATUSES = new Set(['approved', 'changes_requested'])

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, { status: 401 })
  }

  const { user, supabase } = auth
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: { code: 'validation_error', message: 'Invalid JSON body' } }, { status: 400 })
  }

  const { status: newStatus, feedback } = body as { status?: unknown; feedback?: unknown }

  const validStatuses = ['approved', 'changes_requested', 'published', 'review']
  if (!newStatus || typeof newStatus !== 'string' || !validStatuses.includes(newStatus)) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: `status must be one of: ${validStatuses.join(', ')}` } },
      { status: 400 }
    )
  }

  if (feedback !== undefined && typeof feedback !== 'string') {
    return NextResponse.json({ error: { code: 'validation_error', message: 'feedback must be a string' } }, { status: 400 })
  }

  // Fetch approval — RLS enforces visibility
  const { data: approval, error: fetchError } = await supabase
    .from('content_approvals')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !approval) {
    return NextResponse.json({ error: { code: 'not_found', message: 'Approval not found' } }, { status: 404 })
  }

  const approvalRow = approval as ContentApprovalRow

  // Validate state transition
  if (!validateTransition(approvalRow.status, newStatus)) {
    return NextResponse.json(
      {
        error: {
          code: 'invalid_transition',
          message: `Cannot transition from '${approvalRow.status}' to '${newStatus}'`,
        },
      },
      { status: 422 }
    )
  }

  // If approving or requesting changes, user must not be the submitter
  if (REVIEWER_STATUSES.has(newStatus) && approvalRow.submitted_by === user.id) {
    return NextResponse.json(
      { error: { code: 'forbidden', message: 'Cannot approve or request changes on your own submission' } },
      { status: 403 }
    )
  }

  const updatePayload: Record<string, string | null> = {
    status: newStatus,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  }

  if (typeof feedback === 'string') {
    updatePayload.feedback = feedback
  }

  const { data: updated, error: updateError } = await supabase
    .from('content_approvals')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single()

  if (updateError || !updated) {
    return NextResponse.json(
      { error: { code: 'db_error', message: 'Failed to update approval' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: mapApproval(updated as ContentApprovalRow) })
}
