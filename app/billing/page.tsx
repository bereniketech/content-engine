'use client';
import { useState, useEffect } from 'react';

type PaymentRow = {
  id: string;
  razorpay_payment_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
};

export default function BillingPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(reset = false) {
    setLoading(true);
    const params = new URLSearchParams({ limit: '20' });
    if (!reset && cursor) params.set('cursor', cursor);
    const res = await fetch(`/api/billing/history?${params}`);
    const json = await res.json();
    setPayments(reset ? (json.items ?? []) : (prev: PaymentRow[]) => [...prev, ...(json.items ?? [])]);
    setCursor(json.next_cursor ?? null);
    setLoading(false);
  }

  useEffect(() => { load(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-3xl py-8 px-4">
      <h1 className="mb-6 text-2xl font-bold text-white">Billing History</h1>
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
                <td className="px-4 py-2 font-mono text-xs text-gray-300">{p.razorpay_payment_id}</td>
                <td className="px-4 py-2">
                  {p.currency} {(p.amount / 100).toFixed(2)}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs ${
                    p.status === 'captured' ? 'bg-green-900/40 text-green-400' :
                    p.status === 'failed' ? 'bg-red-900/40 text-red-400' :
                    'bg-yellow-900/40 text-yellow-400'
                  }`}>{p.status}</span>
                </td>
              </tr>
            ))}
            {!loading && payments.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">No billing history.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {cursor && (
        <button
          onClick={() => load(false)}
          disabled={loading}
          className="mt-4 rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
