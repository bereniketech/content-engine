'use client';
import { useState, useEffect } from 'react';
import CreditAdjustModal from '@/components/admin/CreditAdjustModal';
import BlockUserModal from '@/components/admin/BlockUserModal';

type AbuseLog = {
  id: string;
  event_type: string;
  ip_address: string;
  created_at: string;
};

export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<any>(null);
  const [abuseLogs, setAbuseLogs] = useState<AbuseLog[]>([]);
  const [tab, setTab] = useState<'overview' | 'abuse'>('overview');
  const [showAdjust, setShowAdjust] = useState(false);
  const [showBlock, setShowBlock] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/users?q=${params.id}&limit=1`)
      .then((r) => r.json())
      .then((j) => setUser(j.users?.[0]));
  }, [params.id]);

  useEffect(() => {
    if (tab === 'abuse') {
      fetch(`/api/admin/abuse-log?email=${encodeURIComponent(user?.email ?? '')}&limit=50`)
        .then((r) => r.json())
        .then((j) => setAbuseLogs(j.items ?? []));
    }
  }, [tab, user?.email]);

  if (!user) return <p className="text-gray-400">Loading…</p>;

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">{user.email}</h1>
      <p className="mb-4 text-sm text-gray-400">
        {user.account_type} · {user.account_status} · Trust: {user.trust_score} · {user.country_code}
      </p>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setShowAdjust(true)}
          className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500"
        >
          Adjust Credits
        </button>
        {user.account_status !== 'blocked' ? (
          <button
            onClick={() => setShowBlock(true)}
            className="rounded bg-red-700 px-3 py-1.5 text-sm text-white hover:bg-red-600"
          >
            Block
          </button>
        ) : (
          <button
            onClick={async () => {
              await fetch(`/api/admin/users/${params.id}/unblock`, { method: 'POST' });
              location.reload();
            }}
            className="rounded bg-green-700 px-3 py-1.5 text-sm text-white hover:bg-green-600"
          >
            Unblock
          </button>
        )}
      </div>

      <div role="tablist" className="mb-4 flex gap-4 border-b border-gray-800">
        {(['overview', 'abuse'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`pb-2 text-sm capitalize ${tab === t ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-1 text-sm text-gray-300">
          <p>Balance: {user.credit_wallets?.[0]?.balance ?? 0}</p>
          <p>Email verified: {user.email_verified ? 'Yes' : 'No'}</p>
          <p>Created: {new Date(user.created_at).toLocaleString()}</p>
          <p>Last active: {user.last_active_at ? new Date(user.last_active_at).toLocaleString() : '—'}</p>
        </div>
      )}

      {tab === 'abuse' && (
        <div className="overflow-x-auto rounded border border-gray-800">
          <table className="w-full text-sm" role="table">
            <thead className="bg-gray-900 text-left text-gray-400">
              <tr>
                {['Event', 'IP', 'Time'].map((h) => (
                  <th key={h} className="px-4 py-2 font-medium" scope="col">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {abuseLogs.map((log) => (
                <tr key={log.id} className="border-t border-gray-800">
                  <td className="px-4 py-2">{log.event_type}</td>
                  <td className="px-4 py-2 font-mono text-xs">{log.ip_address}</td>
                  <td className="px-4 py-2 text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {abuseLogs.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-500">No abuse events found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdjust && (
        <CreditAdjustModal
          userId={params.id}
          onClose={() => setShowAdjust(false)}
          onSuccess={() => { setShowAdjust(false); location.reload(); }}
        />
      )}
      {showBlock && (
        <BlockUserModal
          userId={params.id}
          onClose={() => setShowBlock(false)}
          onSuccess={() => { setShowBlock(false); location.reload(); }}
        />
      )}
    </div>
  );
}
