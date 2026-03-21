import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { googleSearch } from '@/lib/google-search'
import { getResearchPrompt } from '@/lib/prompts/research'
import { claude } from '@/lib/claude'

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
    // Get Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: { code: 'server_error', message: 'Missing server configuration' } },
        { status: 500 }
      )
    }

    // Create server client with service key for RLS bypass
    const supabase = createServerClient(supabaseUrl, supabaseServiceKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // No-op for server client, cookies already managed by middleware
        },
      },
    })

    // Get user from Supabase auth via middleware
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'unauthorized', message: 'Authentication required' } },
        { status: 401 }
      )
    }

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

    const { topic, audience, geography } = body

    if (!topic?.trim() || !audience?.trim()) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [
              ...((!topic?.trim()) ? [{ field: 'topic', message: 'Topic is required' }] : []),
              ...((!audience?.trim()) ? [{ field: 'audience', message: 'Audience is required' }] : []),
            ],
          },
        },
        { status: 400 }
      )
    }

    // Get or create session
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('user_id', user.id)
      .single()

    let sessionId: string
    if (sessionError || !sessionData) {
      const { data: newSession, error: createSessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          input_type: 'topic',
          input_data: { topic, audience, geography },
        })
        .select('id')
        .single()

      if (createSessionError || !newSession) {
        return NextResponse.json(
          { error: 'Failed to create session' },
          { status: 500 }
        )
      }
      sessionId = newSession.id
    } else {
      sessionId = sessionData.id
    }

    // Parallelize Google Search calls
    const [mainResults, tipsResults] = await Promise.all([
      googleSearch(topic),
      googleSearch(`${topic} tips`),
    ])

    const allResults = [...mainResults, ...tipsResults]

    // Call Claude with research prompt
    const prompt = getResearchPrompt(topic, allResults)

    const message = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    // Extract JSON from response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    
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
        const altPrompt = `Given the topic "${topic}", suggest 3 high-demand alternative topics that would perform better. Return only a JSON array with 3 strings: ["topic1", "topic2", "topic3"]`
        
        const altMessage = await claude.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 200,
          messages: [
            {
              role: 'user',
              content: altPrompt,
            },
          ],
        })

        const altText = altMessage.content[0].type === 'text' ? altMessage.content[0].text : ''
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
          topic,
          audience,
          geography,
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
