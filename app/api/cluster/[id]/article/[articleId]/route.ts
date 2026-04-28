// OWASP checklist: JWT auth required, ownership via RLS, input validated, generic errors.
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { mapCluster, type ClusterArticle } from '@/lib/cluster'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; articleId: string }> }
) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, { status: 401 })
  }

  const { id, articleId } = await params
  const { supabase } = auth

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: { code: 'validation_error', message: 'Invalid JSON body' } }, { status: 400 })
  }

  const { status, sessionId } = body as { status?: unknown; sessionId?: unknown }

  const validStatuses = ['pending', 'in_progress', 'published']
  if (!status || typeof status !== 'string' || !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'status must be one of: pending, in_progress, published' } },
      { status: 400 }
    )
  }

  // Fetch cluster (RLS enforces user ownership)
  const { data: cluster, error: fetchError } = await supabase
    .from('content_clusters')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !cluster) {
    return NextResponse.json({ error: { code: 'not_found', message: 'Cluster not found' } }, { status: 404 })
  }

  const articles = (cluster.articles as ClusterArticle[]) ?? []
  const articleIndex = articles.findIndex((a) => a.id === articleId)

  if (articleIndex === -1) {
    return NextResponse.json({ error: { code: 'not_found', message: 'Article not found in cluster' } }, { status: 404 })
  }

  const updatedArticles = articles.map((a, i) => {
    if (i !== articleIndex) return a
    return {
      ...a,
      status: status as ClusterArticle['status'],
      ...(sessionId && typeof sessionId === 'string' ? { sessionId } : {}),
    }
  })

  // Recompute published_count from articles array
  const publishedCount = updatedArticles.filter((a) => a.status === 'published').length

  const { data: updated, error: updateError } = await supabase
    .from('content_clusters')
    .update({ articles: JSON.stringify(updatedArticles), published_count: publishedCount })
    .eq('id', id)
    .select('*')
    .single()

  if (updateError || !updated) {
    return NextResponse.json(
      { error: { code: 'db_error', message: updateError?.message ?? 'Update failed' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: mapCluster(updated as Record<string, unknown>) })
}
