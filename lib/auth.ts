import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
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

export async function requireAuth(request: NextRequest): Promise<{ user: User; token: string }> {
  const token = getBearerToken(request.headers.get('authorization'))

  if (!token) {
    throw new Error('Authentication required')
  }

  const supabase = createSupabaseUserClient(token)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) {
    throw new Error('Authentication required')
  }

  return { user, token }
}
