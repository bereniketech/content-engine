import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { createSupabaseRequestClient } from '@/lib/session-assets'

/**
 * Supabase authentication cookie names
 * Extracted as constants following DRY principle to prevent drift
 */
export const SUPABASE_AUTH_COOKIE = '__Secure-sb-access'
export const SUPABASE_REFRESH_COOKIE = '__Secure-sb-refresh'
export const SUPABASE_FALLBACK_COOKIE = 'sb-access-token'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Service unavailable. Please try again later.')
  }

  return { supabaseUrl, supabaseAnonKey }
}

function getBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null
  }

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

export function createSupabaseUserClient(token: string): SupabaseClient {
  const { supabaseUrl: url, supabaseAnonKey: anonKey } = getConfig()

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function isInternalRequest(request: NextRequest): boolean {
  const secret = process.env.INNGEST_INTERNAL_SECRET
  if (!secret) return false
  return request.headers.get('x-inngest-internal') === secret
}

export async function requireAuth(
  request: NextRequest,
): Promise<{ user: User; token: string; supabase: SupabaseClient }> {
  const bearerToken = getBearerToken(request.headers.get('authorization'))

  if (bearerToken) {
    const bearerSupabase = createSupabaseUserClient(bearerToken)
    const {
      data: { user },
      error,
    } = await bearerSupabase.auth.getUser(bearerToken)

    if (error || !user) {
      throw new Error('Authentication required')
    }

    return { user, token: bearerToken, supabase: bearerSupabase }
  }

  const cookieSupabase = createSupabaseRequestClient(request)
  const {
    data: { user },
    error,
  } = await cookieSupabase.auth.getUser()

  if (error || !user) {
    throw new Error('Authentication required')
  }

  const {
    data: { session },
  } = await cookieSupabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Authentication required')
  }

  return { user, token: session.access_token, supabase: createSupabaseUserClient(session.access_token) }
}
