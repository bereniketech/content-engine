import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getSession(token: string) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function revokeSession(sessionId: string) {
  const { error } = await supabase.auth.admin.signOut(sessionId, 'others');
  return !error;
}

export async function revokeAllSessions(userId: string) {
  const { error } = await supabase.auth.admin.signOut(userId);
  return !error;
}
