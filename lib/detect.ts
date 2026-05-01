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

function chunkText(text: string, maxWords = 350): string[] {
  const words = text.split(' ')
  const chunks: string[] = []
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(' '))
  }
  return chunks
}

async function callHuggingFace(text: string): Promise<DetectionResult> {
  const token = process.env.HF_TOKEN
  if (!token) throw new Error('HF_TOKEN not configured')

  const HF_MODEL = 'https://api-inference.huggingface.co/models/openai-community/roberta-base-openai-detector'

  const fetchChunk = async (chunk: string): Promise<DetectionResult> => {
    let res = await fetch(HF_MODEL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: chunk }),
    })

    // Model is loading — wait and retry once
    if (res.status === 503) {
      const err = (await res.json()) as { estimated_time?: number }
      await new Promise(r => setTimeout(r, (err.estimated_time ?? 30) * 1000))
      res = await fetch(HF_MODEL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: chunk }),
      })
    }

    if (!res.ok) throw new Error(`HuggingFace error: ${res.status}`)
    const data = (await res.json()) as Array<{ label: string; score: number }>
    const fake = data.find(d => d.label === 'Fake' || d.label === 'LABEL_1')
    const real = data.find(d => d.label === 'Real' || d.label === 'LABEL_0')
    return {
      aiScore: (fake?.score ?? 0) * 100,
      originalityScore: (real?.score ?? 0) * 100,
    }
  }

  const chunks = chunkText(text)
  const scores = await Promise.all(chunks.map(fetchChunk))
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
  return {
    aiScore: avg(scores.map(s => s.aiScore)),
    originalityScore: avg(scores.map(s => s.originalityScore)),
  }
}

async function detect(text: string): Promise<DetectionResult> {
  if (process.env.ORIGINALITY_API_KEY) return callOriginalityAI(text)
  return callHuggingFace(text)
}

export async function runDetectionWithRewrite(
  sessionId: string,
  text: string,
  supabase: SupabaseClient
): Promise<{ originalityScore: number; aiScore: number; rewritten: boolean; finalText: string }> {
  let result = await detect(text)
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
    result = await detect(currentText)
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
