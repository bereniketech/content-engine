import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { buildEmail, TemplateId, TemplateData } from './templates';

const resend = new Resend(process.env.RESEND_API_KEY!);

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const DELAYS_MS = [1000, 4000, 16000];

export async function sendEmail(
  template: TemplateId,
  to: string,
  data: TemplateData,
  userId?: string
): Promise<{ ok: boolean; message_id?: string }> {
  const { subject, html, text } = buildEmail(template, data);
  const supabase = db();

  const { data: logRow } = await supabase
    .from('email_log')
    .insert({
      user_id: userId ?? null,
      template_id: template,
      recipient: to,
      status: 'pending',
    })
    .select('id')
    .single();

  const logId = logRow?.id;

  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const { data: sent, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to,
        subject,
        html,
        text,
      });

      if (error) throw new Error(error.message);

      await supabase
        .from('email_log')
        .update({
          status: 'sent',
          provider_id: sent?.id,
          sent_at: new Date().toISOString(),
          attempts: attempt + 1,
        })
        .eq('id', logId);

      return { ok: true, message_id: sent?.id };
    } catch (err) {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, DELAYS_MS[attempt]));
      } else {
        await supabase
          .from('email_log')
          .update({ status: 'failed', attempts: 3 })
          .eq('id', logId);

        const alertUrl = process.env.ADMIN_ALERT_WEBHOOK_URL;
        if (alertUrl) {
          fetch(alertUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'email_delivery_failure',
              template,
              to,
              error: String(err),
            }),
          }).catch(() => {});
        }

        return { ok: false };
      }
    }
  }

  return { ok: false };
}
