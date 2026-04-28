import { fal } from '@fal-ai/client'

export interface SocialCards {
  featured: string  // 1200×630 URL
  portrait: string  // 1080×1350 URL
}

interface FalImageResult {
  url: string
}

interface FalRunResult {
  images: FalImageResult[]
}

export async function generateSocialCards(
  prompt: string,
  _sessionId: string
): Promise<SocialCards> {
  const falKey = process.env.FAL_API_KEY
  if (!falKey) throw new Error('FAL_API_KEY not configured')

  fal.config({ credentials: falKey })

  const [featuredResult, portraitResult] = await Promise.all([
    fal.run('fal-ai/flux/schnell', {
      input: { prompt, image_size: { width: 1200, height: 630 } },
    }) as Promise<FalRunResult>,
    fal.run('fal-ai/flux/schnell', {
      input: { prompt, image_size: { width: 1080, height: 1350 } },
    }) as Promise<FalRunResult>,
  ])

  const featuredUrl = featuredResult.images[0]?.url
  const portraitUrl = portraitResult.images[0]?.url

  if (!featuredUrl || !portraitUrl) {
    throw new Error('fal.ai returned no image URLs')
  }

  return { featured: featuredUrl, portrait: portraitUrl }
}
