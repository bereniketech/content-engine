import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/sender';
import { TemplateId } from '@/lib/email/templates';

const VALID_TEMPLATES: TemplateId[] = [
  'magic_link', 'signup_verify_otp', 'signup_verify_resend', 'welcome',
  'payment_captured', 'payment_failed', 'subscription_activated',
  'subscription_renewed', 'subscription_past_due', 'subscription_cancelled',
  'low_credits_alert', 'team_invite', 'team_member_removed', 'account_blocked',
];

export async function POST(req: NextRequest) {
  const callerKey = req.headers.get('x-internal-key');
  if (callerKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const body = await req.json();
  const { template, email, userId, ...data } = body;

  if (!VALID_TEMPLATES.includes(template as TemplateId)) {
    return NextResponse.json({ error: 'Unknown template.' }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: 'email required.' }, { status: 400 });
  }

  const result = await sendEmail(template as TemplateId, email, data, userId);

  if (!result.ok) {
    return NextResponse.json({ error: 'Email failed after retries.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message_id: result.message_id });
}
