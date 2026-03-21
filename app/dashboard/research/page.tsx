'use client'

import { useState, FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ResearchPanel } from '@/components/sections/ResearchPanel'
import { useSessionContext } from '@/lib/context/SessionContext'

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
  const { sessionId } = useSessionContext()
  const [formData, setFormData] = useState({
    topic: '',
    audience: '',
    geography: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [researchData, setResearchData] = useState<ResearchData | null>(null)

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Research</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate in-depth research reports on any topic.
        </p>
      </div>

      {/* Research Form */}
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

      {/* Research Results */}
      <ResearchPanel data={researchData} isLoading={isLoading} onUseAlternative={handleUseAlternative} />
    </div>
  )
}
