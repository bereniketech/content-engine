'use client'

import { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, RefreshCw, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSupabaseBrowserClient } from '@/lib/supabase'

interface RefreshTrigger {
  id: string
  query: string
  oldRank: number
  newRank: number
  sessionId: string | null
  status: 'pending' | 'resolved'
}

async function getAuthToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function resolveTrigger(id: string, token: string): Promise<void> {
  const response = await fetch(`/api/analytics/refresh-triggers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status: 'resolved' }),
  })
  if (!response.ok) throw new Error(`Failed to resolve trigger: ${response.status}`)
}

async function triggerRegenerate(sessionId: string, token: string): Promise<void> {
  await fetch('/api/flywheel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ sessionId, action: 'refresh' }),
  })
}

export function RefreshTriggerBanner() {
  const [triggers, setTriggers] = useState<RefreshTrigger[]>([])
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())

  const fetchTriggers = useCallback(async () => {
    const token = await getAuthToken()
    if (!token) return

    try {
      const response = await fetch('/api/analytics/refresh-triggers', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const json = await response.json()
        setTriggers(json.data ?? [])
      }
    } catch { /* silently ignore */ }
  }, [])

  useEffect(() => { fetchTriggers() }, [fetchTriggers])

  if (triggers.length === 0) return null

  const handleRegenerate = async (trigger: RefreshTrigger) => {
    setLoadingIds(prev => new Set(prev).add(trigger.id))
    const token = await getAuthToken()
    if (!token) {
      setLoadingIds(prev => { const s = new Set(prev); s.delete(trigger.id); return s })
      return
    }

    try {
      if (trigger.sessionId) {
        await triggerRegenerate(trigger.sessionId, token)
      }
      await resolveTrigger(trigger.id, token)
      setTriggers(prev => prev.filter(t => t.id !== trigger.id))
    } catch {
      // Remove from loading even on error
    } finally {
      setLoadingIds(prev => { const s = new Set(prev); s.delete(trigger.id); return s })
    }
  }

  const handleDismiss = async (trigger: RefreshTrigger) => {
    setLoadingIds(prev => new Set(prev).add(trigger.id))
    const token = await getAuthToken()
    if (!token) {
      setLoadingIds(prev => { const s = new Set(prev); s.delete(trigger.id); return s })
      return
    }

    try {
      await resolveTrigger(trigger.id, token)
      setTriggers(prev => prev.filter(t => t.id !== trigger.id))
    } catch {
      // ignore
    } finally {
      setLoadingIds(prev => { const s = new Set(prev); s.delete(trigger.id); return s })
    }
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800">Content needs refresh</p>
          <p className="mt-0.5 text-xs text-amber-700">
            {triggers.length} {triggers.length === 1 ? 'query has' : 'queries have'} dropped in ranking.
          </p>
          <div className="mt-3 space-y-2">
            {triggers.map((trigger) => {
              const isLoading = loadingIds.has(trigger.id)
              return (
                <div key={trigger.id} className="flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-white px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">&quot;{trigger.query}&quot;</p>
                    <p className="text-xs text-amber-700">
                      was <span className="font-semibold">#{Math.round(trigger.oldRank)}</span>{' '}
                      now <span className="font-semibold text-red-600">#{Math.round(trigger.newRank)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      className="h-7 text-xs"
                      disabled={isLoading}
                      onClick={() => handleRegenerate(trigger)}
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <><RefreshCw className="mr-1 h-3 w-3" /> Regenerate</>
                      )}
                    </Button>
                    <button
                      type="button"
                      className="text-amber-500 hover:text-amber-800"
                      disabled={isLoading}
                      onClick={() => handleDismiss(trigger)}
                      aria-label="Dismiss"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
