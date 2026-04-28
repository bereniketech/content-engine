import { applyTrustEvent } from '@/lib/abuse/trust';
import { sendEmail } from '@/lib/email/sender';
import { SupabaseClient } from '@supabase/supabase-js';

export async function routeWebhookEvent(
  eventType: string,
  payload: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<void> {
  switch (eventType) {
    case 'payment.captured':       return handlePaymentCaptured(payload, supabase);
    case 'payment.failed':         return handlePaymentFailed(payload, supabase);
    case 'subscription.activated': return handleSubscriptionActivated(payload, supabase);
    case 'subscription.charged':   return handleSubscriptionCharged(payload, supabase);
    case 'subscription.cancelled': return handleSubscriptionCancelled(payload, supabase);
    case 'payment.refunded':       return handlePaymentRefunded(payload, supabase);
    default:
      console.warn('unhandled_webhook_event', eventType);
  }
}

async function getWallet(userId: string, supabase: SupabaseClient) {
  const { data } = await supabase
    .from('credit_wallets')
    .select('id')
    .eq('owner_id', userId)
    .eq('owner_kind', 'user')
    .single();
  return data;
}

async function handlePaymentCaptured(payload: Record<string, unknown>, supabase: SupabaseClient) {
  const payment = (payload.payment as Record<string, unknown>).entity as Record<string, unknown>;
  const notes = payment.notes as Record<string, string> | undefined;
  const userId = notes?.userId;
  const packId = notes?.packId;
  const credits = Number(notes?.credits ?? 0);

  await supabase
    .from('payments')
    .update({ status: 'captured', razorpay_payment_id: payment.id })
    .eq('razorpay_order_id', payment.order_id);

  if (packId && credits > 0 && userId) {
    const wallet = await getWallet(userId, supabase);
    if (wallet) {
      await supabase.rpc('fn_credit_topup', {
        p_wallet_id: wallet.id,
        p_amount: credits,
        p_payment_id: payment.id,
      });
    }
  }

  if (userId) {
    await applyTrustEvent(userId, 'payment_success');
    await sendEmail('payment_captured', userId, {
      amount: Number(payment.amount) / 100,
      currency: payment.currency,
      credits,
    });
  }
}

async function handlePaymentFailed(payload: Record<string, unknown>, supabase: SupabaseClient) {
  const payment = (payload.payment as Record<string, unknown>).entity as Record<string, unknown>;
  const notes = payment.notes as Record<string, string> | undefined;
  await supabase
    .from('payments')
    .update({ status: 'failed', razorpay_payment_id: payment.id })
    .eq('razorpay_order_id', payment.order_id);
  if (notes?.userId) {
    await sendEmail('payment_failed', notes.userId, {
      reason: (payment.error_description as string) ?? 'Payment failed',
    });
  }
}

async function handleSubscriptionActivated(payload: Record<string, unknown>, supabase: SupabaseClient) {
  const sub = (payload.subscription as Record<string, unknown>).entity as Record<string, unknown>;
  const notes = sub.notes as Record<string, string> | undefined;
  const userId = notes?.userId;
  const planId = notes?.planId;

  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      period_start: new Date(Number(sub.current_start) * 1000).toISOString(),
      period_end: new Date(Number(sub.current_end) * 1000).toISOString(),
    })
    .eq('razorpay_subscription_id', sub.id);

  if (userId && planId) {
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('monthly_credits')
      .eq('id', planId)
      .single();
    if (plan) {
      const wallet = await getWallet(userId, supabase);
      if (wallet) {
        await supabase.rpc('fn_credit_topup', {
          p_wallet_id: wallet.id,
          p_amount: plan.monthly_credits,
          p_payment_id: sub.id,
        });
      }
    }
    await sendEmail('subscription_activated', userId, { planId });
  }
}

async function handleSubscriptionCharged(payload: Record<string, unknown>, supabase: SupabaseClient) {
  const sub = (payload.subscription as Record<string, unknown>).entity as Record<string, unknown>;
  const notes = sub.notes as Record<string, string> | undefined;
  const userId = notes?.userId;
  const planId = notes?.planId;

  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      period_start: new Date(Number(sub.current_start) * 1000).toISOString(),
      period_end: new Date(Number(sub.current_end) * 1000).toISOString(),
    })
    .eq('razorpay_subscription_id', sub.id);

  if (userId && planId) {
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('monthly_credits')
      .eq('id', planId)
      .single();
    if (plan) {
      const wallet = await getWallet(userId, supabase);
      const paymentId = (payload.payment as Record<string, unknown> | undefined)?.entity as Record<string, unknown> | undefined;
      if (wallet) {
        await supabase.rpc('fn_credit_topup', {
          p_wallet_id: wallet.id,
          p_amount: plan.monthly_credits,
          p_payment_id: (paymentId?.id as string) ?? (sub.id as string),
        });
      }
    }
  }
}

async function handleSubscriptionCancelled(payload: Record<string, unknown>, supabase: SupabaseClient) {
  const sub = (payload.subscription as Record<string, unknown>).entity as Record<string, unknown>;
  const notes = sub.notes as Record<string, string> | undefined;
  await supabase
    .from('subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('razorpay_subscription_id', sub.id);
  if (notes?.userId) {
    await sendEmail('subscription_cancelled', notes.userId, {});
  }
}

async function handlePaymentRefunded(payload: Record<string, unknown>, supabase: SupabaseClient) {
  const refund = (payload.refund as Record<string, unknown>).entity as Record<string, unknown>;
  const paymentEntity = (payload.payment as Record<string, unknown> | undefined)?.entity as Record<string, unknown> | undefined;
  const paymentId = paymentEntity?.id ?? refund.payment_id;

  await supabase
    .from('payments')
    .update({ status: 'refunded' })
    .eq('razorpay_payment_id', paymentId);

  const notes = paymentEntity?.notes as Record<string, string> | undefined;
  const credits = Number(notes?.credits ?? 0);
  const userId = notes?.userId;
  if (userId && credits > 0) {
    const wallet = await getWallet(userId, supabase);
    if (wallet) {
      await supabase.rpc('fn_credit_topup', {
        p_wallet_id: wallet.id,
        p_amount: -credits,
        p_payment_id: refund.id,
      });
    }
    await sendEmail('payment_refunded', userId, { amount: Number(refund.amount) / 100 });
  }
}
