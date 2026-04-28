import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

interface BrandVoice {
  id: string
  name: string
  toneAdjectives: string[]
  writingSamples: string[]
  forbiddenPhrases: string[]
  formalityLevel: 'formal' | 'casual' | 'neutral'
  isActive: boolean
  createdAt: string
}

function mapBrandVoice(row: Record<string, unknown>): BrandVoice {
  return {
    id: row.id as string,
    name: row.name as string,
    toneAdjectives: (row.tone_adjectives as string[]) ?? [],
    writingSamples: (row.writing_samples as string[]) ?? [],
    forbiddenPhrases: (row.forbidden_phrases as string[]) ?? [],
    formalityLevel: (row.formality_level as BrandVoice['formalityLevel']) ?? 'neutral',
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
  }
}

const VALID_FORMALITY = new Set(['formal', 'casual', 'neutral'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PUT(
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
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: { code: 'not_found', message: 'Brand voice not found' } }, { status: 404 })
  }

  const { user, supabase } = auth

  // Verify ownership
  const { data: existing } = await supabase
    .from('brand_voices')
    .select('id')
    .eq('id', id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: { code: 'not_found', message: 'Brand voice not found' } }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: { code: 'validation_error', message: 'Invalid JSON body' } }, { status: 400 })
  }

  // Validate optional fields
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({ error: { code: 'validation_error', message: 'name must be a non-empty string' } }, { status: 400 })
    }
    if (body.name.trim().length > 100) {
      return NextResponse.json({ error: { code: 'validation_error', message: 'name must be 100 characters or fewer' } }, { status: 400 })
    }
  }

  if (body.formalityLevel !== undefined && !VALID_FORMALITY.has(body.formalityLevel as string)) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: "formalityLevel must be 'formal', 'casual', or 'neutral'" } },
      { status: 400 }
    )
  }

  for (const field of ['toneAdjectives', 'writingSamples', 'forbiddenPhrases'] as const) {
    if (body[field] !== undefined) {
      if (!Array.isArray(body[field]) || !(body[field] as unknown[]).every((v) => typeof v === 'string')) {
        return NextResponse.json(
          { error: { code: 'validation_error', message: `${field} must be an array of strings` } },
          { status: 400 }
        )
      }
    }
  }

  // Build update payload
  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = (body.name as string).trim()
  if (body.toneAdjectives !== undefined) update.tone_adjectives = body.toneAdjectives
  if (body.writingSamples !== undefined) update.writing_samples = body.writingSamples
  if (body.forbiddenPhrases !== undefined) update.forbidden_phrases = body.forbiddenPhrases
  if (body.formalityLevel !== undefined) update.formality_level = body.formalityLevel

  // Mutual exclusion: activating this voice deactivates all others
  if (body.isActive === true) {
    await supabase
      .from('brand_voices')
      .update({ is_active: false })
      .eq('user_id', user.id)
    update.is_active = true
  } else if (body.isActive === false) {
    update.is_active = false
  }

  const { data, error: updateError } = await supabase
    .from('brand_voices')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()

  if (updateError || !data) {
    return NextResponse.json({ error: { code: 'db_error', message: 'Failed to update brand voice' } }, { status: 500 })
  }

  return NextResponse.json({ data: mapBrandVoice(data as Record<string, unknown>) })
}

export async function DELETE(
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
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: { code: 'not_found', message: 'Brand voice not found' } }, { status: 404 })
  }

  const { supabase } = auth

  // Verify ownership by attempting delete and checking rows affected
  const { data, error } = await supabase
    .from('brand_voices')
    .delete()
    .eq('id', id)
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: { code: 'not_found', message: 'Brand voice not found' } }, { status: 404 })
  }

  return NextResponse.json({ data: { id, deleted: true } })
}
