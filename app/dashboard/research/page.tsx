'use client'

import { useEffect, useState, FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PipelineStepper } from '@/components/ui/PipelineStepper'
import { ResearchPanel } from '@/components/sections/ResearchPanel'
import { useSessionContext } from '@/lib/context/SessionContext'
import { EmptyState } from '@/components/ui/EmptyState'
import { isTopicInputData } from '@/types'
import { cn } from '@/lib/utils'

interface ResearchData {
  id: string
  sessionId: string
  assetType: string
  content: {
    topic: string
    audience: string
    geography?: string
    intent: 'informational' | 'commercial' | 'transactional'
    demand: 'high' | 'medium' | 'low'
    trend: 'rising' | 'stable' | 'declining'
    keywords: string[]
    faqs: Array<{ question: string; answer: string }>
    competitors: Array<{ name: string; url: string; strength: string }>
    gaps: string[]
    alternatives?: string[]
  }
  version: number
  createdAt: string
}

export default function ResearchPage() {
  const { sessionId, inputData, inputType, upsertAsset } = useSessionContext()
  const [formData, setFormData] = useState({
    topic: '',
    audience: '',
    geography: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [researchData, setResearchData] = useState<ResearchData | null>(null)
  const [activeSubTab, setActiveSubTab] = useState<'keywords' | 'competitors' | 'content-brief'>('keywords')

  useEffect(() => {
    if (inputType === 'topic' && isTopicInputData(inputData)) {
      setFormData((current) => ({
        ...current,
        topic: inputData.topic,
        audience: inputData.audience,
        geography: inputData.geography ?? '',
      }))
    }
  }, [inputData, inputType])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (!formData.topic.trim()) {
        setError('Topic is required')
        setIsLoading(false)
        return
      }

      if (!formData.audience.trim()) {
        setError('Audience is required')
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          topic: formData.topic.trim(),
          audience: formData.audience.trim(),
          geography: formData.geography?.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to generate research')
      }

      const result = await response.json()
      setResearchData(result.data)
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

  const handleUseAlternative = async (topic: string) => {
    setFormData((prev) => ({ ...prev, topic }))
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          topic,
          audience: formData.audience,
          geography: formData.geography || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to generate research')
      }

      const result = await response.json()
      setResearchData(result.data)
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

  function getKDColor(score: number): string {
    if (score > 60) return 'text-destructive font-semibold'
    if (score >= 40) return 'text-warning font-semibold'
    return 'text-primary font-semibold'
  }

  if (!sessionId) {
    return (
      <EmptyState
        title="No active session"
        description="Return to the dashboard to start or resume a content generation session."
        action={{ label: 'Go to Dashboard', href: '/dashboard' }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Research</h2>
        <p className="mt-1 text-sm text-foreground-2">
          Generate in-depth research reports on any topic.
        </p>
      </div>

      <PipelineStepper current="research" />

      {/* Sub-tabs */}
      <div className="border-b border-foreground-4/60 flex gap-0">
        {(['keywords', 'competitors', 'content-brief'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeSubTab === tab
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-foreground-3 hover:text-foreground-2"
            )}
          >
            {tab === 'keywords' ? 'Keywords' : tab === 'competitors' ? 'Competitors' : 'Content Brief'}
          </button>
        ))}
      </div>

      {/* Research Form */}
      {activeSubTab === 'content-brief' && researchData && (
        <Card className="bg-card rounded-lg shadow-md">
          <CardHeader><CardTitle>Content Brief</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {researchData.content.gaps.map((gap, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-md hover:bg-surface-low transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <p className="text-sm text-foreground">{gap}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeSubTab === 'competitors' && researchData && (
        <Card className="bg-card rounded-lg shadow-md">
          <CardHeader><CardTitle>Competitors</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {researchData.content.competitors.map((comp, i) => (
                <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-md hover:bg-surface-low transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{comp.name}</p>
                    <p className="text-xs text-foreground-3">{comp.url}</p>
                    <p className="text-xs text-foreground-2 mt-0.5">{comp.strength}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeSubTab === 'keywords' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Topic Analysis</CardTitle>
              <CardDescription>Enter a topic to analyze demand, trends, and content gaps</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground" htmlFor="topic">
                    Topic
                  </label>
                  <input
                    id="topic"
                    type="text"
                    value={formData.topic}
                    onChange={(e) => setFormData((prev) => ({ ...prev, topic: e.target.value }))}
                    className="w-full mt-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring transition focus:ring-2"
                    placeholder="e.g., AI content creation for marketers"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground" htmlFor="audience">
                    Target Audience
                  </label>
                  <input
                    id="audience"
                    type="text"
                    value={formData.audience}
                    onChange={(e) => setFormData((prev) => ({ ...prev, audience: e.target.value }))}
                    className="w-full mt-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring transition focus:ring-2"
                    placeholder="e.g., Content marketers and creators"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground" htmlFor="geography">
                    Geography (Optional)
                  </label>
                  <input
                    id="geography"
                    type="text"
                    value={formData.geography}
                    onChange={(e) => setFormData((prev) => ({ ...prev, geography: e.target.value }))}
                    className="w-full mt-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring transition focus:ring-2"
                    placeholder="e.g., United States"
                  />
                </div>

                {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'Running Research...' : 'Run Research'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <ResearchPanel data={researchData} isLoading={isLoading} onUseAlternative={handleUseAlternative} />
        </>
      )}
    </div>
  )
}
