import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import type { ContentAsset, SessionInputData, SessionInputType } from '@/types'

export interface ContentAssetRow {
  id: string
  session_id: string
  asset_type: string
  content: Record<string, unknown>
  version: number
  created_at: string
}

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return { supabaseUrl, supabaseAnonKey }
}

export const SESSION_ID_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function createSupabaseRequestClient(request: NextRequest): SupabaseClient {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll() {
        // Route handlers do not need to mutate auth cookies for this workflow.
      },
    },
  })
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function mapAssetRowToContentAsset(row: ContentAssetRow): ContentAsset {
  return {
    id: row.id,
    assetType: row.asset_type,
    content: row.content,
    version: row.version,
    createdAt: row.created_at,
  }
}

export function getLatestAssetByType(assets: ContentAsset[], assetType: string): ContentAsset | null {
  return [...assets].reverse().find((asset) => asset.assetType === assetType) ?? null
}

export async function resolveSessionId(options: {
  supabase: SupabaseClient
  userId: string
  providedSessionId?: unknown
  fallbackInputType: SessionInputType
  fallbackInputData: SessionInputData | Record<string, unknown>
}): Promise<string> {
  const { supabase, userId, providedSessionId, fallbackInputType, fallbackInputData } = options

  if (typeof providedSessionId === 'string' && providedSessionId.trim().length > 0) {
    const { data: ownedSession, error } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', providedSessionId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    if (!ownedSession) {
      throw new Error('Session not found')
    }

    return ownedSession.id
  }

  const { data: latestSession, error: latestSessionError } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestSessionError) {
    throw new Error(latestSessionError.message)
  }

  if (latestSession?.id) {
    return latestSession.id
  }

  const { data: createdSession, error: createSessionError } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      input_type: fallbackInputType,
      input_data: fallbackInputData,
    })
    .select('id')
    .single()

  if (createSessionError || !createdSession) {
    throw new Error(createSessionError?.message ?? 'Failed to create session')
  }

  return createdSession.id
}