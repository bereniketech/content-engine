import { NextRequest, NextResponse } from 'next/server'
import { googleSearch } from '@/lib/google-search'
import { getResearchPrompt } from '@/lib/prompts/research'
import { createMessage } from '@/lib/ai'
import { requireAuth } from '@/lib/auth'
import { resolveSessionId } from '@/lib/session-assets'
import { sanitizeInput } from '@/lib/sanitize'

// OWASP checklist: JWT auth required, middleware rate limits, prompt inputs sanitized, generic error responses.

interface ResearchResult {
  intent: 'informational' | 'commercial' | 'transactional'
  demand: 'high' | 'medium' | 'low'
  trend: 'rising' | 'stable' | 'declining'
  keywords: string[]
  faqs: Array<{ question: string; answer: string }>
  competitors: Array<{ name: string; url: string; strength: string }>
  gaps: string[]
  alternatives?: string[]
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
    const audience = typeof body.audience === 'string' ? body.audience.trim() : ''
    const geography = typeof body.geography === 'string' ? body.geography.trim() : ''

    if (!topic || !audience) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [
              ...((!topic) ? [{ field: 'topic', message: 'Topic is required' }] : []),
              ...((!audience) ? [{ field: 'audience', message: 'Audience is required' }] : []),
            ],
          },
        },
        { status: 400 }
      )
    }

    const sanitizedTopic = sanitizeInput(topic)
    const sanitizedAudience = sanitizeInput(audience)
    const sanitizedGeography = sanitizeInput(geography)

    let sessionId: string
    try {
      sessionId = await resolveSessionId({
        supabase,
        userId: user.id,
        providedSessionId: body.sessionId,
        fallbackInputType: 'topic',
        fallbackInputData: {
          topic: sanitizedTopic,
          audience: sanitizedAudience,
          geography: sanitizedGeography,
        },
      })
    } catch (sessionError) {
      return NextResponse.json(
        { error: { code: 'storage_error', message: sessionError instanceof Error ? sessionError.message : 'Failed to resolve session' } },
        { status: 500 },
      )
    }

    // Parallelize Google Search calls
    const [mainResults, tipsResults] = await Promise.all([
      googleSearch(sanitizedTopic),
      googleSearch(`${sanitizedTopic} tips`),
    ])

    const allResults = [...mainResults, ...tipsResults]

    // Call Claude with research prompt
    const prompt = getResearchPrompt(sanitizedTopic, allResults)

    const responseText = await createMessage({
      maxTokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })
    
    let researchResult: ResearchResult
    try {
      researchResult = JSON.parse(responseText)
    } catch {
      // Try to extract JSON from response if wrapped in markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        researchResult = JSON.parse(jsonMatch[1])
      } else {
        researchResult = JSON.parse(responseText)
      }
    }

    // If demand is low, ensure alternatives are included
    if (researchResult.demand === 'low') {
      if (!researchResult.alternatives || researchResult.alternatives.length === 0) {
        // Call Claude again to get alternatives
        const altPrompt = `Given the topic "${sanitizedTopic}", suggest 3 high-demand alternative topics that would perform better. Return only a JSON array with 3 strings: ["topic1", "topic2", "topic3"]`
        
        const altText = await createMessage({
          maxTokens: 200,
          messages: [{ role: 'user', content: altPrompt }],
        })
        try {
          const alternatives = JSON.parse(altText)
          researchResult.alternatives = alternatives
        } catch {
          // Fallback if parsing fails
          researchResult.alternatives = ['Alternative Topic 1', 'Alternative Topic 2', 'Alternative Topic 3']
        }
      }
    }

    // Save to content_assets
    const { data: asset, error: assetError } = await supabase
      .from('content_assets')
      .insert({
        session_id: sessionId,
        asset_type: 'research',
        content: {
          topic: sanitizedTopic,
          audience: sanitizedAudience,
          geography: sanitizedGeography,
          ...researchResult,
        },
      })
      .select('*')
      .single()

    if (assetError) {
      console.error('Error saving asset:', assetError)
      return NextResponse.json(
        { error: { code: 'storage_error', message: 'Failed to save research results' } },
        { status: 500 }
      )
    }

    // Return full research object wrapped in data
    return NextResponse.json(
      {
        data: {
          id: asset.id,
          sessionId: asset.session_id,
          assetType: 'research',
          content: asset.content,
          version: asset.version,
          createdAt: asset.created_at,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Research API error:', error)
    return NextResponse.json(
      { error: { code: 'server_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
