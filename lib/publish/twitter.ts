import crypto from 'crypto'
import { getTwitterSecrets } from './secrets'

interface TweetResponse {
  data: { id: string; text: string }
}

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
}

function buildOAuthHeader(
  method: string,
  url: string,
  bodyParams: Record<string, string>,
  secrets: ReturnType<typeof getTwitterSecrets>,
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: secrets.apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: secrets.accessToken,
    oauth_version: '1.0',
  }

  const allParams = { ...oauthParams, ...bodyParams }
  const sortedParams = Object.keys(allParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join('&')

  const sigBaseString = [method.toUpperCase(), percentEncode(url), percentEncode(sortedParams)].join('&')
  const signingKey = `${percentEncode(secrets.apiSecret)}&${percentEncode(secrets.accessSecret)}`
  const signature = crypto.createHmac('sha1', signingKey).update(sigBaseString).digest('base64')

  oauthParams['oauth_signature'] = signature

  const headerValue = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(', ')

  return `OAuth ${headerValue}`
}

export class TwitterRateLimitError extends Error {
  constructor(public readonly retryAfter: number) {
    super(`Rate limit reached — try again in ${retryAfter}s`)
    this.name = 'TwitterRateLimitError'
  }
}

export async function postTweet(text: string): Promise<string> {
  const secrets = getTwitterSecrets()
  const url = 'https://api.twitter.com/2/tweets'
  const body = JSON.stringify({ text })

  const oauthHeader = buildOAuthHeader('POST', url, {}, secrets)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: oauthHeader,
      'Content-Type': 'application/json',
    },
    body,
  })

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('x-rate-limit-reset') ?? '900', 10)
    const remaining = retryAfter - Math.floor(Date.now() / 1000)
    throw new TwitterRateLimitError(Math.max(remaining, 60))
  }

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Twitter API error ${response.status}: ${errorBody}`)
  }

  const json = (await response.json()) as TweetResponse
  return json.data.id
}

export async function postThread(tweets: string[]): Promise<string> {
  if (tweets.length === 0) throw new Error('Thread must have at least one tweet')

  let replyToId: string | undefined
  let firstId: string | undefined

  for (const text of tweets) {
    const secrets = getTwitterSecrets()
    const url = 'https://api.twitter.com/2/tweets'
    const bodyObj = replyToId
      ? { text, reply: { in_reply_to_tweet_id: replyToId } }
      : { text }
    const body = JSON.stringify(bodyObj)

    const oauthHeader = buildOAuthHeader('POST', url, {}, secrets)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: oauthHeader,
        'Content-Type': 'application/json',
      },
      body,
    })

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('x-rate-limit-reset') ?? '900', 10)
      const remaining = retryAfter - Math.floor(Date.now() / 1000)
      throw new TwitterRateLimitError(Math.max(remaining, 60))
    }

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Twitter API error ${response.status}: ${errorBody}`)
    }

    const json = (await response.json()) as TweetResponse
    if (!firstId) firstId = json.data.id
    replyToId = json.data.id
  }

  return firstId!
}
