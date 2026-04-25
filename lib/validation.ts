export const VALIDATION_CONSTANTS = {
  MIN_SOURCE_TEXT_LENGTH: 10,
  MIN_ARTICLE_IMPROVE_LENGTH: 101,
  /** @deprecated Use SCHEDULING_BUFFER_MS instead */
  SCHEDULING_BUFFER_HOURS: 1,
  SCHEDULING_BUFFER_MS: 5 * 60 * 1000,
  MIN_TOPIC_LENGTH: 6,
  ALLOWED_FILE_EXTENSIONS: ['txt', 'md', 'pdf'] as const,
  ALLOWED_MIME_TYPES: ['text/plain', 'text/markdown', 'application/pdf'] as const,
} as const
