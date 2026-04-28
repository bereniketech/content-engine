import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createMessage } from '@/lib/ai'
import { extractJsonPayload } from '@/lib/extract-json'
import { buildClusterPrompt, normalizeClusterArticles, mapCluster } from '@/lib/cluster'

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

  const { pillarKeyword, name } = body as { pillarKeyword?: unknown; name?: unknown }
  if (!pillarKeyword || typeof pillarKeyword !== 'string' || pillarKeyword.trim().length === 0) {
    return NextResponse.json({ error: { code: 'validation_error', message: 'pillarKeyword is required' } }, { status: 400 })
  }

  // Max 20 clusters per user
  const { count } = await supabase
    .from('content_clusters')
    .select('id', { count: 'exact', head: true })

  if ((count ?? 0) >= 20) {
    return NextResponse.json(
      { error: { code: 'limit_exceeded', message: 'Maximum 20 content clusters allowed' } },
      { status: 409 }
    )
  }

  const prompt = buildClusterPrompt(pillarKeyword.trim())

  let rawResponse: string
  try {
    rawResponse = await createMessage({
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'ai_error', message: 'AI request failed' } },
      { status: 502 }
    )
  }

  let parsed: { pillarArticle: Record<string, unknown>; supportingArticles: Record<string, unknown>[] }
  try {
    parsed = extractJsonPayload(rawResponse) as typeof parsed
    if (!parsed.pillarArticle || !Array.isArray(parsed.supportingArticles)) throw new Error('Invalid shape')
  } catch {
    return NextResponse.json({ error: { code: 'parse_error', message: 'Failed to parse AI response' } }, { status: 502 })
  }

  const articles = normalizeClusterArticles(parsed as Parameters<typeof normalizeClusterArticles>[0])
  const clusterName = typeof name === 'string' && name.trim() ? name.trim() : pillarKeyword.trim()

  const { data, error: insertError } = await supabase
    .from('content_clusters')
    .insert({
      user_id: user.id,
      pillar_keyword: pillarKeyword.trim(),
      name: clusterName,
      total_articles: articles.length,
      published_count: 0,
      articles: JSON.stringify(articles),
    })
    .select('*')
    .single()

  if (insertError || !data) {
    return NextResponse.json(
      { error: { code: 'db_error', message: 'Failed to create content cluster' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: mapCluster(data as Record<string, unknown>) }, { status: 201 })
}

export async function GET(request: NextRequest) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, { status: 401 })
  }

  const { supabase } = auth

  const { data, error } = await supabase
    .from('content_clusters')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: { code: 'db_error', message: 'Failed to fetch content clusters' } }, { status: 500 })
  }

  return NextResponse.json({ data: (data ?? []).map((r) => mapCluster(r as Record<string, unknown>)) })
}
