export interface SseStreamEvent {
  text?: string
  done?: boolean
  error?: string
  wordCount?: number
  asset?: unknown
}

export function parseSseChunk(rawChunk: string): SseStreamEvent[] {
  const events: SseStreamEvent[] = []
  const rawEvents = rawChunk.split('\n\n')

  for (const rawEvent of rawEvents) {
    const lines = rawEvent.split('\n').filter((line) => line.startsWith('data: '))
    if (lines.length === 0) {
      continue
    }

    const payload = lines.map((line) => line.slice(6)).join('')
    try {
      events.push(JSON.parse(payload) as SseStreamEvent)
    } catch {
      // Ignore partial event chunks until complete payload arrives.
    }
  }

  return events
}
