'use client';
import { useState } from 'react';

export default function BlockUserModal({
  userId,
  onClose,
  onSuccess,
}: {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState('');

  async function confirm() {
    await fetch(`/api/admin/users/${userId}/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    onSuccess();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="block-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="w-full max-w-sm rounded-lg bg-gray-900 p-6">
        <h2 id="block-title" className="mb-4 text-lg font-semibold text-white">Block User</h2>
        <p className="mb-3 text-sm text-gray-400">This will immediately invalidate all active sessions.</p>
        <label htmlFor="block-reason" className="block text-sm text-gray-400">Reason</label>
        <input
          id="block-reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1 mb-4 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <div className="flex gap-2">
          <button onClick={confirm} className="rounded bg-red-700 px-4 py-2 text-sm text-white hover:bg-red-600">
            Block
          </button>
          <button onClick={onClose} className="rounded bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
