import { NextRequest, NextResponse } from 'next/server';
import { validateEmail } from '@/lib/abuse/emailValidate';
import { checkRateLimit } from '@/lib/abuse/ratelimit';

export const runtime = 'nodejs';   // dns module requires Node runtime
export const dynamic = 'force-dynamic';

function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? '0.0.0.0';
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const { success } = await checkRateLimit('email-validate:ip', ip);
    if (!success) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
    }

    let body: { email?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'EMAIL_REQUIRED' }, { status: 400 });
    }

    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email) {
      return NextResponse.json({ error: 'EMAIL_REQUIRED' }, { status: 400 });
    }

    const result = await validateEmail(email);
    if (!result.valid) {
      return NextResponse.json({ error: 'INVALID_EMAIL_FORMAT' }, { status: 422 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (_e) {
    return NextResponse.json({ error: 'EMAIL_VALIDATE_FAILED' }, { status: 500 });
  }
}
