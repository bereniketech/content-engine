import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { runDetectionWithRewrite } from '@/lib/detect'

export async function POST(request: NextRequest) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, { status: 401 })
  }

  if (!process.env.ORIGINALITY_API_KEY) {
    return NextResponse.json(
      {
        error: {
          code: 'config_error',
          message: 'Connect Originality.ai in settings',
          connectUrl: '/dashboard/settings',
        },
      },
      { status: 422 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: { code: 'validation_error', message: 'Invalid JSON body' } }, { status: 400 })
  }

  const { sessionId, text } = body as { sessionId?: unknown; text?: unknown }

  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: { code: 'validation_error', message: 'sessionId is required' } }, { status: 400 })
  }
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return NextResponse.json({ error: { code: 'validation_error', message: 'text is required' } }, { status: 400 })
  }

  const { supabase } = auth

  try {
    const { originalityScore, aiScore, rewritten } = await runDetectionWithRewrite(sessionId, text, supabase)
    return NextResponse.json({ data: { originalityScore, aiScore, rewritten } })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json(
        { error: { code: 'timeout', message: 'Detection service unavailable — please retry' } },
        { status: 504 }
      )
    }
    return NextResponse.json(
      { error: { code: 'detection_error', message: 'Detection failed' } },
      { status: 502 }
    )
  }
}
