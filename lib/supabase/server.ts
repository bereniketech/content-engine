import { createClient as _createClient } from '@supabase/supabase-js';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return _createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
