'use client'

import { useState } from 'react'
import { Loader2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSupabaseBrowserClient } from '@/lib/supabase'

interface ScheduleModalProps {
  platform: string
  sessionId: string
  assetType: string
  contentSnapshot: Record<string, unknown>
  onScheduled: (id: string, publishAt: string) => void
  onClose: () => void
}

async function getAuthToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export function ScheduleModal({
  platform,
  sessionId,
  assetType,
  contentSnapshot,
  onScheduled,
  onClose,
}: ScheduleModalProps) {
  const [publishAt, setPublishAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const minDateTime = new Date(Date.now() + 5 * 60 * 1000)
    .toISOString()
    .slice(0, 16)

  const isValidDate = publishAt.length > 0 && new Date(publishAt).getTime() > Date.now() + 4 * 60 * 1000

  const handleSchedule = async () => {
    if (!isValidDate || loading) return
    setLoading(true)
    setError('')

    const token = await getAuthToken()
    if (!token) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId,
          platform,
          publishAt: new Date(publishAt).toISOString(),
          assetType,
          contentSnapshot,
        }),
      })

      const json = await response.json()
      if (!response.ok) {
        setError(json?.error?.message ?? `Error ${response.status}`)
        setLoading(false)
        return
      }

      onScheduled(json.data.id, json.data.publishAt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Schedule post to {platform === 'x' ? 'X' : platform}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Publish date &amp; time
            </label>
            <input
              type="datetime-local"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              min={minDateTime}
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Must be at least 5 minutes from now.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!isValidDate || loading}
              onClick={handleSchedule}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scheduling...</>
              ) : (
                'Schedule'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
