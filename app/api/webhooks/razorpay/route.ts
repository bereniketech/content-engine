import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { verifyWebhookSignature } from '@/lib/billing/razorpay';
import { createClient } from '@/lib/supabase/server';
import { routeWebhookEvent } from '@/lib/billing/webhookHandlers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  const supabase = createClient();

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error('webhook_signature_mismatch', { ip });
    await supabase.from('abuse_logs').insert({
      event_type: 'webhook_signature_mismatch',
      ip_address: ip,
      metadata: { signature, body_preview: rawBody.slice(0, 200) },
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: { event: string; payload: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const idempotencyKey =
    (event.payload?.payment as Record<string, unknown> | undefined)?.entity &&
    ((event.payload.payment as Record<string, unknown>).entity as Record<string, unknown>)?.id as string | undefined ??
    (event.payload?.subscription as Record<string, unknown> | undefined)?.entity &&
    ((event.payload.subscription as Record<string, unknown>).entity as Record<string, unknown>)?.id as string | undefined ??
    (event.payload?.refund as Record<string, unknown> | undefined)?.entity &&
    ((event.payload.refund as Record<string, unknown>).entity as Record<string, unknown>)?.id as string | undefined ??
    crypto.randomUUID();

  const { data: inserted, error: insertErr } = await supabase
    .from('webhook_events')
    .insert({
      provider: 'razorpay',
      event_type: event.event,
      idempotency_key: idempotencyKey,
      payload: event.payload,
      signature,
    })
    .select('id')
    .maybeSingle();

  if (insertErr) {
    if (insertErr.code === '23505') {
      return NextResponse.json({ ok: true, replayed: true });
    }
    console.error('webhook_insert_error', insertErr);
    return NextResponse.json({ error: 'Storage error' }, { status: 500 });
  }
  if (!inserted) {
    return NextResponse.json({ ok: true, replayed: true });
  }

  try {
    await routeWebhookEvent(event.event, event.payload, supabase);
    await supabase
      .from('webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', inserted.id);
  } catch (err) {
    console.error('webhook_processing_error', err);
    return NextResponse.json({ error: 'Processing error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
