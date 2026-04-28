'use client';

type BannerType = 'email-not-verified' | 'subscription-past-due' | 'low-credits' | 'account-restricted';

const BANNERS: Record<BannerType, { bg: string; message: string; cta?: { label: string; href: string } }> = {
  'email-not-verified': {
    bg: 'bg-yellow-900/40 border-yellow-700',
    message: 'Please verify your email to unlock all features and free credits.',
    cta: { label: 'Resend code', href: '/account?verify=1' },
  },
  'subscription-past-due': {
    bg: 'bg-red-900/40 border-red-700',
    message: 'Your payment failed. Please update your payment method to avoid service interruption.',
    cta: { label: 'Update payment', href: '/billing' },
  },
  'low-credits': {
    bg: 'bg-orange-900/40 border-orange-700',
    message: 'Your credit balance is running low.',
    cta: { label: 'Top up', href: '/pricing' },
  },
  'account-restricted': {
    bg: 'bg-red-900/40 border-red-700',
    message: 'Your account has been restricted. Contact support for assistance.',
  },
};

export default function StatusBanner({ type }: { type: BannerType }) {
  const banner = BANNERS[type];
  return (
    <div role="alert" className={`mb-4 flex items-center justify-between rounded border px-4 py-3 text-sm ${banner.bg}`}>
      <span className="text-gray-200">{banner.message}</span>
      {banner.cta && (
        <a href={banner.cta.href} className="ml-4 shrink-0 font-medium text-white underline hover:no-underline">
          {banner.cta.label}
        </a>
      )}
    </div>
  );
}
