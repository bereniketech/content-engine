import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { mapBrief } from '@/lib/brief'

const VALID_STATUS = new Set(['draft', 'approved'])

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

  const { id } = await params
  const { supabase } = auth

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: { code: 'validation_error', message: 'Invalid JSON body' } }, { status: 400 })
  }

  if (body.status !== undefined && !VALID_STATUS.has(body.status as string)) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: "status must be 'draft' or 'approved'" } },
      { status: 400 }
    )
  }

  const update: Record<string, unknown> = {}
  if (body.keyword !== undefined) update.keyword = body.keyword
  if (body.searchIntent !== undefined) update.search_intent = body.searchIntent
  if (body.audience !== undefined) update.audience = body.audience
  if (body.suggestedH1 !== undefined) update.suggested_h1 = body.suggestedH1
  if (body.h2Outline !== undefined) update.h2_outline = body.h2Outline
  if (body.competitorGaps !== undefined) update.competitor_gaps = body.competitorGaps
  if (body.recommendedWordCount !== undefined) update.recommended_word_count = body.recommendedWordCount
  if (body.ctas !== undefined) update.ctas = body.ctas
  if (body.status !== undefined) update.status = body.status

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: { code: 'validation_error', message: 'No fields to update' } }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('briefs')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: { code: 'not_found', message: 'Brief not found' } }, { status: 404 })
  }

  return NextResponse.json({ data: mapBrief(data as Record<string, unknown>) })
}
