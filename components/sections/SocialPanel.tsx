'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSessionContext } from '@/lib/context/SessionContext'
import { getLatestAssetByType } from '@/lib/session-assets'
import {
  SOCIAL_PLATFORM_KEYS,
  type SocialOutput,
  type SocialPlatform,
} from '@/lib/prompts/social'
import { XPanel } from '@/components/sections/XPanel'
import { LinkedInPanel } from '@/components/sections/LinkedInPanel'
import { InstagramPanel } from '@/components/sections/InstagramPanel'
import { MediumPanel } from '@/components/sections/MediumPanel'
import { RedditPanel } from '@/components/sections/RedditPanel'
import { NewsletterPanel } from '@/components/sections/NewsletterPanel'
import { PinterestPanel } from '@/components/sections/PinterestPanel'

interface SocialPanelProps {
  platform: SocialPlatform
}

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  x: 'X (Twitter)',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  medium: 'Medium',
  reddit: 'Reddit',
  newsletter: 'Newsletter',
  pinterest: 'Pinterest',
}

function createEmptySocialOutput(): SocialOutput {
  return {
    x: { tweet: '', thread: [], hooks: [], replies: [] },
    linkedin: { storytelling: '', authority: '', carousel: '' },
    instagram: { carouselCaptions: [], reelCaption: '', hooks: [], cta: '' },
    medium: { article: '', canonicalSuggestion: '' },
    reddit: { post: '', subreddits: [], questions: [] },
    newsletter: { subjectLines: [], body: '', cta: '' },
    pinterest: { pins: [] },
    extras: { quotes: [], discussionQuestions: [], miniPosts: [] },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getValueAtPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, segment) => {
    if (Array.isArray(acc)) {
      const index = Number(segment)
      return Number.isInteger(index) ? acc[index] : undefined
    }
    if (isRecord(acc)) {
      return acc[segment]
    }
    return undefined
  }, source)
}

function setValueAtPath(source: unknown, path: string, value: string): unknown {
  const segments = path.split('.')
  const root = Array.isArray(source)
    ? [...source]
    : isRecord(source)
      ? { ...source }
      : {}

  let cursor: unknown = root

  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i]
    const nextSegment = segments[i + 1]

    if (Array.isArray(cursor)) {
      const index = Number(segment)
      if (!Number.isInteger(index)) {
        return source
      }

      const existing = cursor[index]
      const replacement = Array.isArray(existing)
        ? [...existing]
        : isRecord(existing)
          ? { ...existing }
          : Number.isInteger(Number(nextSegment))
            ? []
            : {}

      cursor[index] = replacement
      cursor = replacement
      continue
    }

    if (isRecord(cursor)) {
      const existing = cursor[segment]
      const replacement = Array.isArray(existing)
        ? [...existing]
        : isRecord(existing)
          ? { ...existing }
          : Number.isInteger(Number(nextSegment))
            ? []
            : {}

      cursor[segment] = replacement
      cursor = replacement
      continue
    }

    return source
  }

  const leaf = segments[segments.length - 1]
  if (Array.isArray(cursor)) {
    const index = Number(leaf)
    if (!Number.isInteger(index)) {
      return source
    }
    cursor[index] = value
    return root
  }

  if (isRecord(cursor)) {
    cursor[leaf] = value
    return root
  }

  return source
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function normalizePlatformData<K extends SocialPlatform>(platform: K, payload: unknown): SocialOutput[K] {
  const data = isRecord(payload) ? payload : {}

  if (platform === 'x') {
    return {
      tweet: typeof data.tweet === 'string' ? data.tweet : '',
      thread: asStringArray(data.thread),
      hooks: asStringArray(data.hooks),
      replies: asStringArray(data.replies),
    } as SocialOutput[K]
  }

  if (platform === 'linkedin') {
    return {
      storytelling: typeof data.storytelling === 'string' ? data.storytelling : '',
      authority: typeof data.authority === 'string' ? data.authority : '',
      carousel: typeof data.carousel === 'string' ? data.carousel : '',
    } as SocialOutput[K]
  }

  if (platform === 'instagram') {
    return {
      carouselCaptions: asStringArray(data.carouselCaptions),
      reelCaption: typeof data.reelCaption === 'string' ? data.reelCaption : '',
      hooks: asStringArray(data.hooks),
      cta: typeof data.cta === 'string' ? data.cta : '',
    } as SocialOutput[K]
  }

  if (platform === 'medium') {
    return {
      article: typeof data.article === 'string' ? data.article : '',
      canonicalSuggestion: typeof data.canonicalSuggestion === 'string' ? data.canonicalSuggestion : '',
    } as SocialOutput[K]
  }

  if (platform === 'reddit') {
    return {
      post: typeof data.post === 'string' ? data.post : '',
      subreddits: asStringArray(data.subreddits),
      questions: asStringArray(data.questions),
    } as SocialOutput[K]
  }

  if (platform === 'newsletter') {
    return {
      subjectLines: asStringArray(data.subjectLines),
      body: typeof data.body === 'string' ? data.body : '',
      cta: typeof data.cta === 'string' ? data.cta : '',
    } as SocialOutput[K]
  }

  return {
    pins: Array.isArray(data.pins)
      ? data.pins
          .filter((pin): pin is Record<string, unknown> => isRecord(pin))
          .map((pin) => ({
            title: typeof pin.title === 'string' ? pin.title : '',
            description: typeof pin.description === 'string' ? pin.description : '',
            keywords: asStringArray(pin.keywords),
          }))
      : [],
  } as SocialOutput[K]
}

function normalizeSocialOutput(payload: unknown): SocialOutput {
  const root = isRecord(payload) ? payload : {}

  return {
    x: normalizePlatformData('x', root.x),
    linkedin: normalizePlatformData('linkedin', root.linkedin),
    instagram: normalizePlatformData('instagram', root.instagram),
    medium: normalizePlatformData('medium', root.medium),
    reddit: normalizePlatformData('reddit', root.reddit),
    newsletter: normalizePlatformData('newsletter', root.newsletter),
    pinterest: normalizePlatformData('pinterest', root.pinterest),
    extras: {
      quotes: isRecord(root.extras) ? asStringArray(root.extras.quotes) : [],
      discussionQuestions: isRecord(root.extras) ? asStringArray(root.extras.discussionQuestions) : [],
      miniPosts: isRecord(root.extras) ? asStringArray(root.extras.miniPosts) : [],
    },
  }
}

export function SocialPanel({ platform }: SocialPanelProps) {
  const { sessionId, assets, upsertAsset } = useSessionContext()
  const latestBlogAsset = useMemo(() => getLatestAssetByType(assets, 'blog'), [assets])
  const latestImprovedAsset = useMemo(() => getLatestAssetByType(assets, 'improved'), [assets])
  const latestSeoAsset = useMemo(() => getLatestAssetByType(assets, 'seo'), [assets])
  const derivedSourceContent = useMemo(() => {
    const blogMarkdown = typeof latestBlogAsset?.content.markdown === 'string'
      ? latestBlogAsset.content.markdown.trim()
      : ''
    if (blogMarkdown) {
      return blogMarkdown
    }

    return typeof latestImprovedAsset?.content.improved === 'string'
      ? latestImprovedAsset.content.improved.trim()
      : ''
  }, [latestBlogAsset, latestImprovedAsset])
  const derivedSeoRaw = useMemo(
    () => JSON.stringify(latestSeoAsset?.content ?? {}, null, 2),
    [latestSeoAsset],
  )

  const [blog, setBlog] = useState('')
  const [seoRaw, setSeoRaw] = useState('{}')
  const [social, setSocial] = useState<SocialOutput>(createEmptySocialOutput)
  const [isGenerating, setIsGenerating] = useState(false)
  const [regeneratingPath, setRegeneratingPath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setBlog(derivedSourceContent)
  }, [derivedSourceContent])

  useEffect(() => {
    setSeoRaw(derivedSeoRaw)
  }, [derivedSeoRaw])

  useEffect(() => {
    const nextSocial = createEmptySocialOutput()

    const xAsset = getLatestAssetByType(assets, 'social_x')
    const linkedinAsset = getLatestAssetByType(assets, 'social_linkedin')
    const instagramAsset = getLatestAssetByType(assets, 'social_instagram')
    const mediumAsset = getLatestAssetByType(assets, 'social_medium')
    const redditAsset = getLatestAssetByType(assets, 'social_reddit')
    const newsletterAsset = getLatestAssetByType(assets, 'social_newsletter')
    const pinterestAsset = getLatestAssetByType(assets, 'social_pinterest')
    const extrasAsset = getLatestAssetByType(assets, 'social_extras')

    if (xAsset) nextSocial.x = normalizePlatformData('x', xAsset.content)
    if (linkedinAsset) nextSocial.linkedin = normalizePlatformData('linkedin', linkedinAsset.content)
    if (instagramAsset) nextSocial.instagram = normalizePlatformData('instagram', instagramAsset.content)
    if (mediumAsset) nextSocial.medium = normalizePlatformData('medium', mediumAsset.content)
    if (redditAsset) nextSocial.reddit = normalizePlatformData('reddit', redditAsset.content)
    if (newsletterAsset) nextSocial.newsletter = normalizePlatformData('newsletter', newsletterAsset.content)
    if (pinterestAsset) nextSocial.pinterest = normalizePlatformData('pinterest', pinterestAsset.content)
    if (extrasAsset && isRecord(extrasAsset.content)) {
      nextSocial.extras = {
        quotes: asStringArray(extrasAsset.content.quotes),
        discussionQuestions: asStringArray(extrasAsset.content.discussionQuestions),
        miniPosts: asStringArray(extrasAsset.content.miniPosts),
      }
    }

    setSocial(nextSocial)
  }, [assets])

  const platformLabel = useMemo(() => PLATFORM_LABELS[platform], [platform])

  const parseSeo = (): Record<string, unknown> => {
    try {
      const parsed = JSON.parse(seoRaw)
      if (!isRecord(parsed)) {
        throw new Error('SEO JSON must be an object')
      }
      return parsed
    } catch {
      throw new Error('SEO context must be valid JSON object')
    }
  }

  const generateAllPlatforms = async () => {
    setError(null)
    setIsGenerating(true)

    try {
      const seo = parseSeo()
      const response = await fetch('/api/social', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          blog,
          seo,
          platforms: [...SOCIAL_PLATFORM_KEYS],
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Failed to generate social content')
      }

      const generated = payload?.data?.social
      if (!generated) {
        throw new Error('Malformed social response from API')
      }

      setSocial(normalizeSocialOutput(generated))
      const generatedAssets = Array.isArray(payload?.data?.assets) ? payload.data.assets : []
      generatedAssets.forEach((asset: {
        id: string
        assetType: string
        content: Record<string, unknown>
        version: number
        createdAt: string
      }) => {
        upsertAsset({
          id: asset.id,
          assetType: asset.assetType,
          content: asset.content,
          version: asset.version,
          createdAt: asset.createdAt,
        })
      })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to generate social content')
    } finally {
      setIsGenerating(false)
    }
  }

  const saveBlock = (path: string, value: string) => {
    setSocial((current) => ({
      ...current,
      [platform]: setValueAtPath(current[platform], path, value) as SocialOutput[SocialPlatform],
    }))
  }

  const regenerateBlock = async (path: string) => {
    setError(null)
    setRegeneratingPath(path)

    try {
      const seo = parseSeo()
      const response = await fetch('/api/social/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          platform,
          blog,
          seo,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Failed to regenerate content')
      }

      const regeneratedPlatform = payload?.data?.content
      if (!regeneratedPlatform) {
        throw new Error('Malformed regenerate response')
      }

      if (payload?.data?.asset) {
        upsertAsset({
          id: payload.data.asset.id,
          assetType: payload.data.asset.assetType,
          content: payload.data.asset.content,
          version: payload.data.asset.version,
          createdAt: payload.data.asset.createdAt,
        })
      }

      const normalizedPlatform = normalizePlatformData(platform, regeneratedPlatform)
      const regeneratedValue = getValueAtPath(normalizedPlatform, path)
      if (typeof regeneratedValue !== 'string') {
        setSocial((current) => ({
          ...current,
          [platform]: normalizedPlatform,
        }))
      } else {
        setSocial((current) => ({
          ...current,
          [platform]: setValueAtPath(current[platform], path, regeneratedValue) as SocialOutput[SocialPlatform],
        }))
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to regenerate content')
    } finally {
      setRegeneratingPath(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Social Engine Input</CardTitle>
          <CardDescription>
            Provide blog and SEO context, then generate all social variants in one request.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Blog Content</label>
            <textarea
              value={blog}
              onChange={(event) => setBlog(event.target.value)}
              rows={8}
              className="w-full rounded-md border border-input bg-background p-3 text-sm"
              placeholder="Paste blog markdown or article text"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">SEO JSON</label>
            <textarea
              value={seoRaw}
              onChange={(event) => setSeoRaw(event.target.value)}
              rows={7}
              className="w-full rounded-md border border-input bg-background p-3 font-mono text-sm"
              placeholder='{"title":"...","primaryKeyword":"..."}'
            />
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" className="gap-2" onClick={generateAllPlatforms} disabled={isGenerating}>
              <RefreshCw className={isGenerating ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              {isGenerating ? 'Generating...' : 'Generate Social Bundle'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>{platformLabel} Content</CardTitle>
          <CardDescription>Each content block supports copy, edit, and regenerate actions.</CardDescription>
        </CardHeader>
        <CardContent>
          {platform === 'x' && (
            <XPanel
              data={social.x}
              onSaveBlock={saveBlock}
              onRegenerateBlock={regenerateBlock}
              regeneratingPath={regeneratingPath}
            />
          )}

          {platform === 'linkedin' && (
            <LinkedInPanel
              data={social.linkedin}
              onSaveBlock={saveBlock}
              onRegenerateBlock={regenerateBlock}
              regeneratingPath={regeneratingPath}
            />
          )}

          {platform === 'instagram' && (
            <InstagramPanel
              data={social.instagram}
              onSaveBlock={saveBlock}
              onRegenerateBlock={regenerateBlock}
              regeneratingPath={regeneratingPath}
            />
          )}

          {platform === 'medium' && (
            <MediumPanel
              data={social.medium}
              onSaveBlock={saveBlock}
              onRegenerateBlock={regenerateBlock}
              regeneratingPath={regeneratingPath}
            />
          )}

          {platform === 'reddit' && (
            <RedditPanel
              data={social.reddit}
              onSaveBlock={saveBlock}
              onRegenerateBlock={regenerateBlock}
              regeneratingPath={regeneratingPath}
            />
          )}

          {platform === 'newsletter' && (
            <NewsletterPanel
              data={social.newsletter}
              onSaveBlock={saveBlock}
              onRegenerateBlock={regenerateBlock}
              regeneratingPath={regeneratingPath}
            />
          )}

          {platform === 'pinterest' && (
            <PinterestPanel
              data={social.pinterest}
              onSaveBlock={saveBlock}
              onRegenerateBlock={regenerateBlock}
              regeneratingPath={regeneratingPath}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
