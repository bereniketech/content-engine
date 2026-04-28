export class ConfigError extends Error {
  constructor(public readonly varName: string) {
    super(`Missing required environment variable: ${varName}`)
    this.name = 'ConfigError'
  }
}

function requireEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new ConfigError(name)
  return val
}

// ---------------------------------------------------------------------------
// Phase 1: Platform-level secrets from environment (Vercel Encrypted Env Vars)
// ---------------------------------------------------------------------------

export interface XCredentials {
  oauthToken: string
  oauthTokenSecret: string
  consumerKey: string
  consumerSecret: string
}

export function getXCredentials(): XCredentials {
  return {
    oauthToken: requireEnv('X_OAUTH_TOKEN'),
    oauthTokenSecret: requireEnv('X_OAUTH_TOKEN_SECRET'),
    consumerKey: requireEnv('X_CONSUMER_KEY'),
    consumerSecret: requireEnv('X_CONSUMER_SECRET'),
  }
}

export interface LinkedInCredentials {
  clientId: string
  clientSecret: string
  accessToken: string
}

export function getLinkedInCredentials(): LinkedInCredentials {
  return {
    clientId: requireEnv('LINKEDIN_CLIENT_ID'),
    clientSecret: requireEnv('LINKEDIN_CLIENT_SECRET'),
    accessToken: requireEnv('LINKEDIN_ACCESS_TOKEN'),
  }
}

export function getInstagramAccessToken(): string {
  return requireEnv('INSTAGRAM_ACCESS_TOKEN')
}

export function getInstagramSecrets() {
  return {
    accessToken: requireEnv('INSTAGRAM_ACCESS_TOKEN'),
    businessAccountId: requireEnv('INSTAGRAM_BUSINESS_ACCOUNT_ID'),
  }
}

export interface RedditCredentials {
  clientId: string
  clientSecret: string
  refreshToken: string
}

export function getRedditCredentials(): RedditCredentials {
  return {
    clientId: requireEnv('REDDIT_CLIENT_ID'),
    clientSecret: requireEnv('REDDIT_CLIENT_SECRET'),
    refreshToken: requireEnv('REDDIT_REFRESH_TOKEN'),
  }
}

export function getNewsletterApiKey(): string {
  return requireEnv('NEWSLETTER_API_KEY')
}

export function getMailchimpSecrets() {
  return {
    apiKey: requireEnv('MAILCHIMP_API_KEY'),
    audienceId: requireEnv('MAILCHIMP_AUDIENCE_ID'),
  }
}

export function getSendGridSecrets() {
  return {
    apiKey: requireEnv('SENDGRID_API_KEY'),
  }
}

export function getGoogleSecrets() {
  return {
    ga4PropertyId: requireEnv('GA4_PROPERTY_ID'),
    searchConsoleSiteUrl: requireEnv('GOOGLE_SEARCH_CONSOLE_SITE_URL'),
    serviceAccountJson: requireEnv('GOOGLE_SERVICE_ACCOUNT_JSON'),
  }
}

// Backward-compat aliases
export const getTwitterSecrets = () => ({
  apiKey: requireEnv('TWITTER_API_KEY'),
  apiSecret: requireEnv('TWITTER_API_SECRET'),
  accessToken: requireEnv('TWITTER_ACCESS_TOKEN'),
  accessSecret: requireEnv('TWITTER_ACCESS_SECRET'),
})

export const getLinkedInSecrets = () => ({
  accessToken: requireEnv('LINKEDIN_ACCESS_TOKEN'),
})

export const getRedditSecrets = getRedditCredentials

// ---------------------------------------------------------------------------
// Phase 2: Per-user secrets via Supabase Vault
// (scaffold — returns env var for now; replace with Vault call when implemented)
// ---------------------------------------------------------------------------

export async function getUserPlatformSecret(
  _userId: string,
  platform: string,
): Promise<string> {
  // Phase 2 implementation (uncomment when Supabase Vault is configured):
  // const { createSupabaseServerClient } = await import('@/lib/supabase-server')
  // const supabase = createSupabaseServerClient()
  // const { data, error } = await supabase.rpc('vault.decryptSecret', {
  //   secret_name: `${_userId}:${platform}:access_token`,
  // })
  // if (error || !data) throw new Error(`Secret not found for platform: ${platform}`)
  // return data as string

  switch (platform.toLowerCase()) {
    case 'x':
    case 'twitter':
      return getXCredentials().oauthToken
    case 'linkedin':
      return getLinkedInCredentials().accessToken
    case 'instagram':
      return getInstagramAccessToken()
    case 'reddit':
      return getRedditCredentials().refreshToken
    case 'newsletter':
      return getNewsletterApiKey()
    default:
      throw new Error(`Unknown platform: ${platform}`)
  }
}
