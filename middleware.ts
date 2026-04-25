import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

async function enforceRateLimit(request: NextRequest): Promise<NextResponse | null> {
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return null;
  }

  const userKey = getRateLimitKey(request);
  const key = `${userKey}:${request.nextUrl.pathname}`;
  const { limited, retryAfterSeconds } = await checkRateLimit(key);

  if (limited) {
    const retryAfter = Math.max(60, retryAfterSeconds);
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Too many requests" } },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  return null;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function middleware(request: NextRequest) {
  const rateLimitedResponse = await enforceRateLimit(request);
  if (rateLimitedResponse) {
    return rateLimitedResponse;
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
