import Anthropic from '@anthropic-ai/sdk'
import { APIError } from '@anthropic-ai/sdk'
import { setTimeout } from 'timers/promises'
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
// Retry utilities
// ---------------------------------------------------------------------------

export function isRetryableError(err: unknown): boolean {
  if (err instanceof APIError) {
    return err.status === 529 || err.status === 503
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    return (
      msg.includes('econnreset') ||
      msg.includes('etimedout') ||
      msg.includes('socket hang up') ||
      msg.includes('network')
    )
  }
  return false
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (!isRetryableError(err) || attempt === maxAttempts) {
        throw err
      }
      const delayMs = baseDelayMs * 2 ** (attempt - 1)
      await setTimeout(delayMs)
    }
  }
  throw new Error('withRetry: unreachable')
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
  system?: string
  messages: AIMessage[]
}

// ---------------------------------------------------------------------------
// Anthropic client factory — includes prompt-caching beta header
// ---------------------------------------------------------------------------
function createAnthropicClient(): Anthropic {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    defaultHeaders: {
      'anthropic-beta': 'prompt-caching-2024-07-31',
    },
  })
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

  // Anthropic — with prompt caching + retry
  const client = createAnthropicClient()
  const message = await withRetry(() =>
    client.messages.create({
      model,
      max_tokens: opts.maxTokens,
      ...(opts.system
        ? {
            system: [
              {
                type: 'text' as const,
                text: opts.system,
                cache_control: { type: 'ephemeral' as const },
              },
            ],
          }
        : {}),
      messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
    })
  )
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

  // Anthropic — with prompt caching + retry on stream creation
  const client = createAnthropicClient()
  const stream = await withRetry(() =>
    Promise.resolve(
      client.messages.stream({
        model,
        max_tokens: opts.maxTokens,
        ...(opts.system
          ? {
              system: [
                {
                  type: 'text' as const,
                  text: opts.system,
                  cache_control: { type: 'ephemeral' as const },
                },
              ],
            }
          : {}),
        messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
      })
    )
  )
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text
    }
  }
}
