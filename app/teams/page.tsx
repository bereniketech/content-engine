'use client';
import { useState, useEffect } from 'react';

type TeamMember = { user_id: string; email: string; role: string; credits_used: number };
type Team = { id: string; name: string; owner_id: string; members: TeamMember[] };

export default function TeamsPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [createError, setCreateError] = useState('');
  const [loading, setLoading] = useState(true);

  async function fetchTeam() {
    const res = await fetch('/api/teams');
    if (res.ok) {
      const j = await res.json();
      setTeam(j.team ?? null);
    }
    setLoading(false);
  }

  useEffect(() => { fetchTeam(); }, []);

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: teamName }),
    });
    if (res.ok) fetchTeam();
    else { const j = await res.json(); setCreateError(j.error); }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError('');
    const res = await fetch(`/api/teams/${team!.id}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail }),
    });
    if (res.ok) { setInviteEmail(''); }
    else { const j = await res.json(); setInviteError(j.error); }
  }

  async function removeMember(userId: string) {
    await fetch(`/api/teams/${team!.id}/members/${userId}`, { method: 'DELETE' });
    fetchTeam();
  }

  if (loading) return <p className="py-8 text-center text-gray-400">Loading…</p>;

  if (!team) {
    return (
      <div className="mx-auto max-w-md py-8 px-4">
        <h1 className="mb-6 text-2xl font-bold text-white">Teams</h1>
        <p className="mb-4 text-sm text-gray-400">You don't have a team yet. Create one to share credits with your colleagues.</p>
        <form onSubmit={createTeam} className="space-y-3">
          <div>
            <label htmlFor="team-name" className="block text-sm text-gray-400">Team name</label>
            <input
              id="team-name"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
              className="mt-1 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          {createError && <p role="alert" className="text-sm text-red-400">{createError}</p>}
          <button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500">
            Create team
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl py-8 px-4">
      <h1 className="mb-1 text-2xl font-bold text-white">{team.name}</h1>
      <p className="mb-6 text-sm text-gray-400">Team workspace</p>

      <section aria-labelledby="invite-heading" className="mb-8">
        <h2 id="invite-heading" className="mb-3 text-lg font-semibold text-white">Invite member</h2>
        <form onSubmit={invite} className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@example.com"
            required
            aria-label="Email to invite"
            className="flex-1 rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500">
            Invite
          </button>
        </form>
        {inviteError && <p role="alert" className="mt-2 text-sm text-red-400">{inviteError}</p>}
      </section>

      <section aria-labelledby="members-heading">
        <h2 id="members-heading" className="mb-3 text-lg font-semibold text-white">Members</h2>
        <div className="overflow-x-auto rounded border border-gray-800">
          <table className="w-full text-sm" role="table">
            <thead className="bg-gray-900 text-left text-gray-400">
              <tr>
                {['Email', 'Role', 'Credits used', ''].map((h, i) => (
                  <th key={i} className="px-4 py-2 font-medium" scope="col">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {team.members.map((m) => (
                <tr key={m.user_id} className="border-t border-gray-800">
                  <td className="px-4 py-2 text-gray-200">{m.email}</td>
                  <td className="px-4 py-2 capitalize text-gray-400">{m.role}</td>
                  <td className="px-4 py-2 text-gray-400">{m.credits_used}</td>
                  <td className="px-4 py-2">
                    {m.role !== 'owner' && (
                      <button
                        onClick={() => removeMember(m.user_id)}
                        aria-label={`Remove ${m.email}`}
                        className="text-xs text-red-400 underline hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
