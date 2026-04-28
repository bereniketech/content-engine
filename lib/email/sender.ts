export async function sendEmail(
  template: string,
  userId: string,
  data: Record<string, unknown>
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) return;
  await fetch(`${url}/api/email/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-key': process.env.INTERNAL_API_KEY!,
    },
    body: JSON.stringify({ template, userId, ...data }),
  }).catch((e) => console.error('sendEmail_failed', template, e));
}
