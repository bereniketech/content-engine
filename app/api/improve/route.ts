import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: { code: 'not_implemented', message: 'API not yet implemented' } },
    { status: 501 }
  )
}
