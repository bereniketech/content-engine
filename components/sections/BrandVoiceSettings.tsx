'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getSupabaseBrowserClient } from '@/lib/supabase'

interface BrandVoice {
  id: string
  name: string
  toneAdjectives: string[]
  writingSamples: string[]
  forbiddenPhrases: string[]
  formalityLevel: 'formal' | 'casual' | 'neutral'
  isActive: boolean
  createdAt: string
}

interface FormState {
  name: string
  formalityLevel: 'formal' | 'casual' | 'neutral'
  toneAdjectives: string[]
  writingSamples: string
  forbiddenPhrases: string[]
  toneInput: string
  forbiddenInput: string
}

const emptyForm = (): FormState => ({
  name: '',
  formalityLevel: 'neutral',
  toneAdjectives: [],
  writingSamples: '',
  forbiddenPhrases: [],
  toneInput: '',
  forbiddenInput: '',
})

function voiceToForm(v: BrandVoice): FormState {
  return {
    name: v.name,
    formalityLevel: v.formalityLevel,
    toneAdjectives: [...v.toneAdjectives],
    writingSamples: v.writingSamples.join('\n'),
    forbiddenPhrases: [...v.forbiddenPhrases],
    toneInput: '',
    forbiddenInput: '',
  }
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

export function BrandVoiceSettings() {
  const [voices, setVoices] = useState<BrandVoice[]>([])
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchVoices = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch('/api/brand-voice')
      if (!res.ok) throw new Error('Failed to load brand voices')
      const json = (await res.json()) as { data: BrandVoice[] }
      setVoices(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchVoices()
  }, [])

  const handleEdit = (v: BrandVoice) => {
    setEditingId(v.id)
    setForm(voiceToForm(v))
  }

  const handleAddNew = () => {
    setEditingId('new')
    setForm(emptyForm())
  }

  const handleCancel = () => {
    setEditingId(null)
  }

  const handleAddTag = (
    field: 'toneAdjectives' | 'forbiddenPhrases',
    inputField: 'toneInput' | 'forbiddenInput'
  ) => {
    const val = form[inputField].trim().replace(/,$/, '').trim()
    if (!val) return
    setForm((f) => ({ ...f, [field]: [...f[field], val], [inputField]: '' }))
  }

  const handleRemoveTag = (field: 'toneAdjectives' | 'forbiddenPhrases', idx: number) => {
    setForm((f) => ({ ...f, [field]: f[field].filter((_, i) => i !== idx) }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: form.name.trim(),
        formalityLevel: form.formalityLevel,
        toneAdjectives: form.toneAdjectives,
        writingSamples: form.writingSamples
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        forbiddenPhrases: form.forbiddenPhrases,
      }

      let res: Response
      if (editingId === 'new') {
        res = await apiFetch('/api/brand-voice', { method: 'POST', body: JSON.stringify(payload) })
      } else {
        res = await apiFetch(`/api/brand-voice/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
      }

      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } }
        throw new Error(json.error?.message ?? 'Save failed')
      }

      setEditingId(null)
      await fetchVoices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this brand voice profile?')) return
    try {
      const res = await apiFetch(`/api/brand-voice/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      await fetchVoices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleSetActive = async (id: string) => {
    try {
      const res = await apiFetch(`/api/brand-voice/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: true }),
      })
      if (!res.ok) throw new Error('Failed to set active')
      await fetchVoices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set active')
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground animate-pulse">Loading brand voices…</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Brand Voice Profiles</h2>
        <Button
          size="sm"
          onClick={handleAddNew}
          disabled={voices.length >= 5 || editingId !== null}
          title={voices.length >= 5 ? 'Maximum 5 reached' : undefined}
        >
          Add Profile
        </Button>
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <div className="space-y-3">
        {voices.map((v) => (
          <div
            key={v.id}
            className={`rounded-lg border p-4 space-y-2 ${v.isActive ? 'border-green-500 bg-green-50/30' : ''}`}
          >
            {editingId === v.id ? (
              <VoiceForm
                form={form}
                setForm={setForm}
                saving={saving}
                onSave={handleSave}
                onCancel={handleCancel}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
              />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{v.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground capitalize">{v.formalityLevel}</span>
                    {v.isActive && (
                      <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 text-[10px]">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {!v.isActive && (
                      <Button variant="outline" size="sm" onClick={() => void handleSetActive(v.id)}>
                        Set Active
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleEdit(v)}>
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => void handleDelete(v.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                {v.toneAdjectives.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {v.toneAdjectives.map((t, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {editingId === 'new' && (
          <div className="rounded-lg border p-4">
            <VoiceForm
              form={form}
              setForm={setForm}
              saving={saving}
              onSave={handleSave}
              onCancel={handleCancel}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
            />
          </div>
        )}
      </div>
    </div>
  )
}

interface VoiceFormProps {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  saving: boolean
  onSave: () => void
  onCancel: () => void
  onAddTag: (field: 'toneAdjectives' | 'forbiddenPhrases', inputField: 'toneInput' | 'forbiddenInput') => void
  onRemoveTag: (field: 'toneAdjectives' | 'forbiddenPhrases', idx: number) => void
}

function VoiceForm({ form, setForm, saving, onSave, onCancel, onAddTag, onRemoveTag }: VoiceFormProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium">Name *</label>
        <input
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          maxLength={100}
        />
      </div>

      <div>
        <label className="text-xs font-medium">Formality</label>
        <select
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={form.formalityLevel}
          onChange={(e) =>
            setForm((f) => ({ ...f, formalityLevel: e.target.value as FormState['formalityLevel'] }))
          }
        >
          <option value="neutral">Neutral</option>
          <option value="formal">Formal</option>
          <option value="casual">Casual</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium">Tone Adjectives</label>
        <div className="flex flex-wrap gap-1 mt-1">
          {form.toneAdjectives.map((t, i) => (
            <span key={i} className="flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-xs">
              {t}
              <button onClick={() => onRemoveTag('toneAdjectives', i)} className="text-muted-foreground hover:text-foreground">
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          placeholder="Type and press comma or Enter to add"
          value={form.toneInput}
          onChange={(e) => setForm((f) => ({ ...f, toneInput: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === ',' || e.key === 'Enter') {
              e.preventDefault()
              onAddTag('toneAdjectives', 'toneInput')
            }
          }}
          onBlur={() => onAddTag('toneAdjectives', 'toneInput')}
        />
      </div>

      <div>
        <label className="text-xs font-medium">Writing Samples (one per line)</label>
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm h-20 resize-none"
          value={form.writingSamples}
          onChange={(e) => setForm((f) => ({ ...f, writingSamples: e.target.value }))}
        />
      </div>

      <div>
        <label className="text-xs font-medium">Forbidden Phrases</label>
        <div className="flex flex-wrap gap-1 mt-1">
          {form.forbiddenPhrases.map((p, i) => (
            <span key={i} className="flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-xs">
              {p}
              <button onClick={() => onRemoveTag('forbiddenPhrases', i)} className="text-muted-foreground hover:text-foreground">
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          placeholder="Type and press comma or Enter to add"
          value={form.forbiddenInput}
          onChange={(e) => setForm((f) => ({ ...f, forbiddenInput: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === ',' || e.key === 'Enter') {
              e.preventDefault()
              onAddTag('forbiddenPhrases', 'forbiddenInput')
            }
          }}
          onBlur={() => onAddTag('forbiddenPhrases', 'forbiddenInput')}
        />
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
