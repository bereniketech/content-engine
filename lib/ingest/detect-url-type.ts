export type UrlType = 'youtube' | 'audio' | 'web' | 'invalid'

const YOUTUBE_PATTERNS = [
  /youtube\.com\/watch\?v=/,
  /youtu\.be\//,
  /youtube\.com\/shorts\//,
]
const AUDIO_EXTENSIONS = /\.(mp3|wav|m4a|ogg|aac|flac)(\?.*)?$/i
const HTTP_PATTERN = /^https?:\/\//

export function detectUrlType(url: string): UrlType {
  if (!url || !HTTP_PATTERN.test(url)) return 'invalid'
  if (YOUTUBE_PATTERNS.some((p) => p.test(url))) return 'youtube'
  if (AUDIO_EXTENSIONS.test(url)) return 'audio'
  return 'web'
}
