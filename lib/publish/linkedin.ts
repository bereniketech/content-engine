import { getLinkedInSecrets } from './secrets'

export class LinkedInAuthError extends Error {
  constructor() {
    super('LinkedIn token expired — reconnect LinkedIn in settings.')
    this.name = 'LinkedInAuthError'
  }
}

async function getPersonUrn(accessToken: string): Promise<string> {
  const response = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'LinkedIn-Version': '202312',
    },
  })

  if (response.status === 401 || response.status === 403) {
    throw new LinkedInAuthError()
  }

  if (!response.ok) {
    throw new Error(`LinkedIn userinfo error ${response.status}`)
  }

  const data = (await response.json()) as { sub: string }
  return `urn:li:person:${data.sub}`
}

export async function postToLinkedIn(content: string): Promise<string> {
  const { accessToken } = getLinkedInSecrets()
  const personUrn = await getPersonUrn(accessToken)

  const body = {
    author: personUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: content },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  }

  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202312',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  })

  if (response.status === 401 || response.status === 403) {
    throw new LinkedInAuthError()
  }

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`LinkedIn API error ${response.status}: ${errorBody}`)
  }

  const locationHeader = response.headers.get('x-restli-id') ?? response.headers.get('location') ?? 'unknown'
  return locationHeader
}
