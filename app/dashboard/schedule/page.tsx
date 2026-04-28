'use client'

import { useEffect, useState } from 'react'
import { ScheduleCalendar } from '@/components/sections/ScheduleCalendar'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import type { ScheduledPost } from '@/components/ui/CalendarSlot'

function getWeekBounds(referenceDate: Date): { weekStart: Date; weekEnd: Date } {
  const d = new Date(referenceDate)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const weekStart = new Date(d.setDate(diff))
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  return { weekStart, weekEnd }
}

interface ApiScheduledPost {
  id: string
  session_id: string
  platform: string
  asset_type: string
  title: string | null
  status: ScheduledPost['status']
  publish_at: string
  error_details?: string | null
}

function mapPost(raw: ApiScheduledPost): ScheduledPost {
  return {
    id: raw.id,
    sessionId: raw.session_id,
    platform: raw.platform,
    assetType: raw.asset_type,
    title: raw.title,
    status: raw.status,
    publishAt: raw.publish_at,
    errorDetails: raw.error_details,
  }
}

export default function SchedulePage() {
  const { weekStart: initialWeekStart } = getWeekBounds(new Date())
  const [weekStart, setWeekStart] = useState<Date>(initialWeekStart)
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = async (start: Date) => {
    setLoading(true)
    setError(null)
    const { weekEnd } = getWeekBounds(start)
    try {
      const supabase = getSupabaseBrowserClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const params = new URLSearchParams({
        weekStart: start.toISOString(),
        weekEnd: weekEnd.toISOString(),
      })

      const res = await fetch(`/api/schedule?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (!res.ok) {
        setError('Failed to load scheduled posts')
        return
      }

      const json = await res.json() as { data?: ApiScheduledPost[] }
      setPosts((json.data ?? []).map(mapPost))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchPosts(weekStart)
  }, [weekStart])

  const handleReschedule = async (postId: string, newPublishAt: string) => {
    const previousPosts = posts
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, publishAt: newPublishAt } : p))
    )

    const supabase = getSupabaseBrowserClient()
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    const res = await fetch(`/api/schedule/${postId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ publishAt: newPublishAt }),
    })

    if (!res.ok) {
      // Rollback
      setPosts(previousPosts)
      alert('Failed to reschedule post. Please try again.')
      return
    }

    await fetchPosts(weekStart)
  }

  const handleRetry = async (postId: string) => {
    const supabase = getSupabaseBrowserClient()
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    const res = await fetch(`/api/schedule/${postId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ status: 'queued' }),
    })

    if (res.ok) {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, status: 'queued' } : p))
      )
    } else {
      alert('Failed to retry post.')
    }
  }

  const handleWeekChange = (direction: 'prev' | 'next') => {
    setWeekStart((prev) => {
      const next = new Date(prev)
      next.setDate(prev.getDate() + (direction === 'next' ? 7 : -7))
      return next
    })
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Schedule</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage and reschedule your content publishing queue
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground animate-pulse">Loading schedule…</div>
      ) : error ? (
        <div className="text-sm text-destructive">{error}</div>
      ) : (
        <ScheduleCalendar
          posts={posts}
          weekStart={weekStart}
          onReschedule={handleReschedule}
          onRetry={handleRetry}
          onWeekChange={handleWeekChange}
        />
      )}
    </div>
  )
}
