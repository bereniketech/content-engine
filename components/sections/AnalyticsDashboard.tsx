'use client'

import { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSupabaseBrowserClient } from '@/lib/supabase'

interface GA4Data {
  period: string
  sessions: number
  pageViews: number
  topPages: Array<{ path: string; views: number }>
  cachedAt: string
  fromCache: boolean
}

interface SCData {
  period: string
  totalClicks: number
  totalImpressions: number
  averageCtr: number
  topQueries: Array<{ query: string; clicks: number; impressions: number; position: number }>
  cachedAt: string
  fromCache: boolean
}

type LoadState<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'success'; data: T }

async function getAuthToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-32 w-full animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  )
}

function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-base text-destructive">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  )
}

export function AnalyticsDashboard() {
  const [ga4State, setGa4State] = useState<LoadState<GA4Data>>({ status: 'loading' })
  const [scState, setScState] = useState<LoadState<SCData>>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function load() {
      const token = await getAuthToken()
      if (!token) {
        if (!cancelled) {
          setGa4State({ status: 'error', message: 'Not authenticated' })
          setScState({ status: 'error', message: 'Not authenticated' })
        }
        return
      }

      const headers = { Authorization: `Bearer ${token}` }

      const [ga4Result, scResult] = await Promise.allSettled([
        fetch('/api/analytics/ga4', { headers }).then(r => r.json()),
        fetch('/api/analytics/search-console', { headers }).then(r => r.json()),
      ])

      if (cancelled) return

      if (ga4Result.status === 'fulfilled' && ga4Result.value?.data) {
        setGa4State({ status: 'success', data: ga4Result.value.data })
      } else {
        const msg = ga4Result.status === 'fulfilled'
          ? (ga4Result.value?.error?.message ?? 'Failed to load GA4 data')
          : 'Network error loading GA4 data'
        setGa4State({ status: 'error', message: msg })
      }

      if (scResult.status === 'fulfilled' && scResult.value?.data) {
        setScState({ status: 'success', data: scResult.value.data })
      } else {
        const msg = scResult.status === 'fulfilled'
          ? (scResult.value?.error?.message ?? 'Failed to load Search Console data')
          : 'Network error loading Search Console data'
        setScState({ status: 'error', message: msg })
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const sparklineData = ga4State.status === 'success'
    ? ga4State.data.topPages.map((p, i) => ({ name: `P${i + 1}`, views: p.views }))
    : []

  const ctrData = scState.status === 'success'
    ? scState.data.topQueries.slice(0, 6).map(q => ({
        name: q.query.length > 20 ? q.query.slice(0, 20) + '…' : q.query,
        ctr: Math.round(q.clicks / (q.impressions || 1) * 1000) / 10,
      }))
    : []

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {ga4State.status === 'loading' ? (
        <SkeletonCard />
      ) : ga4State.status === 'error' ? (
        <ErrorCard title="Traffic Overview" message={ga4State.message} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Traffic Overview</CardTitle>
            <p className="text-xs text-muted-foreground">
              {ga4State.data.sessions.toLocaleString()} sessions · {ga4State.data.pageViews.toLocaleString()} page views · last 30 days
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={sparklineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {ga4State.status === 'loading' ? (
        <SkeletonCard />
      ) : ga4State.status === 'error' ? (
        <ErrorCard title="Top Performing Content" message={ga4State.message} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Performing Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ga4State.data.topPages.map((page, i) => (
                <div key={page.path} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                    <span className="truncate text-foreground">{page.path}</span>
                  </span>
                  <span className="ml-2 flex-shrink-0 font-medium text-foreground">{page.views.toLocaleString()}</span>
                </div>
              ))}
              {ga4State.data.topPages.length === 0 && (
                <p className="text-sm text-muted-foreground">No page data available yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {scState.status === 'loading' ? (
        <SkeletonCard />
      ) : scState.status === 'error' ? (
        <ErrorCard title="CTR by Query" message={scState.message} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CTR by Query</CardTitle>
            <p className="text-xs text-muted-foreground">
              {scState.data.totalClicks.toLocaleString()} clicks · {scState.data.totalImpressions.toLocaleString()} impressions · avg CTR {(scState.data.averageCtr * 100).toFixed(1)}%
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={ctrData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" unit="%" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${v}%`, 'CTR']} />
                <Bar dataKey="ctr" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {scState.status === 'loading' ? (
        <SkeletonCard />
      ) : scState.status === 'error' ? (
        <ErrorCard title="Search Visibility" message={scState.message} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Search Visibility</CardTitle>
            <p className="text-xs text-muted-foreground">Top queries · last 28 days</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex text-xs font-medium text-muted-foreground mb-2">
                <span className="flex-1">Query</span>
                <span className="w-14 text-right">Clicks</span>
                <span className="w-14 text-right">Pos.</span>
              </div>
              {scState.data.topQueries.map((q) => (
                <div key={q.query} className="flex items-center text-sm">
                  <span className="flex-1 truncate text-foreground">{q.query}</span>
                  <span className="w-14 text-right text-foreground">{q.clicks}</span>
                  <span className={`w-14 text-right font-medium ${q.position <= 3 ? 'text-green-600' : q.position <= 10 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    #{q.position}
                  </span>
                </div>
              ))}
              {scState.data.topQueries.length === 0 && (
                <p className="text-sm text-muted-foreground">No search data available yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
