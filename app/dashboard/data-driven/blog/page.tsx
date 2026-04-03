'use client'

import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSessionContext } from '@/lib/context/SessionContext'
import { getLatestAssetByType } from '@/lib/session-assets'

interface BlogAssetContent {
  markdown: string
  wordCount?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseBlogAssetContent(value: unknown): BlogAssetContent | null {
  if (!isRecord(value) || typeof value.markdown !== 'string') {
    return null
  }

  return {
    markdown: value.markdown,
    wordCount: typeof value.wordCount === 'number' ? value.wordCount : undefined,
  }
}

export default function DataDrivenBlogPage() {
  const { assets } = useSessionContext()
  const [copyNotice, setCopyNotice] = useState<string | null>(null)

  const blogContent = useMemo(() => {
    const asset = getLatestAssetByType(assets, 'dd_blog')
    return parseBlogAssetContent(asset?.content)
  }, [assets])

  const handleCopy = async () => {
    if (!blogContent?.markdown) {
      return
    }

    try {
      await navigator.clipboard.writeText(blogContent.markdown)
      setCopyNotice('Blog markdown copied.')
    } catch {
      setCopyNotice('Copy failed. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">Data-Driven Blog</h2>
        <p className="text-sm text-muted-foreground">
          Review and copy your generated markdown article.
        </p>
      </div>

      {!blogContent ? (
        <Card>
          <CardHeader>
            <CardTitle>No content yet</CardTitle>
            <CardDescription>Run the pipeline distribution step to generate dd_blog output.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Markdown Output</CardTitle>
                <CardDescription>
                  {typeof blogContent.wordCount === 'number'
                    ? `${blogContent.wordCount} words`
                    : 'Word count unavailable'}
                </CardDescription>
              </div>

              <Button type="button" onClick={handleCopy}>
                Copy Markdown
              </Button>
            </div>
            {copyNotice ? <p className="text-sm text-muted-foreground">{copyNotice}</p> : null}
          </CardHeader>

          <CardContent>
            <div className="prose prose-neutral max-w-none rounded border bg-muted/20 p-4">
              <ReactMarkdown>{blogContent.markdown}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
