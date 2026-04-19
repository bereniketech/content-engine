import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { checkAlreadyPublished, writeDistributionLog, AlreadyPublishedError } from '@/lib/publish/distribution-log'
import { dispatchMailchimp, dispatchSendGrid } from '@/lib/publish/newsletter'
import { ConfigError } from '@/lib/publish/secrets'

const VALID_PROVIDERS = ['mailchimp', 'sendgrid'] as const
type NewsletterProvider = typeof VALID_PROVIDERS[number]

export async function POST(request: NextRequest) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Authentication required' } },
      { status: 401 }
    )
  }
  const { user, supabase } = auth

  let body: { sessionId?: unknown; provider?: unknown; subjectLine?: unknown; body?: unknown; recipientEmail?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: { code: 'invalid_json', message: 'Invalid JSON' } }, { status: 400 })
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
  const provider = typeof body.provider === 'string' && VALID_PROVIDERS.includes(body.provider as NewsletterProvider)
    ? (body.provider as NewsletterProvider)
    : null
  const subjectLine = typeof body.subjectLine === 'string' ? body.subjectLine.trim() : ''
  const htmlBody = typeof body.body === 'string' ? body.body.trim() : ''
  const recipientEmail = typeof body.recipientEmail === 'string' ? body.recipientEmail.trim() : ''

  const validationErrors: string[] = []
  if (!sessionId) validationErrors.push('sessionId is required')
  if (!provider) validationErrors.push('provider must be "mailchimp" or "sendgrid"')
  if (!subjectLine) validationErrors.push('subjectLine is required')
  if (!htmlBody) validationErrors.push('body is required')
  if (provider === 'sendgrid' && !recipientEmail) validationErrors.push('recipientEmail is required for SendGrid')

  if (validationErrors.length > 0) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: validationErrors.join('; ') } },
      { status: 400 }
    )
  }

  const platform = `newsletter_${provider!}` as 'newsletter_mailchimp' | 'newsletter_sendgrid'

  try {
    await checkAlreadyPublished(supabase, sessionId, platform)
  } catch (err) {
    if (err instanceof AlreadyPublishedError) {
      return NextResponse.json(
        { error: { code: 'already_published', message: err.message } },
        { status: 409 }
      )
    }
  }

  let campaignId: string
  try {
    if (provider === 'mailchimp') {
      campaignId = await dispatchMailchimp(subjectLine, htmlBody)
    } else {
      campaignId = await dispatchSendGrid(subjectLine, htmlBody, recipientEmail)
    }
  } catch (err) {
    if (err instanceof ConfigError) {
      return NextResponse.json(
        { error: { code: 'config_error', message: `Missing configuration: ${err.varName}` } },
        { status: 500 }
      )
    }
    console.error('publish/newsletter error', { provider, error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }

  let logId: string
  try {
    logId = await writeDistributionLog({
      supabase,
      sessionId,
      userId: user.id,
      platform,
      status: 'published',
      externalId: campaignId,
      metadata: { subjectLine, provider: provider! },
    })
  } catch {
    return NextResponse.json(
      { error: { code: 'storage_error', message: 'Sent but failed to log result' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: { campaignId, logId } }, { status: 201 })
}
