'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Library } from 'lucide-react'
import { ContentLibrary } from '@/components/sections/ContentLibrary'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/button'
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

  const loadLibrary = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseBrowserClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const response = await fetch(`/api/roi?page=${page}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (!response.ok) {
        // Don't try to parse error body — just show a friendly message
        setError('Unable to load library. Please try again.')
        return
      }

      const text = await response.text()
      let json: ROIResponse
      try {
        json = JSON.parse(text) as ROIResponse
      } catch {
        // Server returned non-JSON (e.g. HTML error page)
        setError('Unable to load library. Please try again.')
        return
      }

      if (!json.data) {
        setError('Unable to load library. Please try again.')
        return
      }

      setItems(json.data)
      setTotal(json.meta?.total ?? 0)
    } catch {
      // Network failure
      setError('Unable to load library. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void loadLibrary()
  }, [loadLibrary])

  const pageSize = 25
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const isGA4Connected = items.some((item) => item.organicClicks !== null)

  const handleRowClick = (sessionId: string) => {
    router.push(`/dashboard?sessionId=${sessionId}`)
  }

  const handlePageChange = (newPage: number) => {
    router.push(`/dashboard/library?page=${newPage}`)
  }

  const FILTERS = ["all", "published", "scheduled", "review", "draft"] as const
  type FilterType = typeof FILTERS[number]
  const [activeFilter, setActiveFilter] = useState<FilterType>("all")

  const filterLabels: Record<FilterType, string> = {
    all: "All", published: "Published", scheduled: "Scheduled", review: "In Review", draft: "Draft"
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Content Library</h1>
        <div className="bg-card rounded-lg shadow-md overflow-hidden">
          <div className="bg-surface-mid px-4 py-3 h-12" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-t border-foreground-4/20 px-4 py-4">
              <div className="animate-pulse bg-surface-low rounded h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Content Library</h1>
        <div className="flex flex-col items-center gap-3 py-12">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void loadLibrary()}>
            Try again
          </Button>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Content Library</h1>
        <EmptyState
          icon={Library}
          heading="Your library is empty"
          body="Published articles will appear here once you start creating content."
          cta={{ label: "Create content", href: "/dashboard/new-session" }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Content Library</h1>
        <p className="text-sm text-foreground-2 mt-1">
          {total} article{total !== 1 ? "s" : ""} · sorted by newest
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`rounded-full border text-[13px] font-medium px-3.5 py-1.5 transition-colors duration-[120ms] ${
              activeFilter === filter
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-foreground-2 hover:border-primary/50"
            }`}
          >
            {filterLabels[filter]}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-lg shadow-md overflow-hidden">
        <ContentLibrary
          items={items}
          isGA4Connected={isGA4Connected}
          onRowClick={handleRowClick}
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
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
