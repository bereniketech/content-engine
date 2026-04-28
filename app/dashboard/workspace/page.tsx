'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { WorkspaceDashboard } from '@/components/sections/WorkspaceDashboard'
import type { ContentApproval } from '@/components/ui/ApprovalQueue'

interface WorkspaceListItem {
  id: string
  name: string
  slug: string
  ownerId: string
  featureEnabled: boolean
  createdAt: string
}

interface WorkspaceMember {
  id: string
  email: string
  role: string
  status: string
  joinedAt: string
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  const json = (await res.json()) as { data?: T; error?: { code: string; message: string } }
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `Request failed: ${res.status}`)
  }
  return json.data as T
}

export default function WorkspacePage() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [workspaces, setWorkspaces] = React.useState<WorkspaceListItem[]>([])
  const [members, setMembers] = React.useState<WorkspaceMember[]>([])
  const [approvals, setApprovals] = React.useState<ContentApproval[]>([])
  const [currentUserId, setCurrentUserId] = React.useState<string>('')
  const [currentUserEmail, setCurrentUserEmail] = React.useState<string>('')
  const [creating, setCreating] = React.useState(false)

  const activeWorkspace = workspaces[0] ?? null

  const userRole: 'writer' | 'editor' | 'admin' = React.useMemo(() => {
    if (!currentUserEmail || members.length === 0) return 'writer'
    const self = members.find((m) => m.email === currentUserEmail)
    const role = self?.role ?? 'writer'
    if (role === 'admin' || role === 'editor' || role === 'writer') return role
    return 'writer'
  }, [members, currentUserEmail])

  React.useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        // Get current user
        const userRes = await fetch('/api/auth/me')
        if (userRes.ok) {
          const userData = (await userRes.json()) as { id?: string; email?: string }
          setCurrentUserId(userData.id ?? '')
          setCurrentUserEmail(userData.email ?? '')
        }

        // Fetch workspaces
        const wsList = await apiFetch<WorkspaceListItem[]>('/api/workspace')
        setWorkspaces(wsList)

        if (wsList.length > 0) {
          const ws = wsList[0]

          // Fetch members and approvals in parallel
          const [membersList, approvalsList] = await Promise.all([
            apiFetch<WorkspaceMember[]>(`/api/workspace/${ws.id}/members`),
            apiFetch<ContentApproval[]>(`/api/approval?workspaceId=${ws.id}`),
          ])
          setMembers(membersList)
          setApprovals(approvalsList)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workspace data')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  async function handleCreateWorkspace() {
    setCreating(true)
    setError(null)
    try {
      const ws = await apiFetch<WorkspaceListItem>('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'My Workspace' }),
      })
      setWorkspaces([ws])

      const [membersList, approvalsList] = await Promise.all([
        apiFetch<WorkspaceMember[]>(`/api/workspace/${ws.id}/members`),
        apiFetch<ContentApproval[]>(`/api/approval?workspaceId=${ws.id}`),
      ])
      setMembers(membersList)
      setApprovals(approvalsList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace')
    } finally {
      setCreating(false)
    }
  }

  async function handleApprove(id: string) {
    try {
      const updated = await apiFetch<ContentApproval>(`/api/approval/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })
      setApprovals((prev) => prev.map((a) => (a.id === id ? updated : a)))
    } catch (err) {
      console.error('Approve failed', err)
    }
  }

  async function handleRequestChanges(id: string, feedback: string) {
    try {
      const updated = await apiFetch<ContentApproval>(`/api/approval/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'changes_requested', feedback }),
      })
      setApprovals((prev) => prev.map((a) => (a.id === id ? updated : a)))
    } catch (err) {
      console.error('Request changes failed', err)
    }
  }

  async function handleMarkPublished(id: string) {
    try {
      const updated = await apiFetch<ContentApproval>(`/api/approval/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      })
      setApprovals((prev) => prev.map((a) => (a.id === id ? updated : a)))
    } catch (err) {
      console.error('Mark published failed', err)
    }
  }

  async function handleResubmit(id: string) {
    try {
      const updated = await apiFetch<ContentApproval>(`/api/approval/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'review' }),
      })
      setApprovals((prev) => prev.map((a) => (a.id === id ? updated : a)))
    } catch (err) {
      console.error('Resubmit failed', err)
    }
  }

  async function handleInvite(email: string, role: string) {
    if (!activeWorkspace) return
    await apiFetch(`/api/workspace/${activeWorkspace.id}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    })
    // Refresh members list
    const membersList = await apiFetch<WorkspaceMember[]>(`/api/workspace/${activeWorkspace.id}/members`)
    setMembers(membersList)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading workspace…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  if (workspaces.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Request Early Access</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            You don&apos;t have a workspace yet. Create one to unlock team collaboration and content approval workflows.
          </p>
        </div>
        <Button onClick={handleCreateWorkspace} disabled={creating}>
          {creating ? 'Creating…' : 'Create Workspace'}
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <WorkspaceDashboard
        workspace={{
          id: activeWorkspace.id,
          name: activeWorkspace.name,
          featureEnabled: activeWorkspace.featureEnabled,
        }}
        approvals={approvals}
        members={members}
        userRole={userRole}
        currentUserId={currentUserId}
        onApprove={handleApprove}
        onRequestChanges={handleRequestChanges}
        onMarkPublished={handleMarkPublished}
        onResubmit={handleResubmit}
        onInvite={handleInvite}
      />
    </div>
  )
}
