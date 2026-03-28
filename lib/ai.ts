import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

// ---------------------------------------------------------------------------
// Provider detection
// ---------------------------------------------------------------------------
export type AIProvider = 'anthropic' | 'openai'

export function getProvider(): AIProvider {
  const explicit = process.env.AI_PROVIDER?.toLowerCase()
  if (explicit === 'openai') return 'openai'
  if (explicit === 'anthropic') return 'anthropic'

  // Auto-detect: prefer whichever key is set
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'

  return 'anthropic' // default
}

// ---------------------------------------------------------------------------
// Default models per provider
// ---------------------------------------------------------------------------
const DEFAULT_MODELS: Record<AIProvider, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
}

export function getDefaultModel(provider?: AIProvider): string {
  return DEFAULT_MODELS[provider ?? getProvider()]
}

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------
export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface CreateMessageOptions {
  model?: string
  maxTokens: number
  messages: AIMessage[]
}

// ---------------------------------------------------------------------------
// Non-streaming: returns the full response text
// ---------------------------------------------------------------------------
export async function createMessage(opts: CreateMessageOptions): Promise<string> {
  const provider = getProvider()
  const model = opts.model ?? getDefaultModel(provider)

  if (provider === 'openai') {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const response = await client.chat.completions.create({
      model,
      max_tokens: opts.maxTokens,
      messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
    })
    return response.choices[0]?.message?.content ?? ''
  }

  // Anthropic
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const message = await client.messages.create({
    model,
    max_tokens: opts.maxTokens,
    messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
  })
  return message.content[0]?.type === 'text' ? message.content[0].text : ''
}

// ---------------------------------------------------------------------------
// Streaming: yields text chunks, caller handles SSE framing
// ---------------------------------------------------------------------------
export async function* streamMessage(
  opts: CreateMessageOptions,
): AsyncGenerator<string> {
  const provider = getProvider()
  const model = opts.model ?? getDefaultModel(provider)

  if (provider === 'openai') {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const stream = await client.chat.completions.create({
      model,
      max_tokens: opts.maxTokens,
      messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    })
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) yield delta
    }
    return
  }

  // Anthropic
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const stream = client.messages.stream({
    model,
    max_tokens: opts.maxTokens,
    messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
  })
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text
    }
  }
}
