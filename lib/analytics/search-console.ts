import type { SupabaseClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { getGoogleSecrets } from '@/lib/publish/secrets'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export interface SearchConsoleData {
  period: 'last_28_days'
  totalClicks: number
  totalImpressions: number
  averageCtr: number
  topQueries: Array<{ query: string; clicks: number; impressions: number; position: number }>
  cachedAt: string
  fromCache: boolean
}

function getSearchConsoleClient() {
  const { serviceAccountJson } = getGoogleSecrets()
  const credentials = JSON.parse(serviceAccountJson) as {
    client_email: string
    private_key: string
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  })

  return google.searchconsole({ version: 'v1', auth })
}

async function fetchFromSearchConsole(): Promise<Omit<SearchConsoleData, 'cachedAt' | 'fromCache'>> {
  const { searchConsoleSiteUrl } = getGoogleSecrets()
  const client = getSearchConsoleClient()

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 28)

  const formatDate = (d: Date) => d.toISOString().split('T')[0]

  const response = await client.searchanalytics.query({
    siteUrl: searchConsoleSiteUrl,
    requestBody: {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      dimensions: ['query'],
      rowLimit: 10,
      type: 'web',
    },
  })

  const rows = response.data.rows ?? []

  let totalClicks = 0
  let totalImpressions = 0
  let ctrSum = 0

  const topQueries = rows.map((row) => {
    const clicks = row.clicks ?? 0
    const impressions = row.impressions ?? 0
    const ctr = row.ctr ?? 0
    const position = row.position ?? 0

    totalClicks += clicks
    totalImpressions += impressions
    ctrSum += ctr

    return {
      query: (row.keys?.[0] ?? ''),
      clicks,
      impressions,
      position: Math.round(position * 10) / 10,
    }
  })

  const averageCtr = rows.length > 0 ? Math.round((ctrSum / rows.length) * 1000) / 1000 : 0

  return {
    period: 'last_28_days',
    totalClicks,
    totalImpressions,
    averageCtr,
    topQueries,
  }
}

export async function fetchSearchConsoleData(
  userId: string,
  supabase: SupabaseClient,
  forceRefresh = false,
): Promise<SearchConsoleData> {
  if (!forceRefresh) {
    const { data: snapshots } = await supabase
      .from('analytics_snapshots')
      .select('data, fetched_at')
      .eq('user_id', userId)
      .eq('source', 'search_console')
      .order('fetched_at', { ascending: false })
      .limit(1)

    const latest = snapshots?.[0]
    if (latest) {
      const age = Date.now() - new Date(latest.fetched_at).getTime()
      if (age < CACHE_TTL_MS) {
        const cachedData = latest.data as Omit<SearchConsoleData, 'fromCache'>
        return { ...cachedData, fromCache: true }
      }
    }
  }

  const freshData = await fetchFromSearchConsole()
  const cachedAt = new Date().toISOString()

  await supabase.from('analytics_snapshots').insert({
    user_id: userId,
    source: 'search_console',
    data: { ...freshData, cachedAt },
    fetched_at: cachedAt,
  })

  return { ...freshData, cachedAt, fromCache: false }
}
