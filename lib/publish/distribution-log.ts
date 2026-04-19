import type { SupabaseClient } from '@supabase/supabase-js'

export class AlreadyPublishedError extends Error {
  constructor(public readonly platform: string) {
    super(`Already published to ${platform} for this session.`)
    this.name = 'AlreadyPublishedError'
  }
}

export interface WriteDistributionLogParams {
  supabase: SupabaseClient
  sessionId: string
  userId: string
  platform: string
  status: 'published' | 'failed'
  externalId?: string
  metadata?: Record<string, unknown>
  errorDetails?: string
}

/**
 * Throws AlreadyPublishedError if a 'published' log already exists
 * for this session_id + platform combination.
 */
export async function checkAlreadyPublished(
  supabase: SupabaseClient,
  sessionId: string,
  platform: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('distribution_logs')
    .select('id')
    .eq('session_id', sessionId)
    .eq('platform', platform)
    .eq('status', 'published')
    .limit(1)

  if (error) {
    // Don't block publish on DB read error — log and continue
    console.error('distribution-log check error', { sessionId, platform, error: error.message })
    return
  }

  if (data && data.length > 0) {
    throw new AlreadyPublishedError(platform)
  }
}

/**
 * Inserts a row into distribution_logs and returns the log id.
 */
export async function writeDistributionLog(params: WriteDistributionLogParams): Promise<string> {
  const {
    supabase,
    sessionId,
    userId,
    platform,
    status,
    externalId,
    metadata = {},
    errorDetails,
  } = params

  const { data, error } = await supabase
    .from('distribution_logs')
    .insert({
      session_id: sessionId,
      user_id: userId,
      platform,
      status,
      external_id: externalId ?? null,
      metadata,
      error_details: errorDetails ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to write distribution log: ${error?.message ?? 'unknown error'}`)
  }

  return data.id as string
}
