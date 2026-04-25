'use client'

import React, { useState } from 'react'
import { Check, Copy, ChevronDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SeoResult } from '@/types'

interface SEOPanelProps {
  data: SeoResult
  isLoading?: boolean
}

const CopyField: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-2 border-b pb-4 last:border-b-0">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 w-7 p-0"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-sm bg-muted p-2 rounded break-words">{value}</p>
    </div>
  )
}

const CollapsibleSchema: React.FC<{
  title: string
  content: Record<string, unknown> | Array<{ question: string; answer: string }>
}> = ({ title, content }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const jsonStr = JSON.stringify(content, null, 2)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonStr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="border rounded bg-muted/30 mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition"
      >
        <span className="font-medium text-sm">{title}</span>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', {
            'rotate-180': isOpen,
          })}
        />
      </button>

      {isOpen && (
        <div className="border-t p-4 bg-background">
          <div className="flex justify-end mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 px-2 text-xs"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1 text-green-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy JSON
                </>
              )}
            </Button>
          </div>
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
            <code>{jsonStr}</code>
          </pre>
        </div>
      )}
    </div>
  )
}

const ScoreIndicator: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const getColor = (s: number) => {
    if (s >= 70) return 'bg-green-600'
    if (s >= 40) return 'bg-amber-600'
    return 'bg-red-600'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-lg font-bold text-foreground">{score}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={cn('h-full rounded-full transition-all', getColor(score))}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
    </div>
  )
}

const RankingChip: React.FC<{ potential: 'Low' | 'Medium' | 'High' }> = ({ potential }) => {
  const variantMap = {
    High: 'default',
    Medium: 'secondary',
    Low: 'outline',
  } as const

  return <Badge variant={variantMap[potential]}>{potential} Ranking Potential</Badge>
}

export const SEOPanel: React.FC<SEOPanelProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>SEO Optimization</CardTitle>
          <CardDescription>Loading SEO analysis...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>SEO Optimization</CardTitle>
        <CardDescription>Title, meta, keywords, and schema optimizations</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Score Indicators Section */}
        <div className="space-y-4 bg-muted/20 p-4 rounded">
          <ScoreIndicator score={data.seoScore} label="SEO Strength Score" />
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Keyword Coverage Score</span>
              <Badge>{data.keywordScore}</Badge>
            </div>
          </div>
          <div className="pt-2">
            <span className="text-sm font-medium block mb-2">Ranking Potential</span>
            <RankingChip potential={data.rankingPotential} />
          </div>
        </div>

        {/* Core SEO Fields */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Core Metadata</h3>
          <CopyField label="Page Title" value={data.title} />
          <CopyField label="Meta Description" value={data.metaDescription} />
          <CopyField label="URL Slug" value={data.slug} />
          <CopyField label="Primary Keyword" value={data.primaryKeyword} />
        </div>

        {/* Keywords Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Secondary Keywords</h3>
          <div className="space-y-2">
            {data.secondaryKeywords.map((keyword, i) => (
              <CopyField key={i} label={`Keyword ${i + 1}`} value={keyword} />
            ))}
          </div>
        </div>

        {/* Featured Snippet */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Featured Snippet</h3>
          <CopyField label="Snippet Answer" value={data.snippetAnswer} />
        </div>

        {/* Heading Structure */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Content Structure</h3>
          <CopyField label="H1 Heading" value={data.headingStructure.h1} />
          <div className="border-b pb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">H2 Subheadings</p>
            <div className="space-y-2">
              {data.headingStructure.h2.map((h2, i) => (
                <CopyField key={i} label={`H2-${i + 1}`} value={h2} />
              ))}
            </div>
          </div>
          <div className="border-b pb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">H3 Details</p>
            <div className="space-y-2">
              {data.headingStructure.h3.map((h3, i) => (
                <CopyField key={i} label={`H3-${i + 1}`} value={h3} />
              ))}
            </div>
          </div>
        </div>

        {/* Schemas Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Structured Data (Schema)</h3>
          <CollapsibleSchema title="FAQ Schema" content={data.faqSchema} />
          <CollapsibleSchema title="Article Schema" content={data.articleSchema} />
        </div>
      </CardContent>
    </Card>
  )
}
