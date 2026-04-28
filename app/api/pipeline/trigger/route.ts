import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { inngest } from '@/lib/inngest/client'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: { code: 'unauthorized' } }, { status: 401 })
  }

  let body: { sessionId: string; mode: string; sourceText?: string; tone?: string }
  try {
    body = await request.json() as { sessionId: string; mode: string; sourceText?: string; tone?: string }
  } catch {
    return NextResponse.json({ error: { code: 'invalid_json' } }, { status: 400 })
  }

  const { sessionId, mode, sourceText, tone } = body

  if (!sessionId) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'sessionId required' } },
      { status: 400 }
    )
  }

  try {
    const result = await inngest.send({
      name: 'content/pipeline.start',
      data: {
        sessionId,
        userId: auth.user.id,
        mode,
        sourceText,
        tone,
      },
    })

    logger.info({ sessionId, userId: auth.user.id, eventId: result.ids[0] }, 'Pipeline enqueued')

    return NextResponse.json({ ok: true, eventId: result.ids[0] })
  } catch (err) {
    logger.error({ err, sessionId }, 'Failed to enqueue pipeline')
    return NextResponse.json(
      { error: { code: 'inngest_error', message: 'Failed to start pipeline' } },
      { status: 500 }
    )
  }
}
