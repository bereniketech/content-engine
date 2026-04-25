import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

interface FetchWithCacheOptions<T> {
  userId: string;
  supabase: SupabaseClient;
  source: string;
  ttlMs?: number;
  fetcher: () => Promise<T>;
}

export async function fetchWithAnalyticsCache<
  T extends Record<string, unknown>
>(options: FetchWithCacheOptions<T>): Promise<T & { cachedAt: string; fromCache: boolean }> {
  const { userId, supabase, source, ttlMs = DEFAULT_TTL_MS, fetcher } = options;

  const { data: cached, error: fetchError } = await supabase
    .from("analytics_snapshots")
    .select("data, fetched_at")
    .eq("user_id", userId)
    .eq("source", source)
    .single();

  if (!fetchError && cached) {
    const fetchedAt = new Date(cached.fetched_at).getTime();
    const now = Date.now();
    const age = now - fetchedAt;

    if (age < ttlMs) {
      return {
        ...(cached.data as T),
        cachedAt: cached.fetched_at,
        fromCache: true,
      };
    }
  }

  const freshData = await fetcher();
  const now = new Date().toISOString();

  await supabase.from("analytics_snapshots").upsert(
    {
      user_id: userId,
      source,
      data: freshData,
      fetched_at: now,
    },
    { onConflict: "user_id,source" }
  );

  return {
    ...freshData,
    cachedAt: now,
    fromCache: false,
  };
}
