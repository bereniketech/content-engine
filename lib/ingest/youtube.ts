import { google } from 'googleapis'
import { IngestionError } from './errors'

const VIDEO_ID_PATTERNS = [
  /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
]

function extractVideoId(url: string): string | null {
  for (const pattern of VIDEO_ID_PATTERNS) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

function cleanTranscriptText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// Fetches transcript for a public YouTube video using the YouTube Data API v3.
// Requires GOOGLE_SEARCH_API_KEY. Only works for videos with public captions.
export async function fetchYouTubeTranscript(url: string): Promise<string> {
  const videoId = extractVideoId(url)
  if (!videoId) {
    throw new IngestionError('youtube', 'Invalid YouTube URL')
  }

  const apiKey = process.env.GOOGLE_SEARCH_API_KEY
  if (!apiKey) {
    throw new IngestionError('youtube', 'YouTube API key not configured')
  }

  const youtube = google.youtube({ version: 'v3', auth: apiKey })

  const captionsResponse = await youtube.captions.list({
    part: ['snippet'],
    videoId,
  })

  const captions = captionsResponse.data.items ?? []
  if (captions.length === 0) {
    throw new IngestionError('youtube', 'No captions available for this video')
  }

  const captionId = captions[0].id
  if (!captionId) {
    throw new IngestionError('youtube', 'Caption track has no ID')
  }

  const downloadResponse = await youtube.captions.download({
    id: captionId,
    tfmt: 'srv3',
  })

  const rawText = typeof downloadResponse.data === 'string'
    ? downloadResponse.data
    : JSON.stringify(downloadResponse.data)

  const cleaned = cleanTranscriptText(rawText)
  if (!cleaned) {
    throw new IngestionError('youtube', 'Caption download returned empty content')
  }

  return cleaned
}
