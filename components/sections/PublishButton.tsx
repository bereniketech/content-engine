'use client'

import { useState } from 'react'
import { Check, Loader2, AlertCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAuthToken } from '@/lib/auth-browser'
import { PUBLISH_ENDPOINT_MAP } from '@/lib/platform-config'

type PublishState = 'idle' | 'loading' | 'success' | 'error' | 'already_published'

interface PublishButtonProps {
  platform: 'x' | 'linkedin' | 'instagram' | 'reddit' | 'newsletter' | 'newsletter_mailchimp' | 'newsletter_sendgrid'
  sessionId: string
  payload: Record<string, unknown>
  label?: string
  onSuccess?: (data: { externalId?: string; campaignId?: string; logId: string }) => void
  onError?: (error: string) => void
}

export function PublishButton({
  platform,
  sessionId,
  payload,
  label,
  onSuccess,
  onError,
}: PublishButtonProps) {
  const [state, setState] = useState<PublishState>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [publishedAt, setPublishedAt] = useState<string>('')

  const handlePublish = async () => {
    if (state === 'loading') return
    setState('loading')
    setErrorMessage('')

    const token = await getAuthToken()
    if (!token) {
      setState('error')
      setErrorMessage('Not authenticated — please sign in.')
      return
    }

    const endpoint = PUBLISH_ENDPOINT_MAP[platform]
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId, ...payload }),
      })

      const json = await response.json()

      if (response.status === 409) {
        setState('already_published')
        return
      }

      if (!response.ok) {
        const msg = json?.error?.message ?? `Error ${response.status}`
        setState('error')
        setErrorMessage(msg)
        onError?.(msg)
        return
      }

      setPublishedAt(new Date().toLocaleTimeString())
      setState('success')
      onSuccess?.(json.data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error'
      setState('error')
      setErrorMessage(msg)
      onError?.(msg)
    }
  }

  const handleRetry = () => {
    setState('idle')
    setErrorMessage('')
  }

  const buttonLabel = label ?? `Post to ${platform === 'x' ? 'X' : platform.charAt(0).toUpperCase() + platform.slice(1)}`

  if (state === 'success') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
        <Check className="h-4 w-4 flex-shrink-0" />
        <span>Posted at {publishedAt}</span>
      </div>
    )
  }

  if (state === 'already_published') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
        <Check className="h-4 w-4 flex-shrink-0" />
        <span>Already posted</span>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="line-clamp-1">{errorMessage}</span>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <Button
      type="button"
      variant="default"
      size="sm"
      onClick={handlePublish}
      disabled={state === 'loading'}
    >
      {state === 'loading' ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Posting...
        </>
      ) : (
        <>
          <Send className="mr-2 h-4 w-4" />
          {buttonLabel}
        </>
      )}
    </Button>
  )
}
