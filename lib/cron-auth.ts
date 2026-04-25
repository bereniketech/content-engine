import { type NextRequest } from 'next/server'

export function verifyCronSecret(request: NextRequest): void {
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    throw new Error('CRON_SECRET not set')
  }

  const authHeader = request.headers.get('authorization')
  const token = authHeader?.match(/^Bearer\s+/i)?.[0]
    ? authHeader.replace(/^Bearer\s+/i, '').trim()
    : null

  if (token !== cronSecret) {
    const error = new Error('Unauthorized')
    ;(error as any).status = 401
    throw error
  }
}
