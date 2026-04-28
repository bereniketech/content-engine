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

export async function GET(request: NextRequest) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, { status: 401 })
  }

  const { supabase } = auth
  const { data, error } = await supabase
    .from('brand_voices')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: { code: 'db_error', message: 'Failed to fetch brand voices' } }, { status: 500 })
  }

  return NextResponse.json({ data: (data ?? []).map(mapBrandVoice) })
}

export async function POST(request: NextRequest) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, { status: 401 })
  }

  const { user, supabase } = auth

  // Count existing voices
  const { count, error: countError } = await supabase
    .from('brand_voices')
    .select('id', { count: 'exact', head: true })

  if (countError) {
    return NextResponse.json({ error: { code: 'db_error', message: 'Failed to check brand voice count' } }, { status: 500 })
  }

  if ((count ?? 0) >= 5) {
    return NextResponse.json(
      { error: { code: 'limit_exceeded', message: 'Maximum 5 brand voice profiles allowed' } },
      { status: 409 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: { code: 'validation_error', message: 'Invalid JSON body' } }, { status: 400 })
  }

  // Validate name
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return NextResponse.json({ error: { code: 'validation_error', message: 'name is required' } }, { status: 400 })
  }
  if (body.name.trim().length > 100) {
    return NextResponse.json({ error: { code: 'validation_error', message: 'name must be 100 characters or fewer' } }, { status: 400 })
  }

  // Validate formalityLevel
  if (body.formalityLevel !== undefined && !VALID_FORMALITY.has(body.formalityLevel as string)) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: "formalityLevel must be 'formal', 'casual', or 'neutral'" } },
      { status: 400 }
    )
  }

  // Validate arrays
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

  const { data, error: insertError } = await supabase
    .from('brand_voices')
    .insert({
      user_id: user.id,
      name: (body.name as string).trim(),
      tone_adjectives: (body.toneAdjectives as string[] | undefined) ?? [],
      writing_samples: (body.writingSamples as string[] | undefined) ?? [],
      forbidden_phrases: (body.forbiddenPhrases as string[] | undefined) ?? [],
      formality_level: (body.formalityLevel as string | undefined) ?? 'neutral',
    })
    .select('*')
    .single()

  if (insertError || !data) {
    return NextResponse.json({ error: { code: 'db_error', message: 'Failed to create brand voice' } }, { status: 500 })
  }

  return NextResponse.json({ data: mapBrandVoice(data as Record<string, unknown>) }, { status: 201 })
}
