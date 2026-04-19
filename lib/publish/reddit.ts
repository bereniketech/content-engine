import { getRedditSecrets } from './secrets'

const REDDIT_TOKEN_URL = 'https://www.reddit.com/api/v1/access_token'
const REDDIT_SUBMIT_URL = 'https://oauth.reddit.com/api/submit'
const USER_AGENT = 'content-engine/1.0'

interface TokenResponse {
  access_token: string
  token_type: string
}

interface SubmitResponse {
  json: {
    errors: Array<[string, string, string]>
    data?: { url: string; id: string; name: string }
  }
}

export class RedditForbiddenError extends Error {
  constructor(public readonly subreddit: string) {
    super(`Posting to r/${subreddit} is not allowed.`)
    this.name = 'RedditForbiddenError'
  }
}

export async function getRedditAccessToken(): Promise<string> {
  const { clientId, clientSecret, refreshToken } = getRedditSecrets()

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetch(REDDIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    throw new Error(`Reddit token refresh failed: ${response.status}`)
  }

  const data = (await response.json()) as TokenResponse
  return data.access_token
}

export async function submitRedditPost(
  subreddit: string,
  title: string,
  body: string,
  accessToken: string,
): Promise<string> {
  const response = await fetch(REDDIT_SUBMIT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({
      sr: subreddit,
      kind: 'self',
      title,
      text: body,
      resubmit: 'true',
    }),
  })

  if (response.status === 403) {
    throw new RedditForbiddenError(subreddit)
  }

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Reddit submit error ${response.status}: ${errText}`)
  }

  const data = (await response.json()) as SubmitResponse

  if (data.json.errors && data.json.errors.length > 0) {
    const [errorCode, errorMsg] = data.json.errors[0]
    throw new Error(`Reddit error [${errorCode}]: ${errorMsg}`)
  }

  return data.json.data?.name ?? 'unknown'
}
