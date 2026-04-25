export function extractJsonPayload(raw: string): unknown {
  const trimmed = raw.trim()

  try {
    return JSON.parse(trimmed)
  } catch {
    const fencedJsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    if (fencedJsonMatch) {
      return JSON.parse(fencedJsonMatch[1])
    }

    const objectStart = trimmed.indexOf('{')
    if (objectStart >= 0) {
      let depth = 0
      let inString = false
      let isEscaped = false

      for (let index = objectStart; index < trimmed.length; index += 1) {
        const char = trimmed[index]

        if (char === '"' && !isEscaped) {
          inString = !inString
        }

        if (!inString && char === '{') {
          depth += 1
        }

        if (!inString && char === '}') {
          depth -= 1
          if (depth === 0) {
            return JSON.parse(trimmed.slice(objectStart, index + 1))
          }
        }

        isEscaped = char === '\\' && !isEscaped
      }
    }

    throw new Error('Response did not contain valid JSON')
  }
}
