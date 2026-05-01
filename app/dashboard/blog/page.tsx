'use client'

import { useMemo, useState } from 'react'
import { Bold, Italic, List, Link, Quote, Sparkles } from 'lucide-react'
import { BlogPanel } from '@/components/sections/BlogPanel'
import { PipelineStepper } from '@/components/ui/PipelineStepper'
import { useSessionContext } from '@/lib/context/SessionContext'
import { Button } from '@/components/ui/button'
import { getLatestAssetByType } from '@/lib/session-assets'
import type { SeoResult } from '@/types'
import { isTopicInputData } from '@/types'

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

interface UploadImprovementData {
  original: string
  improved: string
  changes: Array<{ type: string; description: string }>
}

export default function BlogPage() {
  const { inputType, applyImprovedArticle, improvedArticle, inputData, assets } = useSessionContext()
  const [focusedVersion, setFocusedVersion] = useState<'original' | 'improved'>('improved')
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null)

  const topicData = useMemo(() => {
    const researchAsset = getLatestAssetByType(assets, 'research')
    const seoAsset = getLatestAssetByType(assets, 'seo')

    if (
      !researchAsset
      || !seoAsset
      || inputType !== 'topic'
      || !isTopicInputData(inputData)
      || inputData.topic.trim().length === 0
    ) {
      return null
    }

    return {
      topic: inputData.topic.trim(),
      seo: seoAsset.content as unknown as SeoResult,
      research: researchAsset.content as unknown as ResearchOutput,
      tone: inputData.tone,
    }
  }, [assets, inputData, inputType])

  const uploadData = useMemo(() => {
    const improvedAsset = getLatestAssetByType(assets, 'improved')
    if (!improvedAsset) {
      return null
    }

    return improvedAsset.content as unknown as UploadImprovementData
  }, [assets])

  const handleToggleView = () => {
    setFocusedVersion((previous) => (previous === 'improved' ? 'original' : 'improved'))
  }

  const handleUseImprovedVersion = () => {
    if (!uploadData?.improved) {
      return
    }

    applyImprovedArticle(uploadData.improved)
    setFocusedVersion('improved')
    setSelectionNotice('Improved version is now the default input for downstream engines.')
  }

  const [showAIPanel, setShowAIPanel] = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Blog Editor</h2>
        <p className="mt-1 text-sm text-foreground-2">
          Draft full-length blog articles optimised for SEO and readability.
        </p>
      </div>

      <PipelineStepper current="blog" />

      {!topicData && !uploadData ? (
        <div className="rounded bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
          {inputType === 'upload'
            ? 'Upload an article first to generate improvements.'
            : 'Generate research and SEO assets first to draft the blog.'}
        </div>
      ) : inputType === 'upload' && uploadData ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleToggleView}>
              {focusedVersion === 'improved' ? 'Show Original' : 'Show Improved'}
            </Button>
            <Button onClick={handleUseImprovedVersion}>Use Improved Version</Button>
          </div>

          {selectionNotice ? (
            <p className="text-sm text-primary">{selectionNotice}</p>
          ) : improvedArticle ? (
            <p className="text-sm text-primary">Improved content is active for downstream engines.</p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div
              className={`rounded border p-4 ${focusedVersion === 'original' ? 'border-primary bg-primary/5' : 'border-border'}`}
            >
              <h3 className="mb-2 text-sm font-semibold text-foreground">Original</h3>
              <p className="whitespace-pre-wrap text-sm text-foreground">{uploadData.original}</p>
            </div>
            <div
              className={`rounded border p-4 ${focusedVersion === 'improved' ? 'border-primary bg-primary/5' : 'border-border'}`}
            >
              <h3 className="mb-2 text-sm font-semibold text-foreground">Improved</h3>
              <p className="whitespace-pre-wrap text-sm text-foreground">{uploadData.improved}</p>
            </div>
          </div>

          <div className="rounded border border-border p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">What Changed</h3>
            {uploadData.changes.length > 0 ? (
              <ul className="list-disc space-y-2 pl-5 text-sm text-foreground">
                {uploadData.changes.map((change, index) => (
                  <li key={`${change.type}-${index}`}>
                    <span className="font-medium capitalize">{change.type}:</span> {change.description}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No change summary was returned.</p>
            )}
          </div>
        </div>
      ) : topicData ? (
        <BlogPanel
          topic={topicData.topic}
          seo={topicData.seo}
          research={topicData.research}
          tone={topicData.tone}
        />
      ) : null}
    </div>
  )
}
