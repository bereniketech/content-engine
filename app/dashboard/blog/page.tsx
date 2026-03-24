'use client'

import { useState, useEffect } from 'react'
import { BlogPanel } from '@/components/sections/BlogPanel'
import { useSessionContext } from '@/lib/context/SessionContext'
import { Button } from '@/components/ui/button'
import type { SeoResult } from '@/app/api/seo/route'

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
  const { inputType, applyImprovedArticle, improvedArticle } = useSessionContext()
  const [mode, setMode] = useState<'topic' | 'upload' | null>(null)
  const [data, setData] = useState<{
    topic: string
    seo: SeoResult
    research: ResearchOutput
    tone: 'authority' | 'casual' | 'storytelling'
  } | null>(null)
  const [uploadData, setUploadData] = useState<UploadImprovementData | null>(null)
  const [focusedVersion, setFocusedVersion] = useState<'original' | 'improved'>('improved')
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = () => {
      try {
        const storedUpload = sessionStorage.getItem('uploadImprovement')

        if (inputType === 'upload' || storedUpload) {
          if (storedUpload) {
            setUploadData(JSON.parse(storedUpload) as UploadImprovementData)
          }
          const activeArticle = sessionStorage.getItem('activeUploadArticle')
          setFocusedVersion(activeArticle ? 'improved' : 'original')
          setMode('upload')
          setError(storedUpload ? null : 'Upload an article first to generate improvements.')
          return
        }

        const storedTopic = sessionStorage.getItem('blogData')
        if (storedTopic) {
          setData(JSON.parse(storedTopic))
          setMode('topic')
          setError(null)
        } else {
          setMode(null)
          setError('Please generate research and SEO data first')
        }
      } catch {
        setMode(null)
        setError('Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [inputType])

  const handleToggleView = () => {
    setFocusedVersion((previous) => (previous === 'improved' ? 'original' : 'improved'))
  }

  const handleUseImprovedVersion = () => {
    if (!uploadData?.improved) {
      return
    }

    applyImprovedArticle(uploadData.improved)
    sessionStorage.setItem('activeUploadArticle', uploadData.improved)
    setFocusedVersion('improved')
    setSelectionNotice('Improved version is now the default input for downstream engines.')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Blog</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Draft full-length blog articles optimised for SEO and readability.
        </p>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : error ? (
        <div className="rounded bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
          {error}
        </div>
      ) : mode === 'upload' && uploadData ? (
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
      ) : data ? (
        <BlogPanel
          topic={data.topic}
          seo={data.seo}
          research={data.research}
          tone={data.tone}
        />
      ) : null}
    </div>
  )
}
