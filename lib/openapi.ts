import {
  extendZodWithOpenApi,
  OpenApiGeneratorV31,
  OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

extendZodWithOpenApi(z)

export const registry = new OpenAPIRegistry()

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
})

// ---------------------------------------------------------------------------
// Shared schemas
// ---------------------------------------------------------------------------

const ErrorResponseSchema = registry.register(
  'ErrorResponse',
  z.object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z
        .array(z.object({ field: z.string(), message: z.string() }))
        .optional(),
    }),
  })
)

const ContentAssetSchema = registry.register(
  'ContentAsset',
  z.object({
    id: z.string().uuid(),
    sessionId: z.string().uuid(),
    assetType: z.string(),
    content: z.record(z.string(), z.unknown()),
    createdAt: z.string().datetime(),
  })
)

// ---------------------------------------------------------------------------
// /api/blog
// ---------------------------------------------------------------------------

const BlogRequestSchema = registry.register(
  'BlogRequest',
  z.object({
    topic: z.string().min(6).openapi({ example: 'The future of AI content' }),
    seo: z.record(z.string(), z.unknown()),
    research: z.record(z.string(), z.unknown()),
    tone: z.enum(['authority', 'conversational', 'educational', 'professional']).optional(),
    sessionId: z.string().uuid().optional(),
  })
)

registry.registerPath({
  method: 'post',
  path: '/api/blog',
  summary: 'Generate a blog article (SSE stream)',
  security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: BlogRequestSchema } } } },
  responses: {
    200: {
      description: 'SSE stream of blog content chunks',
      content: { 'text/event-stream': { schema: z.string() } },
    },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
})

// ---------------------------------------------------------------------------
// /api/research
// ---------------------------------------------------------------------------

const ResearchRequestSchema = registry.register(
  'ResearchRequest',
  z.object({
    topic: z.string().min(6),
    sessionId: z.string().uuid().optional(),
  })
)

registry.registerPath({
  method: 'post',
  path: '/api/research',
  summary: 'Run AI research for a topic',
  security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: ResearchRequestSchema } } } },
  responses: {
    200: {
      description: 'Research result',
      content: { 'application/json': { schema: z.object({ data: ContentAssetSchema }) } },
    },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
})

// ---------------------------------------------------------------------------
// /api/seo
// ---------------------------------------------------------------------------

const SeoRequestSchema = registry.register(
  'SeoRequest',
  z.object({
    topic: z.string().min(6),
    research: z.record(z.string(), z.unknown()),
    sessionId: z.string().uuid().optional(),
  })
)

registry.registerPath({
  method: 'post',
  path: '/api/seo',
  summary: 'Generate SEO metadata',
  security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: SeoRequestSchema } } } },
  responses: {
    200: { description: 'SEO result', content: { 'application/json': { schema: z.object({ data: ContentAssetSchema }) } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
})

// ---------------------------------------------------------------------------
// /api/social
// ---------------------------------------------------------------------------

const SocialRequestSchema = registry.register(
  'SocialRequest',
  z.object({
    topic: z.string(),
    article: z.string(),
    seo: z.record(z.string(), z.unknown()),
    sessionId: z.string().uuid().optional(),
  })
)

registry.registerPath({
  method: 'post',
  path: '/api/social',
  summary: 'Generate social media content for all platforms',
  security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: SocialRequestSchema } } } },
  responses: {
    200: { description: 'Social content assets', content: { 'application/json': { schema: z.object({ data: z.record(z.string(), ContentAssetSchema) }) } } },
  },
})

// ---------------------------------------------------------------------------
// /api/data-driven/*
// ---------------------------------------------------------------------------

const DataDrivenBaseSchema = z.object({
  sessionId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
})

registry.registerPath({
  method: 'post',
  path: '/api/data-driven/assess',
  summary: 'Assess source data sufficiency',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: DataDrivenBaseSchema.extend({
            sourceText: z.string().max(80000),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Assessment result',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              sufficient: z.boolean(),
              missingAreas: z.array(z.string()),
              suggestedTopic: z.string(),
            }),
          }),
        },
      },
    },
  },
})

registry.registerPath({
  method: 'post',
  path: '/api/data-driven/article',
  summary: 'Generate data-driven article (SSE stream)',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: DataDrivenBaseSchema.extend({
            sourceText: z.string().optional(),
            researchData: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: 'SSE stream', content: { 'text/event-stream': { schema: z.string() } } },
  },
})

// ---------------------------------------------------------------------------
// /api/pipeline/trigger
// ---------------------------------------------------------------------------

registry.registerPath({
  method: 'post',
  path: '/api/pipeline/trigger',
  summary: 'Enqueue data-driven pipeline via Inngest',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            sessionId: z.string().uuid(),
            mode: z.enum(['topic', 'data']),
            sourceText: z.string().optional(),
            tone: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: 'Pipeline enqueued', content: { 'application/json': { schema: z.object({ ok: z.boolean(), eventId: z.string() }) } } },
  },
})

// ---------------------------------------------------------------------------
// /api/sessions
// ---------------------------------------------------------------------------

registry.registerPath({
  method: 'get',
  path: '/api/sessions',
  summary: 'List user sessions',
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Sessions list', content: { 'application/json': { schema: z.object({ data: z.array(z.record(z.string(), z.unknown())) }) } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
})

// ---------------------------------------------------------------------------
// Document generator
// ---------------------------------------------------------------------------

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions)

  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      version: '1.0.0',
      title: 'Content Studio API',
      description: 'AI-powered content generation and distribution API',
    },
    servers: [{ url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000' }],
  })
}
