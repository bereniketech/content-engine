'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { ApprovalQueue, type ContentApproval } from '@/components/ui/ApprovalQueue'

interface WorkspaceInfo {
  id: string
  name: string
  featureEnabled: boolean
}

interface WorkspaceMember {
  id: string
  email: string
  role: string
  status: string
}

interface WorkspaceDashboardProps {
  workspace: WorkspaceInfo
  approvals: ContentApproval[]
  members: WorkspaceMember[]
  userRole: 'writer' | 'editor' | 'admin'
  currentUserId: string
  onApprove: (id: string) => void
  onRequestChanges: (id: string, feedback: string) => void
  onMarkPublished: (id: string) => void
  onResubmit: (id: string) => void
  onInvite: (email: string, role: string) => Promise<void>
}

const ROLES = ['writer', 'editor', 'admin'] as const

export function WorkspaceDashboard({
  workspace,
  approvals,
  members,
  userRole,
  currentUserId,
  onApprove,
  onRequestChanges,
  onMarkPublished,
  onResubmit,
  onInvite,
}: WorkspaceDashboardProps) {
  const [inviteEmail, setInviteEmail] = React.useState('')
  const [inviteRole, setInviteRole] = React.useState<string>('writer')
  const [inviting, setInviting] = React.useState(false)
  const [inviteError, setInviteError] = React.useState<string | null>(null)

  if (!workspace.featureEnabled) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Workspace feature not yet enabled. Contact support to enable.
        </p>
      </div>
    )
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteError(null)
    try {
      await onInvite(inviteEmail.trim(), inviteRole)
      setInviteEmail('')
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Invite failed')
    } finally {
      setInviting(false)
    }
  }

  const canInvite = userRole === 'admin' || userRole === 'editor'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{workspace.name}</h1>
        <p className="text-sm text-muted-foreground">Workspace Dashboard</p>
      </div>

      {/* Members section */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Members</h2>

        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No members yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">{m.email}</td>
                    <td className="px-4 py-3 capitalize">{m.role}</td>
                    <td className="px-4 py-3 capitalize">{m.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Invite form — visible to admin/editor */}
        {canInvite && (
          <form onSubmit={handleInvite} className="flex items-end gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="invite-email" className="text-xs font-medium text-muted-foreground">
                Email
              </label>
              <input
                id="invite-email"
                type="email"
                required
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="invite-role" className="text-xs font-medium text-muted-foreground">
                Role
              </label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} className="capitalize">
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm" disabled={inviting || !inviteEmail.trim()}>
              {inviting ? 'Inviting…' : 'Invite'}
            </Button>
          </form>
        )}

        {inviteError && <p className="text-xs text-destructive">{inviteError}</p>}
      </section>

      {/* Approval Queue */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Approval Queue</h2>
        <ApprovalQueue
          approvals={approvals}
          userRole={userRole}
          currentUserId={currentUserId}
          onApprove={onApprove}
          onRequestChanges={onRequestChanges}
          onMarkPublished={onMarkPublished}
          onResubmit={onResubmit}
        />
      </section>
    </div>
  )
}
