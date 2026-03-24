'use client'

import { useState, useEffect } from 'react'
import { BlogPanel } from '@/components/sections/BlogPanel'
import { useSessionContext } from '@/lib/context/SessionContext'
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

export default function BlogPage() {
  const { sessionId } = useSessionContext()
  const [data, setData] = useState<{
    topic: string
    seo: SeoResult
    research: ResearchOutput
    tone: 'authority' | 'casual' | 'storytelling'
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Try to load data from sessionStorage
    const loadData = () => {
      try {
        const stored = sessionStorage.getItem('blogData')
        if (stored) {
          setData(JSON.parse(stored))
          setError(null)
        } else {
          setError('Please generate research and SEO data first')
        }
      } catch (err) {
        setError('Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

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
