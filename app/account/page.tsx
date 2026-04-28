'use client';
import { useState, useEffect } from 'react';

type SessionRow = { id: string; user_agent: string; last_seen_ip: string; last_seen_at: string };

export default function AccountPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    fetch('/api/auth/sessions')
      .then((r) => r.json())
      .then((j) => setSessions(j.sessions ?? []));
  }, []);

  async function revoke(id: string) {
    await fetch(`/api/auth/sessions/${id}`, { method: 'DELETE' });
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="mx-auto max-w-2xl py-8 px-4">
      <h1 className="mb-6 text-2xl font-bold text-white">Account</h1>
      <section aria-labelledby="sessions-heading">
        <h2 id="sessions-heading" className="mb-3 text-lg font-semibold text-white">Active Sessions</h2>
        <ul className="space-y-2" role="list">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded border border-gray-800 bg-gray-900 px-4 py-3 text-sm"
            >
              <div>
                <p className="max-w-xs truncate text-gray-200">{s.user_agent || 'Unknown device'}</p>
                <p className="text-xs text-gray-500">
                  {s.last_seen_ip} · Last seen {new Date(s.last_seen_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => revoke(s.id)}
                aria-label={`Revoke session for ${s.user_agent}`}
                className="ml-4 text-xs text-red-400 underline hover:text-red-300"
              >
                Revoke
              </button>
            </li>
          ))}
          {sessions.length === 0 && (
            <li className="text-sm text-gray-500">No active sessions found.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
