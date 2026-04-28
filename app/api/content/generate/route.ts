import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { generateWithDeduction } from '@/lib/credits/generate';
import { checkRateLimit, rateLimitHeaders } from '@/lib/abuse/ratelimit';
import { checkActionFrequency, isInCooldown, checkIdenticalRequest } from '@/lib/abuse/behavioral';
import { applyTrustEvent, requiresCaptcha } from '@/lib/abuse/trust';
import { verifyCaptcha } from '@/lib/abuse/captcha';

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  if (await isInCooldown(userId)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
  }

  const rl = await checkRateLimit('gen:user', userId);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded.' },
      { status: 429, headers: rateLimitHeaders(rl.reset, rl.remaining) }
    );
  }

  const freq = await checkActionFrequency(userId);
  if (freq.abusive) {
    await applyTrustEvent(userId, 'action_frequency_abuse');
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(Date.now() + 300_000, 0) }
    );
  }

  const body = await req.json();
  const { action_type, prompt, options, captchaToken } = body;

  if (!action_type || !prompt) {
    return NextResponse.json({ error: 'action_type and prompt are required.' }, { status: 400 });
  }

  const promptHash = crypto.createHash('sha256').update(prompt).digest('hex');
  const identical = await checkIdenticalRequest(userId, promptHash);
  if (identical.flagged) {
    await applyTrustEvent(userId, 'identical_requests');
  }

  // Trust-gated CAPTCHA: trust < 40 always requires it; flagged identical + trust < 80 requires it
  const trustScore = 50; // default; middleware could inject this via header in a future enhancement
  if (requiresCaptcha(trustScore, identical.flagged)) {
    const ok = await verifyCaptcha(captchaToken ?? '', 'generate');
    if (!ok) {
      return NextResponse.json({ error: 'CAPTCHA verification required.' }, { status: 403 });
    }
  }

  try {
    const result = await generateWithDeduction(userId, action_type, prompt, options ?? {});
    return NextResponse.json({
      result: result.result,
      credits_remaining: result.credits_remaining,
      request_id: result.request_id,
    });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    const message = (err as Error).message;

    if (status === 402) {
      return NextResponse.json({ error: message }, { status: 402 });
    }
    if (message?.includes('Unknown action type')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Generation failed. Credits have been refunded.' }, { status: 500 });
  }
}
