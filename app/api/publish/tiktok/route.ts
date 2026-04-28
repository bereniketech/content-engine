import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { publishToTikTok } from '@/lib/publish/tiktok'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: { code: 'unauthorized' } }, { status: 401 })
  }

  const { user, supabase } = auth

  let body: { article: string; tone?: string; sessionId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: { code: 'invalid_json' } }, { status: 400 })
  }

  if (!body.article) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'article required' } },
      { status: 400 }
    )
  }

  const sessionId = body.sessionId ?? ''

  if (sessionId) {
    const { data: existing } = await supabase
      .from('distribution_logs')
      .select('id')
      .eq('session_id', sessionId)
      .eq('platform', 'tiktok')
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: { code: 'already_published', message: 'Already published to TikTok for this session' } },
        { status: 409 }
      )
    }
  }

  try {
    const result = await publishToTikTok({
      article: body.article,
      tone: body.tone,
      sessionId,
    })

    if (sessionId) {
      await supabase.from('distribution_logs').insert({
        session_id: sessionId,
        user_id: user.id,
        platform: 'tiktok',
        status: 'generated',
        published_at: result.publishedAt,
      })
    }

    logger.info({ sessionId, userId: user.id, platform: 'tiktok' }, 'TikTok script generated')

    return NextResponse.json({ data: result })
  } catch (err) {
    logger.error({ err, sessionId, userId: user.id }, 'TikTok publish failed')
    return NextResponse.json(
      { error: { code: 'publish_error', message: 'Failed to generate TikTok script' } },
      { status: 500 }
    )
  }
}
