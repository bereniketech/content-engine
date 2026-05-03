'use client';
import { useState, useEffect, useCallback } from 'react';

type PaymentRow = {
  id: string;
  razorpay_payment_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
};

type CreditPack = {
  id: string;
  name: string;
  credits_granted: number;
  base_usd_price: number;
};

declare global {
  interface Window {
    Razorpay: new (opts: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function BillingPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [packsLoading, setPacksLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const razorpayEnabled = Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const loadHistory = useCallback(async (reset = false) => {
    setHistoryLoading(true);
    const params = new URLSearchParams({ limit: '20' });
    if (!reset && cursor) params.set('cursor', cursor);
    const res = await fetch(`/api/billing/history?${params}`);
    const json = await res.json();
    setPayments(reset
      ? (json.items ?? [])
      : (prev: PaymentRow[]) => [...prev, ...(json.items ?? [])]);
    setCursor(json.next_cursor ?? null);
    setHistoryLoading(false);
  }, [cursor]);

  useEffect(() => { loadHistory(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch('/api/credits/packs')
      .then((r) => r.json())
      .then((j) => setPacks(j.packs ?? []))
      .finally(() => setPacksLoading(false));
  }, []);

  async function handleBuy(pack: CreditPack) {
    if (!razorpayEnabled) return;
    setBuying(pack.id);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) { showToast('Failed to load payment SDK.', false); return; }

      const res = await fetch('/api/credits/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack_id: pack.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error ?? 'Could not create order.', false);
        return;
      }
      const { razorpay_order_id, amount, currency, key_id } = await res.json();

      const rzp = new window.Razorpay({
        key: key_id,
        order_id: razorpay_order_id,
        amount,
        currency,
        name: 'Content Studio',
        description: `${pack.name} — ${pack.credits_granted.toLocaleString()} credits`,
        theme: { color: '#6366f1' },
        handler: () => {
          showToast(`Payment successful! ${pack.credits_granted.toLocaleString()} credits will be added shortly.`, true);
          loadHistory(true);
        },
        modal: {
          ondismiss: () => setBuying(null),
        },
      });
      rzp.open();
    } catch {
      showToast('Something went wrong. Please try again.', false);
    } finally {
      setBuying(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl py-8 px-4 space-y-10">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded px-4 py-3 text-sm font-medium shadow-lg ${
          toast.ok ? 'bg-green-900/90 text-green-300' : 'bg-red-900/90 text-red-300'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Buy Credits */}
      <section>
        <h1 className="mb-1 text-2xl font-bold text-white">Buy Credits</h1>
        {!razorpayEnabled && (
          <p className="mb-4 text-xs text-yellow-500">
            Payment is not configured. Add <code>NEXT_PUBLIC_RAZORPAY_KEY_ID</code> to enable purchases.
          </p>
        )}
        {packsLoading ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl border border-gray-800 bg-gray-900" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {packs.map((pack) => (
              <div key={pack.id} className="flex flex-col rounded-xl border border-gray-800 bg-gray-900 p-5">
                <p className="text-sm font-medium text-gray-400">{pack.name}</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {pack.credits_granted.toLocaleString()}
                  <span className="ml-1 text-sm font-normal text-gray-400">credits</span>
                </p>
                <p className="mt-0.5 text-xs text-gray-500">${pack.base_usd_price} USD</p>
                <button
                  onClick={() => handleBuy(pack)}
                  disabled={!razorpayEnabled || buying === pack.id}
                  className="mt-4 rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white
                    hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 transition-opacity"
                >
                  {buying === pack.id ? 'Opening…' : 'Buy now'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Payment History */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-white">Billing History</h2>
        <div className="overflow-x-auto rounded border border-gray-800">
          <table className="w-full text-sm" role="table">
            <thead className="bg-gray-900 text-left text-gray-400">
              <tr>
                {['Date', 'Payment ID', 'Amount', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-2 font-medium" scope="col">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-gray-800">
                  <td className="px-4 py-2 text-gray-400">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-300">{p.razorpay_payment_id ?? '—'}</td>
                  <td className="px-4 py-2">
                    {p.currency} {(p.amount / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs ${
                      p.status === 'captured' ? 'bg-green-900/40 text-green-400' :
                      p.status === 'failed'   ? 'bg-red-900/40 text-red-400' :
                                                'bg-yellow-900/40 text-yellow-400'
                    }`}>{p.status}</span>
                  </td>
                </tr>
              ))}
              {!historyLoading && payments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">No billing history.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {cursor && (
          <button
            onClick={() => loadHistory(false)}
            disabled={historyLoading}
            className="mt-4 rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {historyLoading ? 'Loading…' : 'Load more'}
          </button>
        )}
      </section>
    </div>
  );
}
