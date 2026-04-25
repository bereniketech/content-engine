export const ASSET_TYPES = {
  BLOG: 'blog',
  IMPROVED: 'improved',
  SEO: 'seo',
  RESEARCH: 'research',
  SOCIAL_X: 'social_x',
  SOCIAL_LINKEDIN: 'social_linkedin',
  SOCIAL_INSTAGRAM: 'social_instagram',
  SOCIAL_REDDIT: 'social_reddit',
  SOCIAL_THREADS: 'social_threads',
  NEWSLETTER: 'newsletter',
  ASSESSMENT: 'assessment',
  DD_RESEARCH: 'dd_research',
  DD_ARTICLE: 'dd_article',
  DD_SEO_GEO: 'dd_seo_geo',
  DD_BLOG: 'dd_blog',
  DD_LINKEDIN: 'dd_linkedin',
  DD_MEDIUM: 'dd_medium',
  DD_NEWSLETTER: 'dd_newsletter',
  DD_X_CAMPAIGN: 'dd_x_campaign',
  DD_THREADS_CAMPAIGN: 'dd_threads_campaign',
} as const;

export type AssetType = (typeof ASSET_TYPES)[keyof typeof ASSET_TYPES];

export const DATA_DRIVEN_ASSET_TYPES = [
  ASSET_TYPES.DD_RESEARCH,
  ASSET_TYPES.DD_ARTICLE,
  ASSET_TYPES.DD_SEO_GEO,
  ASSET_TYPES.DD_BLOG,
  ASSET_TYPES.DD_LINKEDIN,
  ASSET_TYPES.DD_MEDIUM,
  ASSET_TYPES.DD_NEWSLETTER,
  ASSET_TYPES.DD_X_CAMPAIGN,
  ASSET_TYPES.DD_THREADS_CAMPAIGN,
] as const;
