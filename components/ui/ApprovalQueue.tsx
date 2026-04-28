'use client'

import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export interface ContentApproval {
  id: string
  sessionId: string
  workspaceId: string
  submittedBy: string
  reviewedBy: string | null
  status: 'draft' | 'review' | 'approved' | 'published' | 'changes_requested'
  feedback: string | null
  submittedAt: string | null
  reviewedAt: string | null
}

export interface ApprovalQueueProps {
  approvals: ContentApproval[]
  userRole: 'writer' | 'editor' | 'admin'
  currentUserId: string
  onApprove: (id: string) => void
  onRequestChanges: (id: string, feedback: string) => void
  onMarkPublished: (id: string) => void
  onResubmit: (id: string) => void
}

type StatusVariant = 'default' | 'secondary' | 'destructive' | 'outline'

interface StatusConfig {
  label: string
  variant: StatusVariant
  className: string
}

const STATUS_CONFIG: Record<ContentApproval['status'], StatusConfig> = {
  draft: { label: 'Draft', variant: 'outline', className: 'text-gray-600 border-gray-300' },
  review: { label: 'In Review', variant: 'default', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  approved: { label: 'Approved', variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
  changes_requested: {
    label: 'Changes Requested',
    variant: 'default',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  published: { label: 'Published', variant: 'secondary', className: 'bg-gray-100 text-gray-600 border-gray-200' },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

interface FeedbackRowProps {
  approvalId: string
  onSubmit: (id: string, feedback: string) => void
  onCancel: () => void
}

function FeedbackRow({ approvalId, onSubmit, onCancel }: FeedbackRowProps) {
  const [feedbackText, setFeedbackText] = React.useState('')

  return (
    <div className="mt-2 space-y-2">
      <textarea
        className="w-full rounded border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="Enter feedback for the writer..."
        rows={3}
        value={feedbackText}
        onChange={(e) => setFeedbackText(e.target.value)}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            if (feedbackText.trim()) onSubmit(approvalId, feedbackText.trim())
          }}
          disabled={!feedbackText.trim()}
        >
          Send Feedback
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

export function ApprovalQueue({
  approvals,
  userRole,
  currentUserId,
  onApprove,
  onRequestChanges,
  onMarkPublished,
  onResubmit,
}: ApprovalQueueProps) {
  const [expandedFeedback, setExpandedFeedback] = React.useState<string | null>(null)

  const isReviewer = userRole === 'editor' || userRole === 'admin'

  const visibleApprovals =
    userRole === 'writer' ? approvals.filter((a) => a.submittedBy === currentUserId) : approvals

  if (visibleApprovals.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No approvals to display.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Session</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Submitted</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {visibleApprovals.map((approval) => {
            const config = STATUS_CONFIG[approval.status]
            const isOwnSubmission = approval.submittedBy === currentUserId
            const isFeedbackOpen = expandedFeedback === approval.id

            return (
              <tr key={approval.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {approval.sessionId.slice(0, 8)}…
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(approval.submittedAt)}</td>
                <td className="px-4 py-3">
                  <Badge variant={config.variant} className={config.className}>
                    {config.label}
                  </Badge>
                  {approval.feedback && approval.status === 'changes_requested' && (
                    <p className="mt-1 text-xs text-muted-foreground italic">{approval.feedback}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    {/* Editor / admin actions */}
                    {isReviewer && !isOwnSubmission && approval.status === 'review' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="default" onClick={() => onApprove(approval.id)}>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setExpandedFeedback(isFeedbackOpen ? null : approval.id)
                          }
                        >
                          Request Changes
                        </Button>
                      </div>
                    )}

                    {isReviewer && approval.status === 'approved' && userRole === 'admin' && (
                      <Button size="sm" variant="secondary" onClick={() => onMarkPublished(approval.id)}>
                        Mark Published
                      </Button>
                    )}

                    {/* Feedback textarea for request changes */}
                    {isReviewer && isFeedbackOpen && (
                      <FeedbackRow
                        approvalId={approval.id}
                        onSubmit={(id, fb) => {
                          onRequestChanges(id, fb)
                          setExpandedFeedback(null)
                        }}
                        onCancel={() => setExpandedFeedback(null)}
                      />
                    )}

                    {/* Writer actions */}
                    {userRole === 'writer' && isOwnSubmission && approval.status === 'changes_requested' && (
                      <Button size="sm" variant="outline" onClick={() => onResubmit(approval.id)}>
                        Resubmit
                      </Button>
                    )}

                    {/* No actions available */}
                    {((!isReviewer && !(userRole === 'writer' && isOwnSubmission && approval.status === 'changes_requested')) ||
                      (isReviewer && approval.status !== 'review' && !(approval.status === 'approved' && userRole === 'admin'))) && (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
