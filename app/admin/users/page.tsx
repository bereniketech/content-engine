'use client';
import { useState, useEffect } from 'react';

type User = {
  id: string;
  email: string;
  account_type: string;
  account_status: string;
  trust_score: number;
  country_code: string;
  email_verified: boolean;
  created_at: string;
  last_active_at: string | null;
  credit_wallets: { balance: number }[];
  subscriptions: { status: string }[];
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(reset = false) {
    setLoading(true);
    const params = new URLSearchParams({ limit: '50' });
    if (search) params.set('q', search);
    if (!reset && cursor) params.set('cursor', cursor);
    const res = await fetch(`/api/admin/users?${params}`);
    const json = await res.json();
    setUsers(reset ? json.users : (prev: User[]) => [...prev, ...json.users]);
    setCursor(json.next_cursor);
    setLoading(false);
  }

  useEffect(() => { load(true); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Users</h1>
      <input
        type="search"
        placeholder="Search by email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-sm rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        aria-label="Search users"
      />
      <div className="overflow-x-auto rounded border border-gray-800">
        <table className="w-full text-sm" role="table">
          <thead className="bg-gray-900 text-left text-gray-400">
            <tr>
              {['Email', 'Type', 'Status', 'Trust', 'Balance', 'Country', 'Verified', 'Last Active'].map((h) => (
                <th key={h} className="sticky top-0 px-4 py-2 font-medium" scope="col">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-gray-800 hover:bg-gray-900/50">
                <td className="px-4 py-2">
                  <a href={`/admin/users/${u.id}`} className="text-indigo-400 hover:underline">{u.email}</a>
                </td>
                <td className="px-4 py-2">{u.account_type}</td>
                <td className="px-4 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs ${
                    u.account_status === 'blocked' ? 'bg-red-900/40 text-red-400' :
                    u.account_status === 'active' ? 'bg-green-900/40 text-green-400' :
                    'bg-yellow-900/40 text-yellow-400'
                  }`}>{u.account_status}</span>
                </td>
                <td className="px-4 py-2">{u.trust_score}</td>
                <td className="px-4 py-2">{u.credit_wallets?.[0]?.balance ?? 0}</td>
                <td className="px-4 py-2">{u.country_code}</td>
                <td className="px-4 py-2">{u.email_verified ? '✓' : '✗'}</td>
                <td className="px-4 py-2 text-gray-400">
                  {u.last_active_at ? new Date(u.last_active_at).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
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
