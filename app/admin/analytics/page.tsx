'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#ef4444', '#f97316', '#22c55e', '#6366f1'];

export default function AdminAnalyticsPage() {
  const [revenue, setRevenue] = useState<any>(null);
  const [abuse, setAbuse] = useState<any>(null);
  const [conversion, setConversion] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/metrics/revenue').then((r) => r.json()).then(setRevenue);
    fetch('/api/admin/metrics/abuse').then((r) => r.json()).then(setAbuse);
    fetch('/api/admin/metrics/conversion').then((r) => r.json()).then(setConversion);
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-white">Analytics</h1>

      {conversion && (
        <section aria-labelledby="conversion-heading">
          <h2 id="conversion-heading" className="mb-3 font-semibold text-white">Conversion</h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Free→Paid Rate', value: `${((conversion.free_to_paid_rate ?? 0) * 100).toFixed(1)}%` },
              { label: 'ARPU', value: `$${(conversion.arpu ?? 0).toFixed(2)}` },
              { label: 'Failed Payment Rate', value: `${((conversion.failed_payment_rate ?? 0) * 100).toFixed(1)}%` },
              { label: 'Total Users (30d)', value: String(conversion.total_users ?? '—') },
            ].map(({ label, value }) => (
              <div key={label} className="rounded border border-gray-800 bg-gray-900 p-4">
                <dt className="text-xs text-gray-400">{label}</dt>
                <dd className="mt-1 text-xl font-bold text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {revenue && (
        <section aria-labelledby="revenue-heading">
          <h2 id="revenue-heading" className="mb-3 font-semibold text-white">
            Revenue by Country · MRR ${(revenue.mrr ?? 0).toFixed(0)}
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenue.by_country ?? []} aria-label="Revenue by country bar chart">
              <XAxis dataKey="country_code" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
              <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {abuse && (
        <section aria-labelledby="trust-heading">
          <h2 id="trust-heading" className="mb-3 font-semibold text-white">Trust Score Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart aria-label="Trust score distribution pie chart">
              <Pie data={abuse.trust_histogram ?? []} dataKey="count" nameKey="range" cx="50%" cy="50%" outerRadius={80}>
                {(abuse.trust_histogram ?? []).map((_: unknown, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
            </PieChart>
          </ResponsiveContainer>
        </section>
      )}
    </div>
  );
}
