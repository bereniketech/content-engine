export type TemplateId =
  | 'magic_link'
  | 'signup_verify_otp'
  | 'signup_verify_resend'
  | 'welcome'
  | 'payment_captured'
  | 'payment_failed'
  | 'subscription_activated'
  | 'subscription_renewed'
  | 'subscription_past_due'
  | 'subscription_cancelled'
  | 'low_credits_alert'
  | 'team_invite'
  | 'team_member_removed'
  | 'account_blocked'
  | 'payment_refunded';

export type TemplateData = Record<string, unknown>;

export function buildEmail(
  template: TemplateId,
  data: TemplateData
): { subject: string; html: string; text: string } {
  switch (template) {
    case 'magic_link':
      return {
        subject: 'Your login link',
        html: `<p>Click to log in: <a href="${data.magicUrl}">Log in</a>. Expires in 15 minutes.</p>`,
        text: `Log in here: ${data.magicUrl}\nExpires in 15 minutes.`,
      };
    case 'signup_verify_otp':
      return {
        subject: 'Verify your email',
        html: `<p>Your verification code: <strong>${data.otp}</strong>. Valid for 10 minutes.</p>`,
        text: `Your verification code: ${data.otp}. Valid for 10 minutes.`,
      };
    case 'signup_verify_resend':
      return {
        subject: 'New verification code',
        html: `<p>Your new code: <strong>${data.otp}</strong>. Valid for 10 minutes.</p>`,
        text: `Your new code: ${data.otp}. Valid for 10 minutes.`,
      };
    case 'welcome':
      return {
        subject: 'Welcome to Content Engine',
        html: `<p>Hi ${data.email}, your account is ready. You have ${data.credits} free credits to get started.</p>`,
        text: `Welcome! You have ${data.credits} free credits to get started.`,
      };
    case 'payment_captured':
      return {
        subject: 'Payment confirmed',
        html: `<p>Payment of ${data.currency} ${data.amount} confirmed. Your credits have been updated.</p>`,
        text: `Payment of ${data.currency} ${data.amount} confirmed.`,
      };
    case 'payment_failed':
      return {
        subject: 'Payment failed',
        html: `<p>Your payment failed: ${data.reason ?? 'Unknown error'}. Please try again.</p>`,
        text: `Payment failed: ${data.reason ?? 'Unknown error'}.`,
      };
    case 'subscription_activated':
      return {
        subject: 'Subscription activated',
        html: `<p>Your subscription is now active. Credits have been added to your account.</p>`,
        text: `Subscription active. Credits have been added.`,
      };
    case 'subscription_renewed':
      return {
        subject: 'Subscription renewed',
        html: `<p>Your subscription has renewed. Credits added for the new period.</p>`,
        text: `Subscription renewed. Credits added.`,
      };
    case 'subscription_past_due':
      return {
        subject: 'Action required: Payment failed',
        html: `<p>Your subscription payment failed. Please update your payment method to avoid service interruption.</p>`,
        text: `Subscription payment failed. Update your payment method.`,
      };
    case 'subscription_cancelled':
      return {
        subject: 'Subscription cancelled',
        html: `<p>Your subscription has been cancelled. Access continues until ${data.periodEnd}.</p>`,
        text: `Subscription cancelled. Access continues until ${data.periodEnd}.`,
      };
    case 'low_credits_alert':
      return {
        subject: 'Low credit balance',
        html: `<p>Your credit balance is low (${data.balance} credits remaining). <a href="${data.topupUrl}">Top up now</a>.</p>`,
        text: `Low credits: ${data.balance} remaining. Top up at ${data.topupUrl}`,
      };
    case 'team_invite':
      return {
        subject: `You're invited to join ${data.team_name}`,
        html: `<p>You've been invited to ${data.team_name} by ${data.inviter}. <a href="${data.accept_url}">Accept invite</a>. Expires in 48 hours.</p>`,
        text: `Accept invite to ${data.team_name}: ${data.accept_url}`,
      };
    case 'team_member_removed':
      return {
        subject: `Removed from ${data.team_name}`,
        html: `<p>You have been removed from the team ${data.team_name}.</p>`,
        text: `You have been removed from ${data.team_name}.`,
      };
    case 'account_blocked':
      return {
        subject: 'Account suspended',
        html: `<p>Your account has been suspended. Contact support if you believe this is an error.</p>`,
        text: `Your account has been suspended. Contact support if you believe this is an error.`,
      };
    case 'payment_refunded':
      return {
        subject: 'Payment refunded',
        html: `<p>Your payment of ${data.amount} has been refunded.</p>`,
        text: `Your payment of ${data.amount} has been refunded.`,
      };
    default:
      throw new Error(`Unknown template: ${template}`);
  }
}
