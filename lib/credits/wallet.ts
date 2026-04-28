import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type WalletInfo = {
  id: string;
  balance: number;
  owner_kind: 'user' | 'team';
};

export async function resolveWallet(userId: string): Promise<WalletInfo | null> {
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (membership) {
    const { data: wallet } = await supabase
      .from('credit_wallets')
      .select('id, balance, owner_kind')
      .eq('owner_id', membership.team_id)
      .eq('owner_kind', 'team')
      .single();
    return wallet ?? null;
  }

  const { data: wallet } = await supabase
    .from('credit_wallets')
    .select('id, balance, owner_kind')
    .eq('owner_id', userId)
    .eq('owner_kind', 'user')
    .single();
  return wallet ?? null;
}

export async function deductCredits(
  walletId: string,
  cost: number,
  actionType: string,
  requestId: string,
  actingUserId: string
): Promise<number> {
  const { data, error } = await supabase.rpc('fn_deduct_credits', {
    p_wallet_id: walletId,
    p_cost: cost,
    p_action_type: actionType,
    p_request_id: requestId,
    p_actor: actingUserId,
  });
  if (error) throw error;
  return data as number;
}

export async function topupCredits(
  walletId: string,
  amount: number,
  paymentId: string
): Promise<number> {
  const { data, error } = await supabase.rpc('fn_credit_topup', {
    p_wallet_id: walletId,
    p_amount: amount,
    p_payment_id: paymentId,
  });
  if (error) throw error;
  return data as number;
}
