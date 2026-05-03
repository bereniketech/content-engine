import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';
import { SUPABASE_AUTH_COOKIE } from '@/lib/auth';

export const config = {
  matcher: ['/', '/api/((?!auth/magic-link/callback|webhooks|email/validate).*)'],
};

let _redis: Redis | null = null;
function getRedis(): Redis {
  if (!_redis) _redis = Redis.fromEnv();
  return _redis;
}

let _authLimit: Ratelimit | null = null;
function getAuthLimit(): Ratelimit {
  if (!_authLimit) _authLimit = new Ratelimit({ redis: getRedis(), limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'auth:ip' });
  return _authLimit;
}

let _genLimit: Ratelimit | null = null;
function getGenLimit(): Ratelimit {
  if (!_genLimit) _genLimit = new Ratelimit({ redis: getRedis(), limiter: Ratelimit.slidingWindow(30, '1 m'), prefix: 'gen:user' });
  return _genLimit;
}

let _webhookLimit: Ratelimit | null = null;
function getWebhookLimit(): Ratelimit {
  if (!_webhookLimit) _webhookLimit = new Ratelimit({ redis: getRedis(), limiter: Ratelimit.slidingWindow(100, '1 m'), prefix: 'webhook:ip' });
  return _webhookLimit;
}

export async function middleware(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith('/api/auth')) {
    const { success, reset } = await getAuthLimit().limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)) } }
      );
    }
  }

  if (pathname.startsWith('/api/webhooks')) {
    const { success, reset } = await getWebhookLimit().limit(ip);
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

  const publicRoutes = ['/', '/api/auth/signup', '/api/auth/magic-link', '/api/auth/verify-email', '/api/email/validate', '/api/pricing'];
  if (publicRoutes.some((r) => pathname.startsWith(r))) {
    const res = NextResponse.next();
    res.headers.set('x-client-ip', ip);
    res.headers.set('x-country', req.headers.get('cf-ipcountry') ?? 'XX');
    return res;
  }

  const token = req.cookies.get(SUPABASE_AUTH_COOKIE)?.value ?? req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (pathname.startsWith('/api/content')) {
    const { success, reset } = await getGenLimit().limit(user.id);
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)) } }
      );
    }
  }

  if (pathname.startsWith('/api/gen/')) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .in('status', ['active', 'past_due'])
      .maybeSingle();
    if (sub?.status === 'past_due') {
      return NextResponse.json(
        { error: 'Your payment failed. Please update your payment method.' },
        { status: 402 }
      );
    }
  }

  const requestId = crypto.randomUUID();
  const country = req.headers.get('cf-ipcountry') ?? 'XX';

  // Forward auth context to route handlers via request headers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id', user.id);
  requestHeaders.set('x-client-ip', ip);
  requestHeaders.set('x-country', country);
  requestHeaders.set('x-auth-verified', 'true');
  requestHeaders.set('x-request-id', requestId);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('x-request-id', requestId);

  logger.info({
    request_id: requestId,
    user_id: user.id,
    method: req.method,
    pathname,
    ip,
    country,
  });

  try {
    const trustUpgraded = await getRedis().get(`trust_upgrade:${user.id}`);
    if (trustUpgraded !== null && trustUpgraded !== undefined) {
      res.headers.set('x-trust-upgraded', '1');
    }
  } catch {
    // Redis unavailable — non-critical, continue without trust upgrade flag
  }

  return res;
}
