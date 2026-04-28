'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSupabaseBrowserClient } from '@/lib/supabase'

interface URLIngestionInputProps {
  onSuccess: (sessionId: string, preview: string) => void
  onError: (message: string) => void
}

interface IngestResponse {
  data?: { sessionId: string; preview: string; wordCount: number; assetId: string }
  error?: { message: string }
}

export function URLIngestionInput({ onSuccess, onError }: URLIngestionInputProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [inlineError, setInlineError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!url.trim()) {
      setInlineError('Please enter a URL')
      return
    }

    setLoading(true)
    setInlineError(null)
    setPreview(null)

    try {
      const supabase = getSupabaseBrowserClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ url: url.trim() }),
      })

      const json = (await response.json()) as IngestResponse

      if (!response.ok || !json.data) {
        const message = json.error?.message ?? 'Ingestion failed'
        setInlineError(message)
        onError(message)
        return
      }

      setPreview(json.data.preview)
      onSuccess(json.data.sessionId, json.data.preview)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process URL'
      setInlineError(message)
      onError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="ingest-url">
          URL
        </label>
        <input
          id="ingest-url"
          data-testid="url-input"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste YouTube URL, audio URL, or web page URL"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring transition focus:ring-2"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleSubmit()
            }
          }}
          disabled={loading}
        />
      </div>

      <Button onClick={() => void handleSubmit()} disabled={loading || !url.trim()}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing…
          </>
        ) : (
          'Process URL'
        )}
      </Button>

      {inlineError && (
        <p data-testid="url-error" className="text-sm text-destructive">{inlineError}</p>
      )}

      {preview && !inlineError && (
        <div data-testid="url-preview" className="rounded-md border bg-muted p-3 text-sm text-muted-foreground whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
          {preview}
        </div>
      )}
    </div>
  )
}
