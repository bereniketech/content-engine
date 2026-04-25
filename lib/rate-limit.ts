import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import type { NextRequest } from 'next/server'

const DEFAULT_RATE_LIMIT = 10
const DEFAULT_WINDOW = '60 s'

let ratelimit: Ratelimit | null = null

function initRatelimit(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    console.warn(
      '[rate-limit] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN missing. Rate limiting disabled.'
    )
    return null
  }

  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(DEFAULT_RATE_LIMIT, DEFAULT_WINDOW),
    analytics: true,
  })
}

/**
 * Checks if a request exceeds the rate limit.
 * Returns { limited: false } if Redis is unavailable (graceful degradation).
 */
export async function checkRateLimit(
  key: string
): Promise<{ limited: boolean; retryAfterSeconds: number }> {
  if (!ratelimit) {
    ratelimit = initRatelimit()
  }

  if (!ratelimit) {
    return { limited: false, retryAfterSeconds: 0 }
  }

  try {
    const { success, pending, reset } = await ratelimit.limit(key)

    if (success) {
      return { limited: false, retryAfterSeconds: 0 }
    }

    const retryAfterSeconds = Math.max(
      Math.ceil((reset - Date.now()) / 1000),
      60
    )

    return { limited: true, retryAfterSeconds }
  } catch (error) {
    console.error('[rate-limit] Error checking limit:', error)
    return { limited: false, retryAfterSeconds: 0 }
  }
}

/**
 * Derives a rate limit key from the request.
 * Priority: JWT subject → IP address → 'anonymous'
 */
export function getRateLimitKey(request: NextRequest): string {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim()

  if (token) {
    try {
      const parts = token.split('.')
      if (parts.length >= 2) {
        const subject = decodeJwtSubject(parts[1])
        if (subject) {
          return `user:${subject}`
        }
        return `token:${token.slice(-24)}`
      }
    } catch {
      // Fall through to IP
    }
  }

  const forwardedFor = request.headers.get('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0]?.trim() || 'anonymous'
  return `ip:${ip}`
}

/**
 * Safely decodes the JWT payload to extract the 'sub' claim.
 */
function decodeJwtSubject(payload: string): string | null {
  try {
    const padded = payload + '==='.slice((payload.length + 3) % 4)
    const decoded = Buffer.from(padded, 'base64').toString('utf-8')
    const parsed = JSON.parse(decoded)
    return parsed.sub || null
  } catch {
    return null
  }
}
