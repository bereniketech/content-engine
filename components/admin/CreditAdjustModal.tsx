'use client';
import { useState } from 'react';

export default function CreditAdjustModal({
  userId,
  onClose,
  onSuccess,
}: {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.length < 10) { setError('Reason must be at least 10 characters.'); return; }
    const res = await fetch(`/api/admin/users/${userId}/credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta: parseInt(delta), reason }),
    });
    if (res.ok) onSuccess();
    else { const j = await res.json(); setError(j.error); }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="adjust-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="w-full max-w-sm rounded-lg bg-gray-900 p-6">
        <h2 id="adjust-title" className="mb-4 text-lg font-semibold text-white">Adjust Credits</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="delta" className="block text-sm text-gray-400">
              Delta (positive = grant, negative = deduct)
            </label>
            <input
              id="delta"
              type="number"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              required
              className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="reason" className="block text-sm text-gray-400">Reason (min 10 chars)</label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={10}
              rows={3}
              className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500">
              Apply
            </button>
            <button type="button" onClick={onClose} className="rounded bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
