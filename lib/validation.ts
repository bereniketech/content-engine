export const VALIDATION_CONSTANTS = {
  MIN_SOURCE_TEXT_LENGTH: 10,
  MIN_ARTICLE_IMPROVE_LENGTH: 101,
  SCHEDULING_BUFFER_HOURS: 1,
  ALLOWED_FILE_EXTENSIONS: ['txt', 'md', 'pdf'] as const,
  ALLOWED_MIME_TYPES: ['text/plain', 'text/markdown', 'application/pdf'] as const,
} as const
