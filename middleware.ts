import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const config = {
  matcher: ['/api/((?!auth/magic-link/callback|webhooks|email/validate).*)'],
};

const redis = Redis.fromEnv();

const authLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'auth:ip',
});

const genLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'gen:user',
});

const webhookLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  prefix: 'webhook:ip',
});

export async function middleware(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith('/api/auth')) {
    const { success, reset } = await authLimit.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)) } }
      );
    }
  }

  if (pathname.startsWith('/api/webhooks')) {
    const { success, reset } = await webhookLimit.limit(ip);
    if (!success) {
      const alertUrl = process.env.ADMIN_ALERT_WEBHOOK_URL;
      if (alertUrl) {
        void fetch(alertUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'webhook_burst', ip, timestamp: Date.now() }),
          signal: AbortSignal.timeout(3000),
        }).catch(() => {});
      }
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))) } }
      );
    }
  }

  const publicRoutes = ['/api/auth/signup', '/api/auth/magic-link', '/api/auth/verify-email', '/api/email/validate', '/api/pricing'];
  if (publicRoutes.some((r) => pathname.startsWith(r))) {
    const res = NextResponse.next();
    res.headers.set('x-client-ip', ip);
    res.headers.set('x-country', req.headers.get('cf-ipcountry') ?? 'XX');
    return res;
  }

  const token = req.cookies.get('__Secure-sb-access')?.value ?? req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (pathname.startsWith('/api/content')) {
    const { success, reset } = await genLimit.limit(user.id);
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)) } }
      );
    }
  }

  const res = NextResponse.next();
  res.headers.set('x-user-id', user.id);
  res.headers.set('x-client-ip', ip);
  res.headers.set('x-country', req.headers.get('cf-ipcountry') ?? 'XX');
  return res;
}
