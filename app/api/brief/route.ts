import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createMessage } from '@/lib/ai'
import { extractJsonPayload } from '@/lib/extract-json'
import { generateBriefPrompt, mapBrief, type ResearchAsset } from '@/lib/brief'

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

  const { sessionId } = body as { sessionId?: unknown }
  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: { code: 'validation_error', message: 'sessionId is required' } }, { status: 400 })
  }

  // Fetch research asset
  const { data: researchAsset } = await supabase
    .from('content_assets')
    .select('content')
    .eq('session_id', sessionId)
    .eq('asset_type', 'research')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!researchAsset) {
    return NextResponse.json(
      { error: { code: 'no_research_data', message: 'No research data found for this session' } },
      { status: 422 }
    )
  }

  // Fetch session for topic
  const { data: session } = await supabase
    .from('sessions')
    .select('input_data')
    .eq('id', sessionId)
    .single()

  const inputData = (session?.input_data ?? {}) as Record<string, unknown>
  const topic = (inputData.topic as string | undefined) ?? 'Untitled Topic'

  const researchData = (
    typeof researchAsset.content === 'string'
      ? JSON.parse(researchAsset.content)
      : researchAsset.content
  ) as ResearchAsset

  const prompt = generateBriefPrompt(researchData, topic)

  let rawResponse: string
  try {
    rawResponse = await createMessage({
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'ai_error', message: 'AI request failed' } },
      { status: 502 }
    )
  }

  let parsed: Record<string, unknown>
  try {
    parsed = extractJsonPayload(rawResponse) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: { code: 'parse_error', message: 'Failed to parse AI response' } }, { status: 502 })
  }

  const insertPayload = {
    session_id: sessionId,
    user_id: user.id,
    keyword: (parsed.keyword as string | undefined) ?? '',
    search_intent: (parsed.search_intent as string | undefined) ?? null,
    audience: (parsed.audience as string | undefined) ?? null,
    suggested_h1: (parsed.suggested_h1 as string | undefined) ?? null,
    h2_outline: (parsed.h2_outline as string[] | undefined) ?? [],
    competitor_gaps: (parsed.competitor_gaps as string[] | undefined) ?? [],
    recommended_word_count: (parsed.recommended_word_count as number | undefined) ?? null,
    ctas: (parsed.ctas as string[] | undefined) ?? [],
    status: 'draft' as const,
  }

  const { data, error: upsertError } = await supabase
    .from('briefs')
    .upsert(insertPayload, { onConflict: 'session_id' })
    .select('*')
    .single()

  if (upsertError || !data) {
    return NextResponse.json(
      { error: { code: 'db_error', message: 'Failed to save brief' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: mapBrief(data as Record<string, unknown>) }, { status: 201 })
}

export async function GET(request: NextRequest) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, { status: 401 })
  }

  const { supabase } = auth
  const sessionId = request.nextUrl.searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ error: { code: 'validation_error', message: 'sessionId is required' } }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('briefs')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: { code: 'not_found', message: 'Brief not found' } }, { status: 404 })
  }

  return NextResponse.json({ data: mapBrief(data as Record<string, unknown>) })
}
