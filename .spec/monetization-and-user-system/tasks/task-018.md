---
task: 018
feature: monetization-and-user-system
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: [7, 8, 20]
---

# Task 018: Team CRUD + Invitations

## Skills
- .kit/skills/data-backend/postgres-patterns/SKILL.md
- .kit/skills/development/api-design/SKILL.md
- .kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md
- .kit/skills/testing-quality/security-review/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-backend-expert.md

## Commands
- .kit/commands/core/task-handoff.md
- .kit/commands/development/verify.md

> Load skills and agents listed above before reading anything else.

---

## Objective
Implement team management — create team (auto-creates team wallet, promotes user to team_owner), list members, invite via signed-token email, accept invite, remove member, transfer ownership. RLS handles wallet access; this task covers the API layer + email send.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `app/api/teams/route.ts` | POST create team |
| `app/api/teams/[id]/route.ts` | GET team detail with members |
| `app/api/teams/[id]/invite/route.ts` | POST send invite |
| `app/api/teams/invites/accept/route.ts` | POST accept invite token |
| `app/api/teams/[id]/members/[userId]/route.ts` | DELETE member |
| `app/api/teams/[id]/transfer/route.ts` | POST transfer ownership |
| `lib/teams/invites.ts` | Token generation + hashing helpers |

### Modify
| File | What to change |
|------|---------------|
| `lib/email/sender.ts` | (already implemented in task 20) — used here |

---

## Dependencies
```bash
# npm install (already present)
# ENV:
#   NEXT_PUBLIC_BASE_URL
#   RESEND_API_KEY
```

---

## API Contracts
```
POST /api/teams
Auth: required
Request: { name: string }
Response 200: { team_id: string, team_name: string }
Response 409: { error: "You already own a team." }

GET /api/teams/[id]
Auth: required (must be member)
Response 200: {
  id: string, name: string, owner_user_id: string,
  members: [{ user_id, email, role, joined_at, credits_used_this_period }]
}

POST /api/teams/[id]/invite
Auth: required (must be owner)
Request: { email: string }
Response 200: { message: "Invitation sent" }
Response 409: { error: "Active invite already exists for this email." }

POST /api/teams/invites/accept
Auth: required
Request: { token: string, team_id: string }
Response 200: { message: "Joined team" }
Response 400: { error: "Invalid or expired invite link." }

DELETE /api/teams/[id]/members/[userId]
Auth: required (must be owner)
Response 204

POST /api/teams/[id]/transfer
Auth: required (must be owner)
Request: { new_owner_id: string }
Response 200: { message: "Ownership transferred" }
```

---

## Code Templates

### `lib/teams/invites.ts`
```typescript
import { randomBytes, createHash } from 'crypto';

export function generateInviteToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url');
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

export function hashInviteToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function inviteExpiry(): string {
  return new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
}
```

### `app/api/teams/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name } = await req.json();
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_user_id', user.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'You already own a team.' }, { status: 409 });
  }

  // Use RPC for atomic team+wallet+user_type creation
  const { data, error } = await supabase.rpc('fn_create_team', {
    p_owner_id: user.id,
    p_name: name,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ team_id: data.team_id, team_name: name });
}
```

### `app/api/teams/[id]/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // RLS will enforce membership
  const { data: team, error: teamErr } = await supabase
    .from('teams')
    .select('id, name, owner_user_id')
    .eq('id', params.id)
    .single();
  if (teamErr || !team) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: members } = await supabase
    .from('team_members')
    .select('user_id, role, joined_at, users:users!user_id(email)')
    .eq('team_id', params.id);

  // Aggregate per-member credit usage in current period
  const periodStart = new Date(); periodStart.setDate(1); periodStart.setHours(0, 0, 0, 0);
  const { data: walletRow } = await supabase
    .from('credit_wallets')
    .select('id')
    .eq('owner_id', params.id)
    .eq('owner_kind', 'team')
    .single();

  let usageByUser: Record<string, number> = {};
  if (walletRow) {
    const { data: txRows } = await supabase
      .from('credit_transactions')
      .select('acting_user_id, amount')
      .eq('wallet_id', walletRow.id)
      .lt('amount', 0)
      .gte('created_at', periodStart.toISOString());
    for (const r of txRows ?? []) {
      usageByUser[r.acting_user_id] = (usageByUser[r.acting_user_id] ?? 0) + Math.abs(r.amount);
    }
  }

  return NextResponse.json({
    id: team.id,
    name: team.name,
    owner_user_id: team.owner_user_id,
    members: (members ?? []).map((m: any) => ({
      user_id: m.user_id,
      email: m.users?.email ?? null,
      role: m.role,
      joined_at: m.joined_at,
      credits_used_this_period: usageByUser[m.user_id] ?? 0,
    })),
  });
}
```

### `app/api/teams/[id]/invite/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateInviteToken, inviteExpiry } from '@/lib/teams/invites';
import { sendEmail } from '@/lib/email/sender';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { email } = await req.json();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  const { data: team } = await supabase
    .from('teams')
    .select('id, name, owner_user_id')
    .eq('id', params.id)
    .single();
  if (!team || team.owner_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: existingInvite } = await supabase
    .from('team_invites')
    .select('id')
    .eq('team_id', params.id)
    .eq('invited_email', email)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (existingInvite) {
    return NextResponse.json({ error: 'Active invite already exists for this email.' }, { status: 409 });
  }

  const { raw, hash } = generateInviteToken();

  const { error } = await supabase.from('team_invites').insert({
    team_id: params.id,
    invited_email: email,
    token_hash: hash,
    expires_at: inviteExpiry(),
    invited_by: user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const acceptUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/teams/accept?token=${raw}&team=${params.id}`;
  const { data: inviter } = await supabase.from('users').select('email').eq('id', user.id).single();

  await sendEmail('team_invite', email, {
    inviter: inviter?.email ?? 'A team owner',
    team_name: team.name,
    accept_url: acceptUrl,
  }, user.id);

  return NextResponse.json({ message: 'Invitation sent' });
}
```

### `app/api/teams/invites/accept/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hashInviteToken } from '@/lib/teams/invites';

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { token, team_id } = await req.json();
  if (!token || !team_id) {
    return NextResponse.json({ error: 'token and team_id required' }, { status: 400 });
  }

  const tokenHash = hashInviteToken(token);
  const { data: invite } = await supabase
    .from('team_invites')
    .select('id, invited_email, expires_at, accepted_at')
    .eq('team_id', team_id)
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (!invite || invite.accepted_at !== null || new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired invite link.' }, { status: 400 });
  }

  const { error } = await supabase.rpc('fn_accept_team_invite', {
    p_invite_id: invite.id,
    p_user_id: user.id,
    p_team_id: team_id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message: 'Joined team' });
}
```

### `app/api/teams/[id]/members/[userId]/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/sender';

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; userId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: team } = await supabase
    .from('teams')
    .select('id, name, owner_user_id')
    .eq('id', params.id)
    .single();
  if (!team || team.owner_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (params.userId === team.owner_user_id) {
    return NextResponse.json({ error: 'Cannot remove owner. Transfer first.' }, { status: 400 });
  }

  const { error } = await supabase.rpc('fn_remove_team_member', {
    p_team_id: params.id,
    p_user_id: params.userId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: removed } = await supabase.from('users').select('email').eq('id', params.userId).single();
  if (removed?.email) {
    await sendEmail('team_member_removed', removed.email, { team_name: team.name }, params.userId);
  }

  return new Response(null, { status: 204 });
}
```

### `app/api/teams/[id]/transfer/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { new_owner_id } = await req.json();
  if (!new_owner_id) return NextResponse.json({ error: 'new_owner_id required' }, { status: 400 });

  const { data: team } = await supabase
    .from('teams')
    .select('id, owner_user_id')
    .eq('id', params.id)
    .single();
  if (!team || team.owner_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: target } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', params.id)
    .eq('user_id', new_owner_id)
    .maybeSingle();
  if (!target) {
    return NextResponse.json({ error: 'New owner must be a team member.' }, { status: 400 });
  }

  const { error } = await supabase.rpc('fn_transfer_team_ownership', {
    p_team_id: params.id,
    p_old_owner: user.id,
    p_new_owner: new_owner_id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message: 'Ownership transferred' });
}
```

### Required SQL RPCs (add to migration)
```sql
-- fn_create_team
CREATE OR REPLACE FUNCTION fn_create_team(p_owner_id uuid, p_name text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_team_id uuid;
BEGIN
  INSERT INTO teams (owner_user_id, name) VALUES (p_owner_id, p_name) RETURNING id INTO v_team_id;
  INSERT INTO credit_wallets (owner_id, owner_kind, balance) VALUES (v_team_id, 'team', 0);
  INSERT INTO team_members (team_id, user_id, role) VALUES (v_team_id, p_owner_id, 'owner');
  UPDATE users SET account_type = 'team_owner' WHERE id = p_owner_id;
  RETURN json_build_object('team_id', v_team_id);
END $$;

-- fn_accept_team_invite
CREATE OR REPLACE FUNCTION fn_accept_team_invite(p_invite_id uuid, p_user_id uuid, p_team_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO team_members (team_id, user_id, role) VALUES (p_team_id, p_user_id, 'member')
    ON CONFLICT DO NOTHING;
  UPDATE users SET account_type = 'team_member' WHERE id = p_user_id AND account_type = 'individual';
  UPDATE team_invites SET accepted_at = now() WHERE id = p_invite_id;
END $$;

-- fn_remove_team_member
CREATE OR REPLACE FUNCTION fn_remove_team_member(p_team_id uuid, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM team_members WHERE team_id = p_team_id AND user_id = p_user_id;
  UPDATE users SET account_type = 'individual' WHERE id = p_user_id;
END $$;

-- fn_transfer_team_ownership
CREATE OR REPLACE FUNCTION fn_transfer_team_ownership(p_team_id uuid, p_old_owner uuid, p_new_owner uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE teams SET owner_user_id = p_new_owner WHERE id = p_team_id;
  UPDATE team_members SET role = 'member' WHERE team_id = p_team_id AND user_id = p_old_owner;
  UPDATE team_members SET role = 'owner' WHERE team_id = p_team_id AND user_id = p_new_owner;
  UPDATE users SET account_type = 'team_member' WHERE id = p_old_owner;
  UPDATE users SET account_type = 'team_owner' WHERE id = p_new_owner;
END $$;
```

---

## Codebase Context

### Key Code Snippets
```typescript
// users.account_type ENUM: 'individual' | 'team_owner' | 'team_member'
// team_invites.token_hash is sha256(rawToken); raw token only ever in email link
```

### Key Patterns in Use
- **Pattern:** All multi-row mutations go through SECURITY DEFINER RPC for atomicity.
- **Pattern:** Tokens hashed at rest; raw is single-use in email link.
- **Pattern:** RLS on team_members enforces "must be member to read team".

### Architecture Decisions
- ADR: One team per owner (DB unique constraint on `teams.owner_user_id`).
- ADR: Invite TTL = 48h; expired invites are NOT garbage-collected (audit trail).
- ADR: Removing a member auto-reverts them to `individual` (their personal wallet exists from signup).
- ADR: Transfer requires the new owner to already be a member — prevents stranger takeover.

---

## Handoff from Previous Task
**Files changed by previous task:** `app/api/billing/webhook/route.ts` (task 17 trust upgrade wiring); `lib/email/sender.ts` (task 20).
**Decisions made:** Email sender exposes `sendEmail(template, to, data, userId?)`.
**Context for this task:** `teams`, `team_members`, `team_invites` tables exist (task 7); `credit_wallets` supports `owner_kind='team'` (task 8).
**Open questions left:** None.

---

## Implementation Steps
1. `lib/teams/invites.ts` — token helpers
2. SQL migration — 4 RPC functions
3. `app/api/teams/route.ts` — POST create
4. `app/api/teams/[id]/route.ts` — GET detail
5. `app/api/teams/[id]/invite/route.ts` — POST invite
6. `app/api/teams/invites/accept/route.ts` — POST accept
7. `app/api/teams/[id]/members/[userId]/route.ts` — DELETE
8. `app/api/teams/[id]/transfer/route.ts` — POST transfer
9. Run: `npx tsc --noEmit`
10. Run: `npm test -- teams`
11. Run: `/verify`

_Requirements: 11, 25_

---

## Test Cases

### File: `app/api/teams/__tests__/teams.test.ts`
```typescript
import { POST as createTeam } from '@/app/api/teams/route';
import { POST as inviteMember } from '@/app/api/teams/[id]/invite/route';
import { POST as acceptInvite } from '@/app/api/teams/invites/accept/route';
import { DELETE as removeMember } from '@/app/api/teams/[id]/members/[userId]/route';
import { POST as transfer } from '@/app/api/teams/[id]/transfer/route';
import { generateInviteToken, hashInviteToken } from '@/lib/teams/invites';

jest.mock('@/lib/supabase/server');
jest.mock('@/lib/email/sender');

describe('team invite tokens', () => {
  it('generates 32 raw bytes (43-char base64url) and matching sha256 hex hash', () => {
    const { raw, hash } = generateInviteToken();
    expect(raw.length).toBeGreaterThanOrEqual(43);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInviteToken(raw)).toBe(hash);
  });

  it('produces different tokens on each call', () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a.raw).not.toBe(b.raw);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe('POST /api/teams', () => {
  it('rejects when user already owns a team', async () => {
    const { createClient } = require('@/lib/supabase/server');
    createClient.mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 't1' } }) }) }) }),
    });
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'X' }) });
    const res = await createTeam(req);
    expect(res.status).toBe(409);
  });

  it('creates team via fn_create_team RPC and returns id+name', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { team_id: 't42' }, error: null });
    const { createClient } = require('@/lib/supabase/server');
    createClient.mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
      rpc,
    });
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Acme' }) });
    const res = await createTeam(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ team_id: 't42', team_name: 'Acme' });
    expect(rpc).toHaveBeenCalledWith('fn_create_team', { p_owner_id: 'u1', p_name: 'Acme' });
  });

  it('rejects empty name with 400', async () => {
    const { createClient } = require('@/lib/supabase/server');
    createClient.mockReturnValue({ auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } });
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({}) });
    const res = await createTeam(req);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/teams/[id]/invite', () => {
  it('rejects non-owner with 403', async () => {
    const { createClient } = require('@/lib/supabase/server');
    createClient.mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 't1', name: 'X', owner_user_id: 'other' } }) }) }) }),
    });
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ email: 'a@b.c' }) });
    const res = await inviteMember(req, { params: { id: 't1' } });
    expect(res.status).toBe(403);
  });

  it('rejects duplicate active invite with 409', async () => {
    const { createClient } = require('@/lib/supabase/server');
    createClient.mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      from: (table: string) => {
        if (table === 'teams') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 't1', name: 'X', owner_user_id: 'u1' } }) }) }) };
        return {
          select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ gt: () => ({ maybeSingle: async () => ({ data: { id: 'i1' } }) }) }) }) }) }),
        };
      },
    });
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ email: 'a@b.c' }) });
    const res = await inviteMember(req, { params: { id: 't1' } });
    expect(res.status).toBe(409);
  });

  it('rejects malformed email with 400', async () => {
    const { createClient } = require('@/lib/supabase/server');
    createClient.mockReturnValue({ auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } });
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ email: 'not-an-email' }) });
    const res = await inviteMember(req, { params: { id: 't1' } });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/teams/invites/accept', () => {
  it('rejects expired invite', async () => {
    const { createClient } = require('@/lib/supabase/server');
    createClient.mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      from: () => ({
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: {
          id: 'i1', invited_email: 'a@b.c', expires_at: new Date(Date.now() - 1000).toISOString(), accepted_at: null,
        } }) }) }) }),
      }),
    });
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ token: 'tok', team_id: 't1' }) });
    const res = await acceptInvite(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid or expired/);
  });

  it('rejects already-accepted invite', async () => {
    const { createClient } = require('@/lib/supabase/server');
    createClient.mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      from: () => ({
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: {
          id: 'i1', invited_email: 'a@b.c',
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          accepted_at: new Date().toISOString(),
        } }) }) }) }),
      }),
    });
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ token: 'tok', team_id: 't1' }) });
    const res = await acceptInvite(req);
    expect(res.status).toBe(400);
  });

  it('accepts valid invite and calls fn_accept_team_invite', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: null });
    const { createClient } = require('@/lib/supabase/server');
    createClient.mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      from: () => ({
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: {
          id: 'i1', invited_email: 'a@b.c',
          expires_at: new Date(Date.now() + 86400000).toISOString(), accepted_at: null,
        } }) }) }) }),
      }),
      rpc,
    });
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ token: 'tok', team_id: 't1' }) });
    const res = await acceptInvite(req);
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('fn_accept_team_invite', expect.objectContaining({ p_invite_id: 'i1', p_user_id: 'u1', p_team_id: 't1' }));
  });
});

describe('DELETE member', () => {
  it('refuses to remove the owner', async () => {
    const { createClient } = require('@/lib/supabase/server');
    createClient.mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 't1', name: 'X', owner_user_id: 'u1' } }) }) }) }),
    });
    const res = await removeMember(new Request('http://x', { method: 'DELETE' }), { params: { id: 't1', userId: 'u1' } });
    expect(res.status).toBe(400);
  });
});

describe('POST transfer', () => {
  it('rejects when new owner is not a team member', async () => {
    const { createClient } = require('@/lib/supabase/server');
    createClient.mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      from: (table: string) => {
        if (table === 'teams') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 't1', owner_user_id: 'u1' } }) }) }) };
        return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) };
      },
    });
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ new_owner_id: 'u2' }) });
    const res = await transfer(req, { params: { id: 't1' } });
    expect(res.status).toBe(400);
  });
});
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| User creates 2nd team | 409 "You already own a team." |
| Team name empty/missing | 400 |
| Invite to email with active unexpired invite | 409 |
| Invite from non-owner | 403 |
| Invalid/malformed email | 400 |
| Accept with expired token | 400 "Invalid or expired invite link." |
| Accept with already-accepted invite | 400 same message (no info leak) |
| Accept successful | Insert team_member, set users.account_type='team_member' (only if currently 'individual'), mark invite accepted |
| Remove owner | 400 "Cannot remove owner. Transfer first." |
| Remove member | DELETE row + reset to 'individual'; send `team_member_removed` email |
| Transfer to non-member | 400 |
| Transfer success | Swap roles + account_types atomically via RPC |

---

## Acceptance Criteria
- [ ] WHEN user POSTs `/api/teams` AND has no team THEN team + team wallet created AND user.account_type='team_owner'
- [ ] WHEN user POSTs `/api/teams` AND owns team already THEN 409
- [ ] WHEN owner POSTs invite for email with no active invite THEN team_invites row inserted with sha256 token_hash AND email sent
- [ ] WHEN raw token is hashed THEN it equals stored token_hash exactly
- [ ] WHEN POST accept with expired token THEN 400 with "Invalid or expired invite link."
- [ ] WHEN POST accept succeeds THEN team_members row inserted, user.account_type='team_member', invite.accepted_at set
- [ ] WHEN owner DELETEs themselves THEN 400 with "Cannot remove owner. Transfer first."
- [ ] WHEN owner DELETEs member THEN row deleted, user reverted to 'individual', removal email sent
- [ ] WHEN owner transfers to a member THEN ownership swap atomic (no intermediate state observable)
- [ ] WHEN owner transfers to non-member THEN 400
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm test -- teams` — all green
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
