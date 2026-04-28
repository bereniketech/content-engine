import type { SupabaseClient } from '@supabase/supabase-js'
import { createMessage } from '@/lib/ai'

interface DetectionResult {
  originalityScore: number
  aiScore: number
}

async function callOriginalityAI(text: string): Promise<DetectionResult> {
  const key = process.env.ORIGINALITY_API_KEY
  if (!key) throw new Error('ORIGINALITY_API_KEY not configured')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  try {
    const res = await fetch('https://api.originality.ai/api/v1/scan/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-OAI-API-KEY': key },
      body: JSON.stringify({ content: text.slice(0, 50_000), aiModelVersion: 'latest' }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Originality.ai error: ${res.status}`)
    const data = (await res.json()) as { score: { ai: number; original: number } }
    return { originalityScore: data.score.original * 100, aiScore: data.score.ai * 100 }
  } finally {
    clearTimeout(timeout)
  }
}

export async function runDetectionWithRewrite(
  sessionId: string,
  text: string,
  supabase: SupabaseClient
): Promise<{ originalityScore: number; aiScore: number; rewritten: boolean; finalText: string }> {
  let result = await callOriginalityAI(text)
  let currentText = text
  let rewritten = false

  if (result.originalityScore < 90) {
    currentText = await createMessage({
      maxTokens: 4000,
      messages: [
        {
          role: 'user',
          content: `Rewrite the following article in your own words while preserving all facts and meaning. Make it sound more natural and human-written:\n\n${text}`,
        },
      ],
    })
    result = await callOriginalityAI(currentText)
    rewritten = true

    await supabase.from('content_assets').insert({
      session_id: sessionId,
      asset_type: 'blog_rewritten',
      content: JSON.stringify({ text: currentText, reason: 'originality_rewrite' }),
    })
  }

  await supabase.from('content_assets').insert({
    session_id: sessionId,
    asset_type: 'detection_result',
    content: JSON.stringify({ ...result, rewritten, checkedAt: new Date().toISOString() }),
  })

  return { ...result, rewritten, finalText: currentText }
}
