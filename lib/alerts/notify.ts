export type AlertPayload = {
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
  severity?: 'info' | 'warning' | 'critical';
};

export async function notifyAdmin(payload: AlertPayload): Promise<void> {
  const promises: Promise<unknown>[] = [];

  if (process.env.ADMIN_ALERT_WEBHOOK_URL) {
    promises.push(
      fetch(process.env.ADMIN_ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `[${payload.severity?.toUpperCase() ?? 'ALERT'}] ${payload.type}: ${payload.message}`,
          ...payload.metadata,
        }),
      }).catch((e) => console.error('Alert webhook failed:', e))
    );
  }

  if (process.env.ADMIN_NOTIFICATION_EMAIL && process.env.NEXT_PUBLIC_APP_URL) {
    promises.push(
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': process.env.INTERNAL_API_KEY!,
        },
        body: JSON.stringify({
          template: 'account_blocked',
          email: process.env.ADMIN_NOTIFICATION_EMAIL,
          message: `${payload.type}: ${payload.message}`,
        }),
      }).catch((e) => console.error('Alert email failed:', e))
    );
  }

  await Promise.allSettled(promises);
}
