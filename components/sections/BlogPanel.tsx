'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Copy, RefreshCw, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

interface BlogPanelProps {
  topic: string
  seo: SeoResult
  research: ResearchOutput
  tone?: 'authority' | 'casual' | 'storytelling'
}

interface ParsedSection {
  title: string
  content: string
  fullContent: string
}

export const BlogPanel: React.FC<BlogPanelProps> = ({ topic, seo, research, tone = 'authority' }) => {
  const [markdown, setMarkdown] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [expandingSection, setExpandingSection] = useState<string | null>(null)
  const [sections, setSections] = useState<ParsedSection[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)

  const generateBlog = async () => {
    setMarkdown('')
    setError(null)
    setIsLoading(true)
    setWordCount(0)
    setSections([])
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          seo,
          research,
          tone,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error('Failed to generate blog')
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedMarkdown = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.text) {
                accumulatedMarkdown += data.text
                setMarkdown(accumulatedMarkdown)
                setWordCount(accumulatedMarkdown.split(/\s+/).length)
              }

              if (data.done) {
                // Parse sections from final markdown
                parseSections(accumulatedMarkdown)
                setIsLoading(false)
              }

              if (data.error) {
                throw new Error(data.error)
              }
            } catch (parseError) {
              // Skip lines that aren't valid JSON
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Cancelled by user
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
      setIsLoading(false)
    }
  }

  const parseSections = (content: string) => {
    const lines = content.split('\n')
    const parsedSections: ParsedSection[] = []
    let currentSection: ParsedSection | null = null

    for (const line of lines) {
      if (line.startsWith('## ') && !line.startsWith('### ')) {
        if (currentSection) {
          parsedSections.push(currentSection)
        }
        const title = line.slice(3).trim()
        currentSection = {
          title,
          content: '',
          fullContent: `## ${title}\n`,
        }
      } else if (currentSection) {
        currentSection.content += line + '\n'
        currentSection.fullContent += line + '\n'
      }
    }

    if (currentSection) {
      parsedSections.push(currentSection)
    }

    setSections(parsedSections)
  }

  const expandSection = async (sectionTitle: string) => {
    setExpandingSection(sectionTitle)

    try {
      const response = await fetch('/api/blog/expand', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sectionTitle,
          topic,
          context: markdown,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to expand section')
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let newSectionContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.text) {
                newSectionContent += data.text
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      // Replace section in markdown
      const sectionRegex = new RegExp(`(## ${sectionTitle}\\n)[\\s\\S]*?(?=##|$)`)
      const updatedMarkdown = markdown.replace(
        sectionRegex,
        `## ${sectionTitle}\n${newSectionContent}\n\n`
      )
      setMarkdown(updatedMarkdown)
      setWordCount(updatedMarkdown.split(/\s+/).length)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to expand section')
    } finally {
      setExpandingSection(null)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>Blog Article</CardTitle>
            <CardDescription>AI-generated article optimized for SEO</CardDescription>
          </div>
          <Button onClick={generateBlog} disabled={isLoading} className="gap-2">
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {markdown && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {wordCount > 0 && <Badge variant="secondary">{wordCount} words</Badge>}
            </div>
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Article
                </>
              )}
            </Button>
          </div>
        )}

        {!markdown && !isLoading && (
          <div className="rounded bg-muted p-8 text-center text-muted-foreground">
            Click "Generate" to create your blog article
          </div>
        )}

        {isLoading && !markdown && (
          <div className="rounded bg-muted p-8 text-center text-muted-foreground">
            <div className="animate-pulse">Generating blog article...</div>
          </div>
        )}

        {markdown && (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="space-y-4 text-sm leading-relaxed">
              <ReactMarkdown>{markdown}</ReactMarkdown>

              {sections.length > 0 && (
                <div className="mt-6 space-y-2 border-t pt-4">
                  <p className="text-xs font-semibold text-muted-foreground">Quick Actions:</p>
                  <div className="flex flex-wrap gap-2">
                    {sections.map((section) => (
                      <Button
                        key={section.title}
                        variant="outline"
                        size="sm"
                        onClick={() => expandSection(section.title)}
                        disabled={expandingSection === section.title}
                        className="text-xs"
                      >
                        {expandingSection === section.title ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                            Expanding...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Expand: {section.title.slice(0, 20)}...
                          </>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
