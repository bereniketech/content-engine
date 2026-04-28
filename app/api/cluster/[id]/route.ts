import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { mapCluster } from '@/lib/cluster'

export async function GET(
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

  const { data, error } = await supabase
    .from('content_clusters')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: { code: 'not_found', message: 'Cluster not found' } }, { status: 404 })
  }

  return NextResponse.json({ data: mapCluster(data as Record<string, unknown>) })
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
  const { supabase } = auth

  const { data, error } = await supabase
    .from('content_clusters')
    .delete()
    .eq('id', id)
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: { code: 'not_found', message: 'Cluster not found' } }, { status: 404 })
  }

  return NextResponse.json({ data: { id, deleted: true } })
}
