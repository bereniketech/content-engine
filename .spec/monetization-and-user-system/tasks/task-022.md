---
task: 022
feature: monetization-and-user-system
status: pending
model: sonnet
supervisor: software-cto
agent: web-frontend-expert
depends_on: [7, 21]
---

# Task 022: Admin UI — Next.js Admin Pages

## Skills
- .kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md
- .kit/skills/development/build-website-web-app/SKILL.md
- .kit/skills/core/karpathy-principles/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-frontend-expert.md

## Commands
- .kit/commands/core/task-handoff.md
- .kit/commands/development/verify.md

> Load the skills and agents listed above before reading anything else.

---

## Objective
Build the admin panel UI: user list with search, user detail with tabs, payments table, abuse log viewer, domain blocklist editor, and alerts feed — all behind an admin layout guard. Tailwind + shadcn components. WCAG 2.2 AA.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `app/admin/layout.tsx` | Admin guard layout — redirect non-admins |
| `app/admin/page.tsx` | Admin dashboard home — quick stats |
| `app/admin/users/page.tsx` | Paginated user list with search + filters |
| `app/admin/users/[id]/page.tsx` | User detail with sessions/devices/abuse-log/controls tabs |
| `app/admin/payments/page.tsx` | Payments table with filters |
| `app/admin/abuse/page.tsx` | Abuse log viewer with filters |
| `app/admin/blocklist/page.tsx` | Domain blocklist editor (add/remove) |
| `app/admin/alerts/page.tsx` | Recent alerts feed |
| `components/admin/UserTable.tsx` | Reusable paginated user table |
| `components/admin/AbuseLogTable.tsx` | Filterable abuse log table |
| `components/admin/CreditAdjustModal.tsx` | Modal with reason field for credit adjustment |
| `components/admin/BlockUserModal.tsx` | Confirmation modal for blocking a user |

### Modify
_(none)_

---

## Dependencies
```bash
# Already installed: tailwind, shadcn
npm install @tanstack/react-table

# No new ENV vars
```

---

## Code Templates

### `app/admin/layout.tsx`
```tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('account_type')
    .eq('id', user.id)
    .single();

  if (profile?.account_type !== 'admin') redirect('/dashboard');

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="flex items-center gap-6 border-b border-gray-800 px-6 py-3 text-sm">
        <span className="font-semibold text-white">Admin</span>
        <a href="/admin/users" className="text-gray-400 hover:text-white">Users</a>
        <a href="/admin/payments" className="text-gray-400 hover:text-white">Payments</a>
        <a href="/admin/abuse" className="text-gray-400 hover:text-white">Abuse</a>
        <a href="/admin/blocklist" className="text-gray-400 hover:text-white">Blocklist</a>
        <a href="/admin/alerts" className="text-gray-400 hover:text-white">Alerts</a>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
```

### `app/admin/users/page.tsx`
```tsx
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
    setUsers(reset ? json.users : (prev) => [...prev, ...json.users]);
    setCursor(json.next_cursor);
    setLoading(false);
  }

  useEffect(() => { load(true); }, [search]);

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
```

### `app/admin/users/[id]/page.tsx`
```tsx
'use client';
import { useState, useEffect } from 'react';
import CreditAdjustModal from '@/components/admin/CreditAdjustModal';
import BlockUserModal from '@/components/admin/BlockUserModal';

export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState<'overview' | 'devices' | 'abuse'>('overview');
  const [showAdjust, setShowAdjust] = useState(false);
  const [showBlock, setShowBlock] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/users?q=${params.id}&limit=1`)
      .then((r) => r.json())
      .then((j) => setUser(j.users?.[0]));
  }, [params.id]);

  if (!user) return <p className="text-gray-400">Loading…</p>;

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">{user.email}</h1>
      <p className="mb-4 text-sm text-gray-400">
        {user.account_type} · {user.account_status} · Trust: {user.trust_score} · {user.country_code}
      </p>

      <div className="mb-4 flex gap-2">
        <button onClick={() => setShowAdjust(true)} className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500">
          Adjust Credits
        </button>
        {user.account_status !== 'blocked' ? (
          <button onClick={() => setShowBlock(true)} className="rounded bg-red-700 px-3 py-1.5 text-sm text-white hover:bg-red-600">
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
        {(['overview', 'devices', 'abuse'] as const).map((t) => (
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
        <div className="text-sm text-gray-300">
          <p>Balance: {user.credit_wallets?.[0]?.balance ?? 0}</p>
          <p>Email verified: {user.email_verified ? 'Yes' : 'No'}</p>
          <p>Created: {new Date(user.created_at).toLocaleString()}</p>
          <p>Last active: {user.last_active_at ? new Date(user.last_active_at).toLocaleString() : '—'}</p>
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
```

### `components/admin/CreditAdjustModal.tsx`
```tsx
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
    <div role="dialog" aria-modal="true" aria-labelledby="adjust-title" className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
      <div className="w-full max-w-sm rounded-lg bg-gray-900 p-6">
        <h2 id="adjust-title" className="mb-4 text-lg font-semibold text-white">Adjust Credits</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="delta" className="block text-sm text-gray-400">Delta (positive = grant, negative = deduct)</label>
            <input id="delta" type="number" value={delta} onChange={(e) => setDelta(e.target.value)} required
              className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white" />
          </div>
          <div>
            <label htmlFor="reason" className="block text-sm text-gray-400">Reason (min 10 chars)</label>
            <textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} required minLength={10} rows={3}
              className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white" />
          </div>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500">Apply</button>
            <button type="button" onClick={onClose} className="rounded bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### `components/admin/BlockUserModal.tsx`
```tsx
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
    <div role="dialog" aria-modal="true" aria-labelledby="block-title" className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
      <div className="w-full max-w-sm rounded-lg bg-gray-900 p-6">
        <h2 id="block-title" className="mb-4 text-lg font-semibold text-white">Block User</h2>
        <p className="mb-3 text-sm text-gray-400">This will immediately invalidate all active sessions.</p>
        <label htmlFor="block-reason" className="block text-sm text-gray-400">Reason</label>
        <input id="block-reason" type="text" value={reason} onChange={(e) => setReason(e.target.value)}
          className="mt-1 mb-4 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white" />
        <div className="flex gap-2">
          <button onClick={confirm} className="rounded bg-red-700 px-4 py-2 text-sm text-white hover:bg-red-600">Block</button>
          <button onClick={onClose} className="rounded bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600">Cancel</button>
        </div>
      </div>
    </div>
  );
}
```

---

## Codebase Context

### Key Patterns in Use
- **Server component layout guard:** `app/admin/layout.tsx` is a server component — reads Supabase session and redirects before rendering.
- **Client component pages:** fetch admin APIs from client components for interactivity (search, pagination, modals).
- **Sticky first column:** at `<lg` breakpoints, table uses `overflow-x-auto` with email column sticky.
- **ARIA:** dialogs have `role=dialog aria-modal=true`; tab panels use `role=tablist/tab`; tables use `role=table scope=col`.

---

## Handoff from Previous Task
**Files changed by task 21:** all admin API endpoints.
**Files changed by task 7:** middleware injects x-user-id.
**Context for this task:** Admin APIs are fully functional — UI just calls them.

---

## Implementation Steps
1. `app/admin/layout.tsx` — server guard.
2. `app/admin/users/page.tsx` — user list.
3. `app/admin/users/[id]/page.tsx` — user detail.
4. `components/admin/CreditAdjustModal.tsx` + `BlockUserModal.tsx`.
5. `app/admin/payments/page.tsx`, `app/admin/abuse/page.tsx`, `app/admin/blocklist/page.tsx`, `app/admin/alerts/page.tsx` — simpler list views following same pattern.
6. `npx tsc --noEmit`
7. Run dev server, navigate to `/admin`, test all pages.
8. Run: `/verify`

_Requirements: 23, 28_

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| Non-admin visits /admin/* | Server layout redirects to /dashboard |
| Credit adjust reason < 10 chars | Client-side validation + API returns 400 |
| Block confirmed | Sessions invalidated; UI reloads |
| Table wider than viewport | overflow-x-auto; email column sticky |

---

## Acceptance Criteria
- [ ] Non-admin redirected from `/admin`
- [ ] Admin can search users, view detail, adjust credits with reason modal
- [ ] Block button invalidates sessions; unblock button appears after block
- [ ] Domain blocklist: add and remove domains via UI
- [ ] Pages keyboard-navigable (tab, enter, esc on modals)
- [ ] AA contrast on all text (4.5:1 minimum)
- [ ] Responsive: no horizontal scroll at 1280px+; table scrolls at <md
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
