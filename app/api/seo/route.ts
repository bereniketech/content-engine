import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { getSeoPrompt, type ResearchOutput } from '@/lib/prompts/seo'
import { claude } from '@/lib/claude'

export interface SeoResult {
  title: string
  metaDescription: string
  slug: string
  primaryKeyword: string
  secondaryKeywords: string[]
  snippetAnswer: string
  headingStructure: {
    h1: string
    h2: string[]
    h3: string[]
  }
  faqSchema: Array<{ question: string; answer: string }>
  articleSchema: {
    headline: string
    description: string
    author: string
    datePublished: string
  }
  seoScore: number
  keywordScore: number
  rankingPotential: 'Low' | 'Medium' | 'High'
}

export async function POST(request: NextRequest) {
  try {
    // Get Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
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

    const { topic, research, keywords } = body

    if (!topic?.trim() || !research) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: [
              ...((!topic?.trim()) ? [{ field: 'topic', message: 'Topic is required' }] : []),
              ...(!research ? [{ field: 'research', message: 'Research output is required' }] : []),
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
          input_data: { topic, keywords },
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

    // Call Claude with SEO prompt
    const prompt = getSeoPrompt(topic, research as ResearchOutput, keywords)

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
          topic,
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
