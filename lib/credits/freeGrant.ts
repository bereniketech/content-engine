import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function grantFreeCredits(
  userId: string,
  ip: string,
  fpHash: string
): Promise<{ credits_granted: number }> {
  const { data, error } = await supabase.rpc('fn_grant_free_credits', {
    p_user_id: userId,
    p_ip: ip || '0.0.0.0',
    p_fp_hash: fpHash || '',
  });
  if (error) throw error;
  return { credits_granted: (data as number) ?? 0 };
}
