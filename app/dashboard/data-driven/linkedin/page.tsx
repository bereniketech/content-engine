'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSessionContext } from '@/lib/context/SessionContext'
import { getLatestAssetByType } from '@/lib/session-assets'
import { isRecord } from '@/lib/type-guards'

interface LinkedInAssetContent {
  article: string
}

function parseLinkedInAssetContent(value: unknown): LinkedInAssetContent | null {
  if (!isRecord(value) || typeof value.article !== 'string') {
    return null
  }

  return { article: value.article }
}

export default function DataDrivenLinkedInPage() {
  const { assets } = useSessionContext()
  const [copyNotice, setCopyNotice] = useState<string | null>(null)

  const linkedInContent = useMemo(() => {
    const asset = getLatestAssetByType(assets, 'dd_linkedin')
    return parseLinkedInAssetContent(asset?.content)
  }, [assets])

  const handleCopy = async () => {
    if (!linkedInContent?.article) {
      return
    }

    try {
      await navigator.clipboard.writeText(linkedInContent.article)
      setCopyNotice('LinkedIn article copied.')
    } catch {
      setCopyNotice('Copy failed. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">Data-Driven LinkedIn</h2>
        <p className="text-sm text-muted-foreground">
          Review and copy your LinkedIn-ready article draft.
        </p>
      </div>

      {!linkedInContent ? (
        <Card>
          <CardHeader>
            <CardTitle>No content yet</CardTitle>
            <CardDescription>Run the pipeline distribution step to generate dd_linkedin output.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>LinkedIn Article</CardTitle>
                <CardDescription>Line breaks are preserved for platform-native formatting.</CardDescription>
              </div>

              <Button type="button" onClick={handleCopy}>
                Copy LinkedIn Article
              </Button>
            </div>
            {copyNotice ? <p className="text-sm text-muted-foreground">{copyNotice}</p> : null}
          </CardHeader>

          <CardContent>
            <p className="whitespace-pre-wrap rounded border bg-muted/20 p-4 text-sm text-foreground">
              {linkedInContent.article}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
