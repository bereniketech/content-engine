'use client';
import { useState, useEffect } from 'react';

type Domain = {
  domain: string;
  reason: string;
  added_at: string;
};

export default function AdminBlocklistPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [newReason, setNewReason] = useState('');
  const [error, setError] = useState('');

  async function fetchDomains() {
    const res = await fetch('/api/admin/blocklist/domains');
    const json = await res.json();
    setDomains(json.domains ?? []);
  }

  useEffect(() => { fetchDomains(); }, []);

  async function addDomain(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/admin/blocklist/domains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: newDomain, reason: newReason }),
    });
    if (res.ok) {
      setNewDomain('');
      setNewReason('');
      fetchDomains();
    } else {
      const j = await res.json();
      setError(j.error);
    }
  }

  async function removeDomain(domain: string) {
    await fetch(`/api/admin/blocklist/domains/${encodeURIComponent(domain)}`, { method: 'DELETE' });
    fetchDomains();
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Domain Blocklist</h1>

      <form onSubmit={addDomain} className="mb-6 flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="new-domain" className="block text-xs text-gray-400 mb-1">Domain</label>
          <input
            id="new-domain"
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="e.g. mailinator.com"
            required
            className="rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="new-reason" className="block text-xs text-gray-400 mb-1">Reason</label>
          <input
            id="new-reason"
            type="text"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            placeholder="Optional reason"
            className="rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <button type="submit" className="rounded bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-500">
          Add
        </button>
        {error && <p role="alert" className="w-full text-sm text-red-400">{error}</p>}
      </form>

      <div className="overflow-x-auto rounded border border-gray-800">
        <table className="w-full text-sm" role="table">
          <thead className="bg-gray-900 text-left text-gray-400">
            <tr>
              {['Domain', 'Reason', 'Added', ''].map((h, i) => (
                <th key={i} className="px-4 py-2 font-medium" scope="col">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {domains.map((d) => (
              <tr key={d.domain} className="border-t border-gray-800 hover:bg-gray-900/50">
                <td className="px-4 py-2 font-mono text-xs">{d.domain}</td>
                <td className="px-4 py-2 text-gray-400">{d.reason || '—'}</td>
                <td className="px-4 py-2 text-gray-400">{new Date(d.added_at).toLocaleDateString()}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => removeDomain(d.domain)}
                    className="rounded bg-red-900/40 px-2 py-0.5 text-xs text-red-400 hover:bg-red-900/60"
                    aria-label={`Remove ${d.domain}`}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {domains.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">No blocked domains.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
