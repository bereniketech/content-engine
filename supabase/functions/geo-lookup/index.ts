// Supabase Edge Function (Deno runtime)
import { Redis } from 'https://esm.sh/@upstash/redis@1.34.0';

const redis = new Redis({
  url:   Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});

const CC_RE = /^[A-Z]{2}$/;

function getIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? '0.0.0.0';
}

async function lookupViaIpapi(ip: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 1500);
  try {
    const res = await fetch(`https://ipapi.co/${ip}/country/`, { signal: ctrl.signal });
    if (!res.ok) return 'XX';
    const text = (await res.text()).trim().toUpperCase();
    return CC_RE.test(text) ? text : 'XX';
  } catch {
    return 'XX';
  } finally {
    clearTimeout(t);
  }
}

Deno.serve(async (req: Request) => {
  try {
    const cf = req.headers.get('cf-ipcountry');
    if (cf && CC_RE.test(cf.toUpperCase())) {
      return Response.json({ country_code: cf.toUpperCase() });
    }

    const ip = getIp(req);
    const cacheKey = `geo:${ip}`;
    const cached = await redis.get<string>(cacheKey);
    if (cached && CC_RE.test(cached)) {
      return Response.json({ country_code: cached });
    }

    const cc = await lookupViaIpapi(ip);
    await redis.set(cacheKey, cc, { ex: 3600 });
    return Response.json({ country_code: cc });
  } catch (_e) {
    return Response.json({ error: 'GEO_LOOKUP_FAILED' }, { status: 502 });
  }
});
