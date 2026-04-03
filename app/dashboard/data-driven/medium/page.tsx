'use client'

import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSessionContext } from '@/lib/context/SessionContext'
import { getLatestAssetByType } from '@/lib/session-assets'

interface MediumAssetContent {
  article: string
  subtitle: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseMediumAssetContent(value: unknown): MediumAssetContent | null {
  if (!isRecord(value) || typeof value.article !== 'string' || typeof value.subtitle !== 'string') {
    return null
  }

  return {
    article: value.article,
    subtitle: value.subtitle,
  }
}

export default function DataDrivenMediumPage() {
  const { assets } = useSessionContext()
  const [copyNotice, setCopyNotice] = useState<string | null>(null)

  const mediumContent = useMemo(() => {
    const asset = getLatestAssetByType(assets, 'dd_medium')
    return parseMediumAssetContent(asset?.content)
  }, [assets])

  const handleCopy = async () => {
    if (!mediumContent?.article) {
      return
    }

    try {
      await navigator.clipboard.writeText(mediumContent.article)
      setCopyNotice('Medium article copied.')
    } catch {
      setCopyNotice('Copy failed. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">Data-Driven Medium</h2>
        <p className="text-sm text-muted-foreground">
          Review your long-form article with subtitle and markdown rendering.
        </p>
      </div>

      {!mediumContent ? (
        <Card>
          <CardHeader>
            <CardTitle>No content yet</CardTitle>
            <CardDescription>Run the pipeline distribution step to generate dd_medium output.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>Medium Article</CardTitle>
                <CardDescription>{mediumContent.subtitle}</CardDescription>
              </div>

              <Button type="button" onClick={handleCopy}>
                Copy Medium Article
              </Button>
            </div>
            {copyNotice ? <p className="text-sm text-muted-foreground">{copyNotice}</p> : null}
          </CardHeader>

          <CardContent>
            <div className="prose prose-neutral max-w-none rounded border bg-muted/20 p-4">
              <ReactMarkdown>{mediumContent.article}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
