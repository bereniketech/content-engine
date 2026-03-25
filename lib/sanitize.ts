export function sanitizeInput(text: string): string {
  return text
    .replace(/`/g, '')
    .replace(/</g, '')
    .replace(/>/g, '')
    .replace(/{{/g, '')
    .replace(/}}/g, '')
}

export function sanitizeUnknown(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeInput(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeUnknown(item))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, sanitizeUnknown(nested)])
    )
  }

  return value
}
