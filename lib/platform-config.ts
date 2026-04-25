export const SCHEDULABLE_PLATFORMS = [
  'x',
  'linkedin',
  'instagram',
  'reddit',
  'newsletter_mailchimp',
  'newsletter_sendgrid',
] as const;

export type SchedulablePlatform = (typeof SCHEDULABLE_PLATFORMS)[number];

export const PUBLISH_ENDPOINT_MAP: Record<string, string> = {
  x: '/api/publish/x',
  linkedin: '/api/publish/linkedin',
  instagram: '/api/publish/instagram',
  reddit: '/api/publish/reddit',
  newsletter: '/api/publish/newsletter',
  newsletter_mailchimp: '/api/publish/newsletter',
  newsletter_sendgrid: '/api/publish/newsletter',
};
