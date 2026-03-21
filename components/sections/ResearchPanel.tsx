'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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

export interface ResearchPanelProps {
  data: ResearchData | null
  isLoading?: boolean
  onUseAlternative?: (topic: string) => void
}

const getIntentColor = (intent: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  const colors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    informational: 'default',
    commercial: 'secondary',
    transactional: 'destructive',
  }
  return colors[intent] || 'outline'
}

const getDemandColor = (demand: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  const colors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    high: 'default',
    medium: 'secondary',
    low: 'destructive',
  }
  return colors[demand] || 'outline'
}

const getTrendColor = (trend: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  const colors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    rising: 'default',
    stable: 'secondary',
    declining: 'destructive',
  }
  return colors[trend] || 'outline'
}

export function ResearchPanel({ data, isLoading = false, onUseAlternative }: ResearchPanelProps) {
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Loading research...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8 text-muted-foreground">
            Run a research analysis to see results here
          </div>
        </CardContent>
      </Card>
    )
  }

  const { content } = data

  return (
    <div className="space-y-6">
      {/* Overview Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Research Overview</CardTitle>
          <CardDescription>Topic: {content.topic}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Intent:</span>
              <Badge variant={getIntentColor(content.intent)}>
                {content.intent}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Demand:</span>
              <Badge variant={getDemandColor(content.demand)}>
                {content.demand}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Trend:</span>
              <Badge variant={getTrendColor(content.trend)}>
                {content.trend}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keywords */}
      <Card>
        <CardHeader>
          <CardTitle>Related Keywords</CardTitle>
          <CardDescription>Search terms and keyword clusters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {content.keywords.map((keyword, index) => (
              <Badge key={index} variant="outline">
                {keyword}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Competitors */}
      <Card>
        <CardHeader>
          <CardTitle>Competitor Analysis</CardTitle>
          <CardDescription>Top competitors and their strengths</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {content.competitors.map((competitor, index) => (
              <div key={index} className="border-b pb-4 last:border-b-0">
                <h4 className="font-semibold text-sm">{competitor.name}</h4>
                <p className="text-xs text-muted-foreground mt-1 mb-2">{competitor.url}</p>
                <p className="text-sm">{competitor.strength}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Content Gaps */}
      <Card>
        <CardHeader>
          <CardTitle>Content Gaps</CardTitle>
          <CardDescription>Unexplored angles and opportunities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {content.gaps.map((gap, index) => (
              <div key={index} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id={`gap-${index}`}
                  className="mt-1 rounded border-border cursor-pointer"
                  disabled
                />
                <label htmlFor={`gap-${index}`} className="text-sm cursor-pointer flex-1">
                  {gap}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FAQs */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>Common questions from your target audience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {content.faqs.map((faq, index) => (
              <div key={index} className="border rounded-lg">
                <button
                  className="w-full px-4 py-3 text-left font-semibold text-sm hover:bg-muted/50 transition-colors flex items-center justify-between"
                  onClick={() => setExpandedFaqIndex(expandedFaqIndex === index ? null : index)}
                >
                  <span>{faq.question}</span>
                  <span className="text-lg">{expandedFaqIndex === index ? '−' : '+'}</span>
                </button>
                {expandedFaqIndex === index && (
                  <div className="px-4 py-3 border-t text-sm text-muted-foreground bg-muted/30">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alternatives (if demand is low) */}
      {content.demand === 'low' && content.alternatives && content.alternatives.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="text-orange-900">Low Demand Alert</CardTitle>
            <CardDescription className="text-orange-800">
              This topic has low demand. Consider these higher-potential alternatives
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {content.alternatives.map((alternative, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded bg-white">
                  <span className="font-medium text-sm">{alternative}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUseAlternative?.(alternative)}
                  >
                    Use this topic
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
