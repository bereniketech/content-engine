'use client';
import { useState, useEffect } from 'react';

type AlertItem = {
  id: string;
  action_type: string;
  target_user_id: string | null;
  reason: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/alerts?limit=100')
      .then((r) => r.json())
      .then((j) => { setAlerts(j.items ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Alerts Feed</h1>
      {loading && <p className="text-gray-400">Loading…</p>}
      <div className="space-y-2">
        {alerts.map((a) => (
          <div key={a.id} className="rounded border border-gray-800 bg-gray-900 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <span className="rounded bg-indigo-900/40 px-2 py-0.5 text-xs text-indigo-300">{a.action_type}</span>
              <span className="text-xs text-gray-500">{new Date(a.created_at).toLocaleString()}</span>
            </div>
            {a.reason && <p className="mt-1 text-sm text-gray-300">{a.reason}</p>}
            {a.target_user_id && (
              <p className="mt-0.5 text-xs text-gray-500">
                User: <a href={`/admin/users/${a.target_user_id}`} className="text-indigo-400 hover:underline">{a.target_user_id.slice(0, 8)}…</a>
              </p>
            )}
          </div>
        ))}
        {!loading && alerts.length === 0 && (
          <p className="text-gray-500">No alerts.</p>
        )}
      </div>
    </div>
  );
}
