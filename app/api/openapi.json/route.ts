import { NextResponse } from 'next/server'
import { generateOpenApiDocument } from '@/lib/openapi'

let cachedDoc: ReturnType<typeof generateOpenApiDocument> | null = null

export async function GET() {
  if (!cachedDoc) {
    cachedDoc = generateOpenApiDocument()
  }
  return NextResponse.json(cachedDoc, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
