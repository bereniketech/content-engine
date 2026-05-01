'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ContentLibrary } from '@/components/sections/ContentLibrary'
import { getSupabaseBrowserClient } from '@/lib/supabase'

interface ROIItem {
  sessionId: string
  title: string | null
  publishedAt: string | null
  organicClicks: number | null
  impressions: number | null
  avgPosition: number | null
  trafficValue: number | null
  trend: number[]
  needsRefresh: boolean
}

interface ROIResponse {
  data?: ROIItem[]
  meta?: { total: number; page: number; pageSize: number }
  error?: { message: string }
}

function LibraryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)

  const [items, setItems] = useState<ROIItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const supabase = getSupabaseBrowserClient()
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token

        const res = await fetch(`/api/roi?page=${page}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })

        const json = (await res.json()) as ROIResponse

        if (!res.ok || !json.data) {
          setError(json.error?.message ?? 'Failed to load library')
          return
        }

        setItems(json.data)
        setTotal(json.meta?.total ?? 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load library')
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [page])

  const pageSize = 25
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const isGA4Connected = items.some((item) => item.organicClicks !== null)

  const handleRowClick = (sessionId: string) => {
    router.push(`/dashboard?sessionId=${sessionId}`)
  }

  const handlePageChange = (newPage: number) => {
    router.push(`/dashboard/library?page=${newPage}`)
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Content Library</h1>
        <div className="rounded-md border overflow-hidden">
          <div className="bg-muted px-4 py-3 h-12" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-t px-4 py-4">
              <div className="animate-pulse bg-gray-200 rounded h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Content Library</h1>
        <p className="text-destructive">{error}</p>
        <button
          className="text-sm underline text-primary"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Content Library</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {total} article{total !== 1 ? 's' : ''} · sorted by newest
        </p>
      </div>

      <ContentLibrary
        items={items}
        isGA4Connected={isGA4Connected}
        onRowClick={handleRowClick}
        page={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  )
}

export default function LibraryPage() {
  return (
    <Suspense fallback={
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Content Library</h1>
        <div className="rounded-md border overflow-hidden">
          <div className="bg-muted px-4 py-3 h-12" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-t px-4 py-4">
              <div className="animate-pulse bg-gray-200 rounded h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    }>
      <LibraryContent />
    </Suspense>
  )
}
