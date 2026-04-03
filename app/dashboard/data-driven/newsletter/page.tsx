'use client'

import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSessionContext } from '@/lib/context/SessionContext'
import { getLatestAssetByType } from '@/lib/session-assets'

interface NewsletterAssetContent {
  subjectLine: string
  previewText: string
  body: string
  plainText: string
}

type NewsletterViewMode = 'markdown' | 'plain-text'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseNewsletterAssetContent(value: unknown): NewsletterAssetContent | null {
  if (
    !isRecord(value)
    || typeof value.subjectLine !== 'string'
    || typeof value.previewText !== 'string'
    || typeof value.body !== 'string'
    || typeof value.plainText !== 'string'
  ) {
    return null
  }

  return {
    subjectLine: value.subjectLine,
    previewText: value.previewText,
    body: value.body,
    plainText: value.plainText,
  }
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderInlineMarkdownToHtml(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
}

function convertMarkdownToHtml(markdown: string): string {
  const lines = markdown.split('\n')
  const htmlLines: string[] = []
  let isInList = false

  const closeListIfOpen = () => {
    if (isInList) {
      htmlLines.push('</ul>')
      isInList = false
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      closeListIfOpen()
      continue
    }

    const escapedLine = escapeHtml(line)
    const withInlineFormatting = renderInlineMarkdownToHtml(escapedLine)

    if (line.startsWith('### ')) {
      closeListIfOpen()
      htmlLines.push(`<h3>${withInlineFormatting.slice(4)}</h3>`)
      continue
    }

    if (line.startsWith('## ')) {
      closeListIfOpen()
      htmlLines.push(`<h2>${withInlineFormatting.slice(3)}</h2>`)
      continue
    }

    if (line.startsWith('# ')) {
      closeListIfOpen()
      htmlLines.push(`<h1>${withInlineFormatting.slice(2)}</h1>`)
      continue
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!isInList) {
        htmlLines.push('<ul>')
        isInList = true
      }

      htmlLines.push(`<li>${withInlineFormatting.slice(2)}</li>`)
      continue
    }

    closeListIfOpen()
    htmlLines.push(`<p>${withInlineFormatting}</p>`)
  }

  closeListIfOpen()
  return htmlLines.join('\n')
}

function buildNewsletterHtml(content: NewsletterAssetContent): string {
  const subject = escapeHtml(content.subjectLine)
  const preview = escapeHtml(content.previewText)
  const body = convertMarkdownToHtml(content.body)

  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width,initial-scale=1" />',
    `  <title>${subject}</title>`,
    '</head>',
    '<body style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">',
    `  <p style="opacity: 0.75;">${preview}</p>`,
    `  <div>${body}</div>`,
    '</body>',
    '</html>',
  ].join('\n')
}

export default function DataDrivenNewsletterPage() {
  const { assets } = useSessionContext()
  const [viewMode, setViewMode] = useState<NewsletterViewMode>('markdown')
  const [copyNotice, setCopyNotice] = useState<string | null>(null)

  const newsletterContent = useMemo(() => {
    const asset = getLatestAssetByType(assets, 'dd_newsletter')
    return parseNewsletterAssetContent(asset?.content)
  }, [assets])

  const copySection = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyNotice(`${label} copied.`)
    } catch {
      setCopyNotice('Copy failed. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">Data-Driven Newsletter</h2>
        <p className="text-sm text-muted-foreground">
          Review and copy subject, preview, and newsletter body in markdown or plain text view.
        </p>
      </div>

      {!newsletterContent ? (
        <Card>
          <CardHeader>
            <CardTitle>No content yet</CardTitle>
            <CardDescription>Run the pipeline distribution step to generate dd_newsletter output.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant={viewMode === 'markdown' ? 'default' : 'outline'} onClick={() => setViewMode('markdown')}>
                  Markdown View
                </Button>
                <Button type="button" variant={viewMode === 'plain-text' ? 'default' : 'outline'} onClick={() => setViewMode('plain-text')}>
                  Plain Text View
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => copySection(buildNewsletterHtml(newsletterContent), 'Full HTML')}
                >
                  Copy Full HTML
                </Button>
              </div>
              {copyNotice ? <p className="text-sm text-muted-foreground">{copyNotice}</p> : null}
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="space-y-3">
                <CardTitle>Subject Line</CardTitle>
                <Button type="button" variant="outline" onClick={() => copySection(newsletterContent.subjectLine, 'Subject line')}>
                  Copy Subject
                </Button>
              </CardHeader>
              <CardContent>
                <p className="rounded border bg-muted/20 p-3 text-sm">{newsletterContent.subjectLine}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="space-y-3">
                <CardTitle>Preview Text</CardTitle>
                <Button type="button" variant="outline" onClick={() => copySection(newsletterContent.previewText, 'Preview text')}>
                  Copy Preview
                </Button>
              </CardHeader>
              <CardContent>
                <p className="rounded border bg-muted/20 p-3 text-sm">{newsletterContent.previewText}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>Newsletter Body</CardTitle>
                  <CardDescription>
                    {viewMode === 'markdown' ? 'Markdown rendering' : 'Plain-text fallback'}
                  </CardDescription>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => copySection(viewMode === 'markdown' ? newsletterContent.body : newsletterContent.plainText, 'Body')}
                >
                  Copy Body
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'markdown' ? (
                <div className="prose prose-neutral max-w-none rounded border bg-muted/20 p-4">
                  <ReactMarkdown>{newsletterContent.body}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap rounded border bg-muted/20 p-4 text-sm">
                  {newsletterContent.plainText}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
