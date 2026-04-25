'use client'

import { getSupabaseBrowserClient } from '@/lib/supabase'

export async function getAuthToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}
