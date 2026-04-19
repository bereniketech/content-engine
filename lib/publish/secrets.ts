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

export function getTwitterSecrets() {
  return {
    apiKey: requireEnv('TWITTER_API_KEY'),
    apiSecret: requireEnv('TWITTER_API_SECRET'),
    accessToken: requireEnv('TWITTER_ACCESS_TOKEN'),
    accessSecret: requireEnv('TWITTER_ACCESS_SECRET'),
  }
}

export function getLinkedInSecrets() {
  return {
    accessToken: requireEnv('LINKEDIN_ACCESS_TOKEN'),
  }
}

export function getInstagramSecrets() {
  return {
    accessToken: requireEnv('INSTAGRAM_ACCESS_TOKEN'),
    businessAccountId: requireEnv('INSTAGRAM_BUSINESS_ACCOUNT_ID'),
  }
}

export function getRedditSecrets() {
  return {
    clientId: requireEnv('REDDIT_CLIENT_ID'),
    clientSecret: requireEnv('REDDIT_CLIENT_SECRET'),
    refreshToken: requireEnv('REDDIT_REFRESH_TOKEN'),
  }
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
