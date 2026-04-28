export async function verifyCaptcha(
  token: string,
  expectedAction = 'generate'
): Promise<boolean> {
  if (!token) return false;
  try {
    const params = new URLSearchParams({
      secret: process.env.RECAPTCHA_SECRET_KEY!,
      response: token,
    });
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success: boolean; score?: number; action?: string };
    if (!data.success) return false;
    if (data.action && data.action !== expectedAction) return false;
    return (data.score ?? 0) >= 0.5;
  } catch {
    return false;
  }
}
