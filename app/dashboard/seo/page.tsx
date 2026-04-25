'use client'

import { useMemo, useState, FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SEOPanel } from '@/components/sections/SEOPanel'
import { useSessionContext } from '@/lib/context/SessionContext'
import { getLatestAssetByType } from '@/lib/session-assets'
import type { SeoResult } from '@/types'

interface SeoData {
  id: string
  sessionId: string
  assetType: string
  content: SeoResult & { topic: string; keywords: string[] }
  version: number
  createdAt: string
}

export default function SEOPage() {
  const { sessionId, assets, upsertAsset } = useSessionContext()
  const [keywords, setKeywords] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [seoData, setSeoData] = useState<SeoData | null>(null)

  // Get research data from sessionStorage or state
  const researchData = useMemo(() => {
    const researchAsset = getLatestAssetByType(assets, 'research')
    if (!researchAsset) {
      return null
    }

    return researchAsset.content as {
    topic: string
    intent: string
    demand: string
    trend: string
    keywords: string[]
    faqs: Array<{ question: string; answer: string }>
    competitors: Array<{ name: string; url: string; strength: string }>
    gaps: string[]
    }
  }, [assets])

  const handleGenerateSeo = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (!researchData) {
        setError('Research data is required. Please run research analysis first.')
        setIsLoading(false)
        return
      }

      const keywordArray = keywords
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0)

      const response = await fetch('/api/seo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          topic: researchData.topic,
          research: researchData,
          keywords: keywordArray,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to generate SEO')
      }

      const result = await response.json()
      setSeoData(result.data)
      upsertAsset({
        id: result.data.id,
        assetType: result.data.assetType,
        content: result.data.content,
        version: result.data.version,
        createdAt: result.data.createdAt,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">SEO</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate keyword targets, meta descriptions, and structured data.
        </p>
      </div>

      {/* Input Form */}
      {!seoData && (
        <Card>
          <CardHeader>
            <CardTitle>Generate SEO Analysis</CardTitle>
            <CardDescription>Requires research data to optimize for SEO</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerateSeo} className="space-y-6">
              {/* Research Data Section */}
              <div className="space-y-3">
                <label className="block text-sm font-medium">Research Data</label>
                {!researchData ? (
                  <div className="rounded border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                    Run the research engine first to generate SEO insights for the active session.
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                    <p className="font-medium text-green-900">✓ Research loaded</p>
                    <p className="text-green-800 text-xs mt-1">Topic: {researchData.topic}</p>
                  </div>
                )}
              </div>

              {/* Keywords Input */}
              <div className="space-y-3">
                <label htmlFor="keywords" className="block text-sm font-medium">
                  Additional Keywords (optional)
                </label>
                <textarea
                  id="keywords"
                  placeholder="Enter keywords separated by commas (e.g., keyword1, keyword2, keyword3)"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full h-24 px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || !researchData}
                className="w-full"
              >
                {isLoading ? 'Generating SEO Analysis...' : 'Generate SEO Analysis'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Results Panel */}
      {seoData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">SEO Results</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Optimizations for: {seoData.content.topic}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSeoData(null)
                setKeywords('')
              }}
            >
              Generate New
            </Button>
          </div>
          <SEOPanel data={seoData.content} />
        </div>
      )}
    </div>
  )
}
