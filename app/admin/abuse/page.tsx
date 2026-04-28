'use client';
import { useState, useEffect } from 'react';

type AbuseLog = {
  id: string;
  event_type: string;
  ip_address: string;
  fingerprint_hash: string;
  email: string;
  created_at: string;
};

export default function AdminAbusePage() {
  const [logs, setLogs] = useState<AbuseLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [filters, setFilters] = useState({ ip: '', email: '', event_type: '' });

  async function load(reset = false) {
    setLoading(true);
    const params = new URLSearchParams({ limit: '50' });
    if (filters.ip) params.set('ip', filters.ip);
    if (filters.email) params.set('email', filters.email);
    if (filters.event_type) params.set('event_type', filters.event_type);
    if (!reset && cursor) params.set('cursor', cursor);
    const res = await fetch(`/api/admin/abuse-log?${params}`);
    const json = await res.json();
    setLogs(reset ? (json.items ?? []) : (prev: AbuseLog[]) => [...prev, ...(json.items ?? [])]);
    setCursor(json.next_cursor ?? null);
    setLoading(false);
  }

  useEffect(() => { load(true); }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Abuse Log</h1>
      <div className="mb-4 flex flex-wrap gap-2">
        {(['ip', 'email', 'event_type'] as const).map((key) => (
          <input
            key={key}
            type="text"
            placeholder={key === 'event_type' ? 'Event type…' : `Filter by ${key}…`}
            value={filters[key]}
            onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
            aria-label={`Filter by ${key}`}
            className="rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        ))}
      </div>
      <div className="overflow-x-auto rounded border border-gray-800">
        <table className="w-full text-sm" role="table">
          <thead className="bg-gray-900 text-left text-gray-400">
            <tr>
              {['Event', 'IP', 'Email', 'Fingerprint', 'Time'].map((h) => (
                <th key={h} className="px-4 py-2 font-medium" scope="col">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-gray-800 hover:bg-gray-900/50">
                <td className="px-4 py-2">{log.event_type}</td>
                <td className="px-4 py-2 font-mono text-xs">{log.ip_address}</td>
                <td className="px-4 py-2 text-gray-300">{log.email}</td>
                <td className="px-4 py-2 font-mono text-xs text-gray-500">{log.fingerprint_hash?.slice(0, 12)}…</td>
                <td className="px-4 py-2 text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">No abuse events.</td>
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
