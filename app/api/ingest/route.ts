// OWASP checklist: JWT auth required, middleware rate limits, URL validated, generic errors.
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { sanitizeInput } from '@/lib/sanitize'
import { resolveSessionId, mapAssetRowToContentAsset } from '@/lib/session-assets'
import { detectUrlType } from '@/lib/ingest/detect-url-type'
import { fetchYouTubeTranscript } from '@/lib/ingest/youtube'
import { transcribeAudio } from '@/lib/ingest/audio'
import { scrapeWebPage } from '@/lib/ingest/web-scraper'
import { IngestionError } from '@/lib/ingest/errors'

async function dispatchIngestion(urlType: 'youtube' | 'audio' | 'web', url: string): Promise<string> {
  switch (urlType) {
    case 'youtube':
      return fetchYouTubeTranscript(url)
    case 'audio':
      return transcribeAudio(url)
    case 'web':
      return scrapeWebPage(url)
  }
}

export async function POST(request: NextRequest) {
  try {
    let auth
    try {
      auth = await requireAuth(request)
    } catch {
      return NextResponse.json(
        { error: { code: 'unauthorized', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const { user, supabase } = auth

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'invalid_json', message: 'Invalid JSON in request body' } },
        { status: 400 }
      )
    }

    const rawUrl = typeof body.url === 'string' ? body.url.trim() : ''
    if (!rawUrl) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [{ field: 'url', message: 'URL is required' }],
          },
        },
        { status: 400 }
      )
    }

    const url = sanitizeInput(rawUrl)
    const urlType = detectUrlType(url)

    if (urlType === 'invalid') {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Invalid URL: only http/https YouTube, audio, or web URLs are accepted',
          },
        },
        { status: 400 }
      )
    }

    let text: string
    try {
      text = await dispatchIngestion(urlType, url)
    } catch (err) {
      if (err instanceof IngestionError) {
        return NextResponse.json(
          { error: { code: 'ingestion_error', source: err.source, message: 'Failed to ingest content from the provided URL' } },
          { status: 422 }
        )
      }
      return NextResponse.json(
        { error: { code: 'server_error', message: 'Ingestion failed unexpectedly' } },
        { status: 500 }
      )
    }

    const wordCount = text.split(/\s+/).filter(Boolean).length
    const preview = text.slice(0, 300) + (text.length > 300 ? '...' : '')

    let sessionId: string
    try {
      sessionId = await resolveSessionId({
        supabase,
        userId: user.id,
        providedSessionId: body.sessionId,
        fallbackInputType: 'upload',
        fallbackInputData: { sourceUrl: url },
      })
    } catch {
      return NextResponse.json(
        {
          error: {
            code: 'storage_error',
            message: 'Failed to resolve session',
          },
        },
        { status: 500 }
      )
    }

    const { data: savedAsset, error: saveError } = await supabase
      .from('content_assets')
      .insert({
        session_id: sessionId,
        asset_type: 'source_transcript',
        content: { text, url, wordCount },
      })
      .select('*')
      .single()

    if (saveError) {
      return NextResponse.json(
        { error: { code: 'storage_error', message: 'Failed to save transcript' } },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        data: {
          sessionId,
          wordCount,
          preview,
          assetId: mapAssetRowToContentAsset(savedAsset).id,
        },
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { error: { code: 'server_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
