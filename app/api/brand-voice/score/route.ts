import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createMessage } from '@/lib/ai'
import { extractJsonPayload } from '@/lib/extract-json'
import { buildBrandScorePrompt, type BrandVoice } from '@/lib/brand-voice'

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

  const { articleText, brandVoiceId, sessionId } = body as {
    articleText?: unknown
    brandVoiceId?: unknown
    sessionId?: unknown
  }

  if (!articleText || typeof articleText !== 'string' || articleText.trim().length === 0) {
    return NextResponse.json({ error: { code: 'validation_error', message: 'articleText is required' } }, { status: 400 })
  }
  if (!brandVoiceId || typeof brandVoiceId !== 'string') {
    return NextResponse.json({ error: { code: 'validation_error', message: 'brandVoiceId is required' } }, { status: 400 })
  }
  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: { code: 'validation_error', message: 'sessionId is required' } }, { status: 400 })
  }

  // Fetch brand voice (RLS enforces ownership)
  const { data: voiceRow, error: voiceError } = await supabase
    .from('brand_voices')
    .select('*')
    .eq('id', brandVoiceId)
    .single()

  if (voiceError || !voiceRow) {
    return NextResponse.json({ error: { code: 'not_found', message: 'Brand voice not found' } }, { status: 404 })
  }

  const voice: BrandVoice = {
    id: voiceRow.id as string,
    name: voiceRow.name as string,
    toneAdjectives: (voiceRow.tone_adjectives as string[]) ?? [],
    writingSamples: (voiceRow.writing_samples as string[]) ?? [],
    forbiddenPhrases: (voiceRow.forbidden_phrases as string[]) ?? [],
    formalityLevel: voiceRow.formality_level as string,
    isActive: voiceRow.is_active as boolean,
  }

  const prompt = buildBrandScorePrompt(articleText, voice)

  let rawResponse: string
  try {
    rawResponse = await createMessage({
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'ai_error', message: 'AI request failed' } },
      { status: 502 }
    )
  }

  let parsed: { score: number; violations: string[] }
  try {
    const json = extractJsonPayload(rawResponse) as Record<string, unknown>
    if (typeof json.score !== 'number' || !Array.isArray(json.violations)) {
      throw new Error('Invalid shape')
    }
    parsed = { score: json.score, violations: json.violations as string[] }
  } catch {
    return NextResponse.json({ error: { code: 'parse_error', message: 'Failed to parse AI response' } }, { status: 502 })
  }

  // Store result in content_assets
  await supabase.from('content_assets').insert({
    session_id: sessionId,
    user_id: user.id,
    asset_type: 'brand_score',
    content: JSON.stringify({ score: parsed.score, violations: parsed.violations, brandVoiceId }),
  })

  return NextResponse.json({ data: { score: parsed.score, violations: parsed.violations } })
}
