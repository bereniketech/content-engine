'use client'

import React, { useMemo, useState, useRef } from 'react'
import { Copy, RefreshCw, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSessionContext } from '@/lib/context/SessionContext'
import type { SeoResult } from '@/types'
import type { TopicTone } from '@/types'

interface ResearchOutput {
  intent: 'informational' | 'commercial' | 'transactional'
  demand: 'high' | 'medium' | 'low'
  trend: 'rising' | 'stable' | 'declining'
  keywords: string[]
  faqs: Array<{ question: string; answer: string }>
  competitors: Array<{ name: string; url: string; strength: string }>
  gaps: string[]
  alternatives?: string[]
}

interface BlogPanelProps {
  topic: string
  seo: SeoResult
  research: ResearchOutput
  tone?: TopicTone
}

interface StreamEvent {
  text?: string
  done?: boolean
  error?: string
  markdown?: string
  wordCount?: number
  asset?: {
    id: string
    assetType: string
    content: Record<string, unknown>
    version: number
    createdAt: string
  }
}

const TONE_OPTIONS: Array<{ label: string; value: TopicTone }> = [
  { label: 'Authority', value: 'authority' },
  { label: 'Casual', value: 'casual' },
  { label: 'Storytelling', value: 'storytelling' },
]

function parseSSEChunk(chunk: string): StreamEvent[] {
  const events: StreamEvent[] = []
  const rawEvents = chunk.split('\n\n')

  for (const rawEvent of rawEvents) {
    const lines = rawEvent.split('\n').filter((line) => line.startsWith('data: '))
    if (lines.length === 0) {
      continue
    }

    const payload = lines.map((line) => line.slice(6)).join('')
    try {
      events.push(JSON.parse(payload) as StreamEvent)
    } catch {
      // Ignore malformed partial events and wait for complete buffered payload.
    }
  }

  return events
}

function extractH2Headings(content: string): string[] {
  const matches = content.match(/^##\s+(.+)$/gm) ?? []
  return matches.map((line) => line.replace(/^##\s+/, '').trim()).filter(Boolean)
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function replaceSectionInMarkdown(markdown: string, sectionTitle: string, sectionMarkdown: string): string {
  const safeTitle = escapeRegex(sectionTitle)
  const sectionPattern = new RegExp(`(^##\\s+${safeTitle}\\s*$)[\\s\\S]*?(?=^##\\s+|$)`, 'm')
  const normalizedSection = sectionMarkdown.trim().startsWith('## ')
    ? sectionMarkdown.trim()
    : `## ${sectionTitle}\n${sectionMarkdown.trim()}`

  return markdown.replace(sectionPattern, `${normalizedSection}\n\n`)
}

function getTextFromNode(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }

  if (Array.isArray(node)) {
    return node.map(getTextFromNode).join('')
  }

  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return getTextFromNode(node.props.children)
  }

  return ''
}

export const BlogPanel: React.FC<BlogPanelProps> = ({ topic, seo, research, tone = 'authority' }) => {
  const { sessionId, upsertAsset } = useSessionContext()
  const [markdown, setMarkdown] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [streamComplete, setStreamComplete] = useState(false)
  const [expandingSection, setExpandingSection] = useState<string | null>(null)
  const [selectedTone, setSelectedTone] = useState<TopicTone>(tone)
  const abortControllerRef = useRef<AbortController | null>(null)
  const h2Sections = useMemo(() => extractH2Headings(markdown), [markdown])

  const generateBlog = async () => {
    abortControllerRef.current?.abort()
    setMarkdown('')
    setError(null)
    setIsLoading(true)
    setWordCount(0)
    setStreamComplete(false)
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          topic,
          seo,
          research,
          tone: selectedTone,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error('Failed to generate blog')
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedMarkdown = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const completeEvents = buffer.split('\n\n')
        buffer = completeEvents.pop() ?? ''

        for (const rawEvent of completeEvents) {
          const parsedEvents = parseSSEChunk(rawEvent)
          for (const data of parsedEvents) {
            if (data.text) {
              accumulatedMarkdown += data.text
              setMarkdown(accumulatedMarkdown)
            }

            if (data.error) {
              throw new Error(data.error)
            }

            if (data.done) {
              const finalWordCount = data.wordCount ?? accumulatedMarkdown.trim().split(/\s+/).filter(Boolean).length
              setWordCount(finalWordCount)
              setStreamComplete(true)
              if (data.asset && typeof data.asset === 'object') {
                const asset = data.asset as {
                  id: string
                  assetType: string
                  content: Record<string, unknown>
                  version: number
                  createdAt: string
                }
                upsertAsset({
                  id: asset.id,
                  assetType: asset.assetType,
                  content: asset.content,
                  version: asset.version,
                  createdAt: asset.createdAt,
                })
              }
            }
          }
        }
      }

      setIsLoading(false)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Cancelled by user
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
      setIsLoading(false)
    }
  }

  const expandSection = async (sectionTitle: string) => {
    setExpandingSection(sectionTitle)

    try {
      const response = await fetch('/api/blog/expand', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sectionTitle,
          topic,
          context: markdown,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to expand section')
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let newSectionContent = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const completeEvents = buffer.split('\n\n')
        buffer = completeEvents.pop() ?? ''

        for (const rawEvent of completeEvents) {
          const parsedEvents = parseSSEChunk(rawEvent)
          for (const data of parsedEvents) {
            if (data.text) {
              newSectionContent += data.text
            }

            if (data.error) {
              throw new Error(data.error)
            }
          }
        }
      }

      const updatedMarkdown = replaceSectionInMarkdown(markdown, sectionTitle, newSectionContent)
      setMarkdown(updatedMarkdown)
      if (streamComplete) {
        setWordCount(updatedMarkdown.trim().split(/\s+/).filter(Boolean).length)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to expand section')
    } finally {
      setExpandingSection(null)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const H2WithExpand = ({ children }: { children: React.ReactNode }) => {
    const title = getTextFromNode(children).trim()

    const canExpand = Boolean(title) && h2Sections.includes(title)

    return (
      <div className="mt-6 mb-2 flex items-center justify-between gap-2 border-b pb-2">
        <h2 className="text-base font-semibold">{children}</h2>
        {canExpand && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => expandSection(title)}
            disabled={isLoading || expandingSection === title}
            className="h-7 px-2 text-xs"
          >
            {expandingSection === title ? (
              <>
                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                Expanding...
              </>
            ) : (
              <>
                <RefreshCw className="mr-1 h-3 w-3" />
                Expand section
              </>
            )}
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>Blog Article</CardTitle>
            <CardDescription>AI-generated article optimized for SEO</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedTone}
              onChange={(event) => setSelectedTone(event.target.value as TopicTone)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              disabled={isLoading}
            >
              {TONE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {markdown && (
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy full article
                  </>
                )}
              </Button>
            )}
            <Button onClick={generateBlog} disabled={isLoading} className="gap-2">
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {markdown && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {streamComplete && wordCount > 0 && <Badge variant="secondary">{wordCount} words</Badge>}
              {!streamComplete && isLoading && <Badge variant="outline">Streaming...</Badge>}
            </div>
          </div>
        )}

        {!markdown && !isLoading && (
          <div className="rounded bg-muted p-8 text-center text-muted-foreground">
            Click Generate to create your blog article
          </div>
        )}

        {isLoading && !markdown && (
          <div className="rounded bg-muted p-8 text-center text-muted-foreground">
            <div className="animate-pulse">Generating blog article...</div>
          </div>
        )}

        {markdown && (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="space-y-4 text-sm leading-relaxed">
              <ReactMarkdown
                components={{
                  h2: ({ children }) => <H2WithExpand>{children}</H2WithExpand>,
                }}
              >
                {markdown}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
