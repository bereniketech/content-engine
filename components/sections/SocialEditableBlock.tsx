'use client'

import { useState } from 'react'
import { Check, Copy, Pencil, RefreshCw, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SocialEditableBlockProps {
  title: string
  value: string
  onSave: (nextValue: string) => void
  onRegenerate: () => Promise<void>
  isRegenerating?: boolean
  rows?: number
}

export function SocialEditableBlock({
  title,
  value,
  onSave,
  onRegenerate,
  isRegenerating = false,
  rows = 4,
}: SocialEditableBlockProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleSave = () => {
    onSave(draft.trim())
    setIsEditing(false)
  }

  const handleCancel = () => {
    setDraft(value)
    setIsEditing(false)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditing ? (
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={rows}
            className="w-full rounded-md border border-input bg-background p-3 text-sm"
          />
        ) : (
          <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm leading-relaxed">{value || 'No content yet.'}</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>

          {!isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => {
                setDraft(value)
                setIsEditing(true)
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}

          {isEditing && (
            <>
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={handleSave}>
                <Save className="h-3.5 w-3.5" />
                Save
              </Button>
              <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={handleCancel}>
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
            </>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            <RefreshCw className={isRegenerating ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
            Regenerate
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
