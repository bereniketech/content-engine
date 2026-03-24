'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSessionContext } from '@/lib/context/SessionContext'

interface FlywheelIdea {
  topic: string
  keywords: string[]
  cluster: string
}

export function FlywheelPanel() {
  const { prefillTopicForm } = useSessionContext()
  const [topic, setTopic] = useState('')
  const [keywordsRaw, setKeywordsRaw] = useState('')
  const [ideas, setIdeas] = useState<FlywheelIdea[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null)

  const handleGenerate = async () => {
    setError(null)
    setIsLoading(true)

    try {
      const keywords = keywordsRaw
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)

      const response = await fetch('/api/flywheel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), keywords }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Failed to generate flywheel ideas')
      }

      const result = payload?.data?.ideas as FlywheelIdea[] | undefined
      if (!result || !Array.isArray(result)) {
        throw new Error('Malformed flywheel response')
      }

      setIdeas(result)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to generate flywheel ideas')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUseTopic = (idea: FlywheelIdea) => {
    prefillTopicForm(idea.topic, idea.keywords)
    setSelectionMessage(`Prefilled topic form with: ${idea.topic}`)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Content Flywheel Engine</CardTitle>
          <CardDescription>
            Generate related topic clusters to build compounding content momentum.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="flywheel-topic">
              Seed Topic
            </label>
            <input
              id="flywheel-topic"
              type="text"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring transition focus:ring-2"
              placeholder="e.g. AI content strategy"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="flywheel-keywords">
              Keywords (comma separated)
            </label>
            <input
              id="flywheel-keywords"
              type="text"
              value={keywordsRaw}
              onChange={(event) => setKeywordsRaw(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring transition focus:ring-2"
              placeholder="e.g. topical authority, content clusters, internal linking"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button onClick={handleGenerate} disabled={isLoading || topic.trim().length === 0}>
            {isLoading ? 'Generating Flywheel...' : 'Generate Flywheel Ideas'}
          </Button>

          {selectionMessage ? <p className="text-sm text-primary">{selectionMessage}</p> : null}
        </CardContent>
      </Card>

      {ideas.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ideas.map((idea, index) => (
            <Card key={`${idea.topic}-${index}`}>
              <CardHeader>
                <CardTitle className="text-base leading-snug">{idea.topic}</CardTitle>
                <CardDescription>{idea.cluster}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {idea.keywords.map((keyword) => (
                    <Badge key={`${idea.topic}-${keyword}`} variant="outline">
                      {keyword}
                    </Badge>
                  ))}
                </div>

                <Button onClick={() => handleUseTopic(idea)} className="w-full" variant="outline">
                  Use this topic
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  )
}
