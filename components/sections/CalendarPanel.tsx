'use client'

import { useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSessionContext } from '@/lib/context/SessionContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type CalendarSlot = {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'
  platform: 'Blog' | 'LinkedIn' | 'Reddit' | 'X Thread' | 'Newsletter'
  route: string
  accentClass: string
  text: string
  generated: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function firstLine(value: string): string {
  return value.split('\n').map((line) => line.trim()).find(Boolean) ?? value.trim()
}

function clip(value: string, max = 180): string {
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (normalized.length <= max) {
    return normalized
  }
  return `${normalized.slice(0, max - 1)}...`
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function getAssetByType(
  assets: Array<{ assetType: string; content: Record<string, unknown> }>,
  assetType: string,
): Record<string, unknown> | null {
  const asset = [...assets].reverse().find((item) => item.assetType === assetType)
  return asset?.content ?? null
}

function getBlogSummary(content: Record<string, unknown> | null): string {
  if (!content) {
    return ''
  }

  const title = getString(content.title)
  const summary = getString(content.summary)
  const markdown = getString(content.markdown)
  const topic = getString(content.topic)

  if (title && summary) {
    return `${title} - ${summary}`
  }
  if (title) {
    return title
  }
  if (summary) {
    return summary
  }
  if (markdown) {
    const headline = markdown.match(/^#\s+(.+)$/m)?.[1] ?? firstLine(markdown)
    return headline
  }
  return topic
}

function getLinkedInSummary(content: Record<string, unknown> | null): string {
  if (!content) {
    return ''
  }

  return (
    getString(content.storytelling) ||
    getString(content.authority) ||
    getString(content.carousel)
  )
}

function getRedditSummary(content: Record<string, unknown> | null): string {
  if (!content) {
    return ''
  }

  return getString(content.post)
}

function getXSummary(content: Record<string, unknown> | null): string {
  if (!content) {
    return ''
  }

  const thread = Array.isArray(content.thread)
    ? content.thread.find((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : ''

  return (thread?.trim() ?? '') || getString(content.tweet)
}

function getNewsletterSummary(content: Record<string, unknown> | null): string {
  if (!content) {
    return ''
  }

  const subject = Array.isArray(content.subjectLines)
    ? content.subjectLines.find(
        (item): item is string => typeof item === 'string' && item.trim().length > 0,
      )
    : ''

  return subject?.trim() ?? ''
}

export function CalendarPanel() {
  const router = useRouter()
  const { assets } = useSessionContext()
  const [copied, setCopied] = useState(false)

  const normalizedAssets = useMemo(
    () =>
      assets
        .filter((asset) => isRecord(asset.content))
        .map((asset) => ({
          assetType: asset.assetType,
          content: asset.content,
        })),
    [assets],
  )

  const slots = useMemo<CalendarSlot[]>(() => {
    const blog = clip(getBlogSummary(getAssetByType(normalizedAssets, 'blog')))
    const linkedin = clip(getLinkedInSummary(getAssetByType(normalizedAssets, 'social_linkedin')))
    const reddit = clip(getRedditSummary(getAssetByType(normalizedAssets, 'social_reddit')))
    const xThread = clip(getXSummary(getAssetByType(normalizedAssets, 'social_x')))
    const newsletter = clip(
      getNewsletterSummary(getAssetByType(normalizedAssets, 'social_newsletter')),
    )

    return [
      {
        day: 'Monday',
        platform: 'Blog',
        route: '/dashboard/blog',
        accentClass: 'border-l-blue-600',
        text: blog,
        generated: blog.length > 0,
      },
      {
        day: 'Tuesday',
        platform: 'LinkedIn',
        route: '/dashboard/social/linkedin',
        accentClass: 'border-l-sky-600',
        text: linkedin,
        generated: linkedin.length > 0,
      },
      {
        day: 'Wednesday',
        platform: 'Reddit',
        route: '/dashboard/social/reddit',
        accentClass: 'border-l-orange-600',
        text: reddit,
        generated: reddit.length > 0,
      },
      {
        day: 'Thursday',
        platform: 'X Thread',
        route: '/dashboard/social/x',
        accentClass: 'border-l-black',
        text: xThread,
        generated: xThread.length > 0,
      },
      {
        day: 'Friday',
        platform: 'Newsletter',
        route: '/dashboard/social/newsletter',
        accentClass: 'border-l-emerald-600',
        text: newsletter,
        generated: newsletter.length > 0,
      },
    ]
  }, [normalizedAssets])

  const handleExportText = async () => {
    const lines = slots.map((slot) => `${slot.day}: ${slot.generated ? slot.text : 'Not generated'}`)
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Weekly Calendar</CardTitle>
          <CardDescription>Mon-Fri publishing plan from your current session assets.</CardDescription>
        </div>
        <Button type="button" variant="outline" onClick={handleExportText}>
          {copied ? (
            <>
              <Check className="mr-1 h-4 w-4 text-green-600" />
              Copied
            </>
          ) : (
            <>
              <Copy className="mr-1 h-4 w-4" />
              Export as Text
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-5">
          {slots.map((slot) => (
            <button
              key={slot.day}
              type="button"
              onClick={() => router.push(slot.route)}
              className={`rounded-lg border border-border border-l-4 ${slot.accentClass} bg-card p-4 text-left transition hover:bg-muted/40`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{slot.day}</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{slot.platform}</p>

              {slot.generated ? (
                <p className="mt-3 text-sm text-foreground">{slot.text}</p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Not generated.{' '}
                  <span className="font-medium text-primary underline underline-offset-2">Generate</span>
                </p>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}