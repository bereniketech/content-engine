import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { publishToSubstack } from '@/lib/publish/substack'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: { code: 'unauthorized' } }, { status: 401 })
  }

  const { user, supabase } = auth

  let body: { article: string; topic: string; tone?: string; sessionId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: { code: 'invalid_json' } }, { status: 400 })
  }

  if (!body.article || !body.topic) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'article and topic required' } },
      { status: 400 }
    )
  }

  const sessionId = body.sessionId ?? ''

  if (sessionId) {
    const { data: existing } = await supabase
      .from('distribution_logs')
      .select('id')
      .eq('session_id', sessionId)
      .eq('platform', 'substack')
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: { code: 'already_published', message: 'Already published to Substack for this session' } },
        { status: 409 }
      )
    }
  }

  try {
    const result = await publishToSubstack({
      article: body.article,
      topic: body.topic,
      tone: body.tone,
      sessionId,
    })

    if (sessionId) {
      await supabase.from('distribution_logs').insert({
        session_id: sessionId,
        user_id: user.id,
        platform: 'substack',
        status: 'generated',
        published_at: result.publishedAt,
      })
    }

    logger.info({ sessionId, userId: user.id, platform: 'substack' }, 'Substack post generated')

    return NextResponse.json({ data: result })
  } catch (err) {
    logger.error({ err, sessionId, userId: user.id }, 'Substack publish failed')
    return NextResponse.json(
      { error: { code: 'publish_error', message: 'Failed to generate Substack post' } },
      { status: 500 }
    )
  }
}
