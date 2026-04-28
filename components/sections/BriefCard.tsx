'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import type { Brief } from '@/lib/brief'

interface BriefCardProps {
  sessionId: string
  onBriefApproved: () => void
}

async function getToken(): Promise<string | undefined> {
  const supabase = getSupabaseBrowserClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken()
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })
}

type BriefFormState = {
  keyword: string
  searchIntent: string
  audience: string
  suggestedH1: string
  h2Outline: string[]
  recommendedWordCount: string
  ctas: string[]
  ctaInput: string
}

function briefToForm(b: Brief): BriefFormState {
  return {
    keyword: b.keyword,
    searchIntent: b.searchIntent ?? 'informational',
    audience: b.audience ?? '',
    suggestedH1: b.suggestedH1 ?? '',
    h2Outline: [...b.h2Outline],
    recommendedWordCount: b.recommendedWordCount?.toString() ?? '',
    ctas: [...b.ctas],
    ctaInput: '',
  }
}

export function BriefCard({ sessionId, onBriefApproved }: BriefCardProps) {
  const [brief, setBrief] = useState<Brief | null>(null)
  const [form, setForm] = useState<BriefFormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const loadOrGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      // Try to fetch existing brief
      const getRes = await apiFetch(`/api/brief?sessionId=${encodeURIComponent(sessionId)}`)
      if (getRes.ok) {
        const json = (await getRes.json()) as { data: Brief }
        setBrief(json.data)
        setForm(briefToForm(json.data))
        return
      }

      // Auto-generate if not found
      if (getRes.status === 404) {
        const postRes = await apiFetch('/api/brief', {
          method: 'POST',
          body: JSON.stringify({ sessionId }),
        })
        if (!postRes.ok) {
          const json = (await postRes.json()) as { error?: { message?: string } }
          throw new Error(json.error?.message ?? 'Failed to generate brief')
        }
        const json = (await postRes.json()) as { data: Brief }
        setBrief(json.data)
        setForm(briefToForm(json.data))
        return
      }

      throw new Error('Failed to load brief')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate brief')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOrGenerate()
  }, [sessionId])

  const handleSave = async () => {
    if (!brief || !form) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        keyword: form.keyword,
        searchIntent: form.searchIntent,
        audience: form.audience,
        suggestedH1: form.suggestedH1,
        h2Outline: form.h2Outline,
        recommendedWordCount: form.recommendedWordCount ? parseInt(form.recommendedWordCount, 10) : null,
        ctas: form.ctas,
        status: 'approved' as const,
      }

      const res = await apiFetch(`/api/brief/${brief.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } }
        throw new Error(json.error?.message ?? 'Save failed')
      }

      const json = (await res.json()) as { data: Brief }
      setBrief(json.data)
      onBriefApproved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleH2Change = (idx: number, value: string) => {
    setForm((f) => f ? { ...f, h2Outline: f.h2Outline.map((h, i) => (i === idx ? value : h)) } : f)
  }

  const handleH2Remove = (idx: number) => {
    setForm((f) => f ? { ...f, h2Outline: f.h2Outline.filter((_, i) => i !== idx) } : f)
  }

  const handleH2Add = () => {
    setForm((f) => f ? { ...f, h2Outline: [...f.h2Outline, ''] } : f)
  }

  const handleH2Swap = (idx: number, direction: 'up' | 'down') => {
    setForm((f) => {
      if (!f) return f
      const arr = [...f.h2Outline]
      const target = direction === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= arr.length) return f
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return { ...f, h2Outline: arr }
    })
  }

  const handleAddCta = () => {
    if (!form?.ctaInput.trim()) return
    setForm((f) => f ? { ...f, ctas: [...f.ctas, f.ctaInput.trim()], ctaInput: '' } : f)
  }

  const handleRemoveCta = (idx: number) => {
    setForm((f) => f ? { ...f, ctas: f.ctas.filter((_, i) => i !== idx) } : f)
  }

  if (loading) {
    return (
      <div className="rounded-lg border p-4 space-y-3 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-4 bg-muted rounded w-1/2" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive p-4 space-y-2">
        <p className="text-sm text-destructive">{error}</p>
        <Button size="sm" variant="outline" onClick={() => void loadOrGenerate()}>
          Retry
        </Button>
      </div>
    )
  }

  if (!form) return null

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Content Brief</h3>
        <Button size="sm" variant="outline" onClick={() => void loadOrGenerate()} disabled={loading || saving}>
          Regenerate
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium">Keyword</label>
          <input
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            value={form.keyword}
            onChange={(e) => setForm((f) => f ? { ...f, keyword: e.target.value } : f)}
          />
        </div>
        <div>
          <label className="text-xs font-medium">Search Intent</label>
          <select
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            value={form.searchIntent}
            onChange={(e) => setForm((f) => f ? { ...f, searchIntent: e.target.value } : f)}
          >
            <option value="informational">Informational</option>
            <option value="commercial">Commercial</option>
            <option value="transactional">Transactional</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium">Audience</label>
          <input
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            value={form.audience}
            onChange={(e) => setForm((f) => f ? { ...f, audience: e.target.value } : f)}
          />
        </div>
        <div>
          <label className="text-xs font-medium">Suggested H1</label>
          <input
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            value={form.suggestedH1}
            onChange={(e) => setForm((f) => f ? { ...f, suggestedH1: e.target.value } : f)}
          />
        </div>
        <div>
          <label className="text-xs font-medium">Word Count</label>
          <input
            type="number"
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            value={form.recommendedWordCount}
            onChange={(e) => setForm((f) => f ? { ...f, recommendedWordCount: e.target.value } : f)}
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium">H2 Outline</label>
        <div className="mt-1 space-y-1">
          {form.h2Outline.map((h, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-muted-foreground text-sm select-none">⠿</span>
              <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
              <input
                className="flex-1 rounded border px-2 py-0.5 text-sm"
                value={h}
                onChange={(e) => handleH2Change(i, e.target.value)}
              />
              <button
                className="text-muted-foreground hover:text-foreground text-xs"
                onClick={() => handleH2Swap(i, 'up')}
                disabled={i === 0}
              >
                ↑
              </button>
              <button
                className="text-muted-foreground hover:text-foreground text-xs"
                onClick={() => handleH2Swap(i, 'down')}
                disabled={i === form.h2Outline.length - 1}
              >
                ↓
              </button>
              <button
                className="text-destructive/70 hover:text-destructive text-xs"
                onClick={() => handleH2Remove(i)}
              >
                ×
              </button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={handleH2Add} className="h-6 text-xs px-2">
            + Add Section
          </Button>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium">CTAs</label>
        <div className="flex flex-wrap gap-1 mt-1">
          {form.ctas.map((c, i) => (
            <span key={i} className="flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-xs">
              {c}
              <button onClick={() => handleRemoveCta(i)} className="text-muted-foreground hover:text-foreground">
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          placeholder="Type and press Enter to add"
          value={form.ctaInput}
          onChange={(e) => setForm((f) => f ? { ...f, ctaInput: e.target.value } : f)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              handleAddCta()
            }
          }}
          onBlur={handleAddCta}
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
        {saving ? 'Saving…' : 'Save Brief'}
      </Button>
    </div>
  )
}
