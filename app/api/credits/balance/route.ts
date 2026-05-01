import { NextRequest, NextResponse } from 'next/server';
import { resolveWallet } from '@/lib/credits/wallet';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const wallet = await resolveWallet(userId);
  if (!wallet) return NextResponse.json({ balance: 0, wallet_kind: null, wallet_id: null });

  return NextResponse.json({
    balance: wallet.balance,
    wallet_kind: wallet.owner_kind,
    wallet_id: wallet.id,
  });
}
