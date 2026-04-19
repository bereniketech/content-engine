import type { SupabaseClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { getGoogleSecrets } from '@/lib/publish/secrets'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export interface GA4Data {
  period: 'last_30_days'
  sessions: number
  pageViews: number
  topPages: Array<{ path: string; views: number }>
  cachedAt: string
  fromCache: boolean
}

function getAnalyticsClient() {
  const { serviceAccountJson } = getGoogleSecrets()
  const credentials = JSON.parse(serviceAccountJson) as {
    client_email: string
    private_key: string
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  })

  return { auth, analyticsData: google.analyticsdata({ version: 'v1beta', auth }) }
}

async function fetchFromGA4(): Promise<Omit<GA4Data, 'cachedAt' | 'fromCache'>> {
  const { ga4PropertyId } = getGoogleSecrets()
  const { analyticsData } = getAnalyticsClient()

  const { data: reportData } = await analyticsData.properties.runReport({
    property: `properties/${ga4PropertyId}`,
    requestBody: {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
      dimensions: [{ name: 'pagePath' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: '5',
    },
  })

  const rows = reportData.rows ?? []
  let totalSessions = 0
  let totalPageViews = 0
  const topPages: Array<{ path: string; views: number }> = []

  const totalsRow = reportData.totals?.[0]
  if (totalsRow?.metricValues) {
    totalSessions = parseInt(totalsRow.metricValues[0]?.value ?? '0', 10)
    totalPageViews = parseInt(totalsRow.metricValues[1]?.value ?? '0', 10)
  }

  for (const row of rows) {
    const path = row.dimensionValues?.[0]?.value ?? '/'
    const views = parseInt(row.metricValues?.[1]?.value ?? '0', 10)
    topPages.push({ path, views })
  }

  return {
    period: 'last_30_days',
    sessions: totalSessions,
    pageViews: totalPageViews,
    topPages,
  }
}

export async function fetchGA4Data(
  userId: string,
  supabase: SupabaseClient,
  forceRefresh = false,
): Promise<GA4Data> {
  if (!forceRefresh) {
    const { data: snapshots } = await supabase
      .from('analytics_snapshots')
      .select('data, fetched_at')
      .eq('user_id', userId)
      .eq('source', 'ga4')
      .order('fetched_at', { ascending: false })
      .limit(1)

    const latest = snapshots?.[0]
    if (latest) {
      const age = Date.now() - new Date(latest.fetched_at).getTime()
      if (age < CACHE_TTL_MS) {
        const cachedData = latest.data as Omit<GA4Data, 'fromCache'>
        return { ...cachedData, fromCache: true }
      }
    }
  }

  const freshData = await fetchFromGA4()
  const cachedAt = new Date().toISOString()

  await supabase.from('analytics_snapshots').insert({
    user_id: userId,
    source: 'ga4',
    data: { ...freshData, cachedAt },
    fetched_at: cachedAt,
  })

  return { ...freshData, cachedAt, fromCache: false }
}
