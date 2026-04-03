'use client'

import { useMemo, useState } from 'react'
import { MessageCircle, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSessionContext } from '@/lib/context/SessionContext'
import { getLatestAssetByType } from '@/lib/session-assets'

type CampaignPhase = 'hook' | 'conversation' | 'conversion'

interface CampaignPost {
  postNumber: number
  phase: CampaignPhase
  content: string
  purpose: string
  scheduleSuggestion: string
  hashtags: string[]
  hasLink: boolean
}

interface ThreadsCampaignAssetContent {
  campaignName: string
  posts: CampaignPost[]
  threadVariant: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parsePost(value: unknown): CampaignPost | null {
  if (!isRecord(value)) {
    return null
  }

  if (
    typeof value.postNumber !== 'number'
    || (value.phase !== 'hook' && value.phase !== 'conversation' && value.phase !== 'conversion')
    || typeof value.content !== 'string'
    || typeof value.purpose !== 'string'
    || typeof value.scheduleSuggestion !== 'string'
    || !Array.isArray(value.hashtags)
    || typeof value.hasLink !== 'boolean'
  ) {
    return null
  }

  return {
    postNumber: value.postNumber,
    phase: value.phase,
    content: value.content,
    purpose: value.purpose,
    scheduleSuggestion: value.scheduleSuggestion,
    hashtags: value.hashtags.filter((tag): tag is string => typeof tag === 'string'),
    hasLink: value.hasLink,
  }
}

function parseThreadsCampaignAssetContent(value: unknown): ThreadsCampaignAssetContent | null {
  if (!isRecord(value) || typeof value.campaignName !== 'string' || !Array.isArray(value.posts) || !Array.isArray(value.threadVariant)) {
    return null
  }

  const posts = value.posts.map(parsePost).filter((post): post is CampaignPost => Boolean(post))
  const threadVariant = value.threadVariant.filter((line): line is string => typeof line === 'string')

  if (posts.length !== 10 || threadVariant.length !== 10) {
    return null
  }

  return {
    campaignName: value.campaignName,
    posts: [...posts].sort((left, right) => left.postNumber - right.postNumber),
    threadVariant,
  }
}

function getPhaseBadgeClasses(phase: CampaignPhase): string {
  if (phase === 'hook') {
    return 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200'
  }

  if (phase === 'conversation') {
    return 'bg-cyan-100 text-cyan-800 border-cyan-200'
  }

  return 'bg-emerald-100 text-emerald-800 border-emerald-200'
}

function getPhaseLabel(phase: CampaignPhase): string {
  if (phase === 'conversation') {
    return 'Conversation'
  }

  if (phase === 'conversion') {
    return 'Conversion'
  }

  return 'Hook'
}

export default function DataDrivenThreadsCampaignPage() {
  const { assets } = useSessionContext()
  const [copyNotice, setCopyNotice] = useState<string | null>(null)

  const campaignContent = useMemo(() => {
    const asset = getLatestAssetByType(assets, 'dd_threads_campaign')
    return parseThreadsCampaignAssetContent(asset?.content)
  }, [assets])

  const handleCopyPost = async (post: CampaignPost) => {
    const payload = post.content

    try {
      await navigator.clipboard.writeText(payload)
      setCopyNotice(`Post ${post.postNumber} copied.`)
    } catch {
      setCopyNotice('Copy failed. Please try again.')
    }
  }

  const handleCopyThread = async () => {
    if (!campaignContent) {
      return
    }

    try {
      await navigator.clipboard.writeText(campaignContent.threadVariant.join('\n\n'))
      setCopyNotice('Threads sequence copied.')
    } catch {
      setCopyNotice('Copy failed. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">Threads Campaign</h2>
        <p className="text-sm text-muted-foreground">
          Review the 10-post Threads-native rollout and copy individual posts or the full sequence.
        </p>
      </div>

      {!campaignContent ? (
        <Card>
          <CardHeader>
            <CardTitle>No content yet</CardTitle>
            <CardDescription>
              Run the pipeline distribution step to generate a valid dd_threads_campaign output with 10 posts and a 10-item sequence.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>{campaignContent.campaignName}</CardTitle>
                  <CardDescription>{campaignContent.posts.length} scheduled posts</CardDescription>
                </div>
                <Button type="button" onClick={handleCopyThread}>
                  Copy Full Sequence
                </Button>
              </div>
              {copyNotice ? <p className="text-sm text-muted-foreground">{copyNotice}</p> : null}
            </CardHeader>
          </Card>

          <div className="space-y-3">
            {campaignContent.posts.map((post) => {
              const showLinkIndicator = post.hasLink

              return (
                <Card key={`${post.postNumber}-${post.phase}`}>
                  <CardHeader className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">Post {post.postNumber}</Badge>
                        <Badge className={getPhaseBadgeClasses(post.phase)}>{getPhaseLabel(post.phase)}</Badge>
                        {showLinkIndicator ? (
                          <Badge variant="secondary" className="gap-1">
                            <Sparkles className="h-3 w-3" />
                            Link CTA
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <MessageCircle className="h-3 w-3" />
                            Conversation first
                          </Badge>
                        )}
                      </div>

                      <Button type="button" variant="outline" onClick={() => handleCopyPost(post)}>
                        Copy Post
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <p className="whitespace-pre-wrap rounded border bg-muted/20 p-3 text-sm text-foreground">
                      {post.content}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Purpose:</span> {post.purpose}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Schedule:</span> {post.scheduleSuggestion}
                    </p>
                    {post.hashtags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {post.hashtags.map((tag) => (
                          <Badge key={`${post.postNumber}-${tag}`} variant="outline">#{tag}</Badge>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
