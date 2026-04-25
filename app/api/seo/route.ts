import { NextRequest, NextResponse } from 'next/server'
import { getSeoPrompt, type ResearchOutput } from '@/lib/prompts/seo'
import { createMessage } from '@/lib/ai'
import { requireAuth } from '@/lib/auth'
import { resolveSessionId } from '@/lib/session-assets'
import { sanitizeInput, sanitizeUnknown } from '@/lib/sanitize'
import type { SeoResult } from '@/types'

// OWASP checklist: JWT auth required, middleware rate limits, prompt inputs sanitized, generic error responses.

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

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'invalid_json', message: 'Invalid JSON in request body' } },
        { status: 400 }
      )
    }

    const topic = typeof body.topic === 'string' ? body.topic.trim() : ''
    const research = sanitizeUnknown(body.research)
    const keywords = Array.isArray(body.keywords)
      ? body.keywords
          .filter((item: unknown): item is string => typeof item === 'string')
          .map((item: string) => sanitizeInput(item))
      : []

    if (!topic || !research) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [
              ...((!topic) ? [{ field: 'topic', message: 'Topic is required' }] : []),
              ...(!research ? [{ field: 'research', message: 'Research output is required' }] : []),
            ],
          },
        },
        { status: 400 }
      )
    }

    const sanitizedTopic = sanitizeInput(topic)

    let sessionId: string
    try {
      sessionId = await resolveSessionId({
        supabase,
        userId: user.id,
        providedSessionId: body.sessionId,
        fallbackInputType: 'topic',
        fallbackInputData: { topic: sanitizedTopic, keywords },
      })
    } catch (sessionError) {
      return NextResponse.json(
        { error: { code: 'storage_error', message: sessionError instanceof Error ? sessionError.message : 'Failed to resolve session' } },
        { status: 500 },
      )
    }

    // Call Claude with SEO prompt
    const prompt = getSeoPrompt(sanitizedTopic, research as ResearchOutput, keywords)

    const responseText = await createMessage({
      maxTokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    let seoResult: SeoResult
    try {
      seoResult = JSON.parse(responseText)
    } catch {
      // Try to extract JSON from response if wrapped in markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        seoResult = JSON.parse(jsonMatch[1])
      } else {
        seoResult = JSON.parse(responseText)
      }
    }

    // Save to content_assets
    const { data: asset, error: assetError } = await supabase
      .from('content_assets')
      .insert({
        session_id: sessionId,
        asset_type: 'seo',
        content: {
          topic: sanitizedTopic,
          keywords,
          ...seoResult,
        },
      })
      .select('*')
      .single()

    if (assetError) {
      console.error('Error saving asset:', assetError)
      return NextResponse.json(
        { error: { code: 'storage_error', message: 'Failed to save SEO results' } },
        { status: 500 }
      )
    }

    // Return full SEO object wrapped in data
    return NextResponse.json(
      {
        data: {
          id: asset.id,
          sessionId: asset.session_id,
          assetType: 'seo',
          content: asset.content,
          version: asset.version,
          createdAt: asset.created_at,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in SEO API:', error)
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
