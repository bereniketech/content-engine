import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createOrder } from '@/lib/billing/razorpay';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { pack_id } = await req.json();
  if (!pack_id) return NextResponse.json({ error: 'pack_id is required.' }, { status: 400 });

  const { data: user } = await supabase.from('users').select('country_code').eq('id', userId).single();
  const detected = req.headers.get('x-vercel-ip-country') ?? undefined;

  const { orderId, amount, currency } = await createOrder({
    userId,
    packId: pack_id,
    countryCode: user?.country_code ?? 'XX',
    detectedCountryCode: detected,
  });

  return NextResponse.json({
    razorpay_order_id: orderId,
    amount,
    currency,
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  });
}
