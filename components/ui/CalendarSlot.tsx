'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ScheduledPost {
  id: string
  sessionId: string
  platform: string
  assetType: string
  title: string | null
  status: 'queued' | 'publishing' | 'published' | 'failed' | 'cancelled'
  publishAt: string
  errorDetails?: string | null
}

interface CalendarSlotProps {
  datetime: Date
  posts: ScheduledPost[]
  onDrop: (postId: string, newDateTime: Date) => void
  onRetry: (postId: string) => void
}

const PLATFORM_EMOJI: Record<string, string> = {
  twitter: '🐦',
  linkedin: '💼',
  instagram: '📸',
  facebook: '📘',
  default: '📢',
}

const STATUS_VARIANT: Record<string, string> = {
  queued: 'secondary',
  publishing: 'default',
  published: 'default',
  failed: 'destructive',
  cancelled: 'outline',
}

const STATUS_CLASS: Record<string, string> = {
  published: 'bg-green-100 text-green-800 border-green-200',
  publishing: 'bg-blue-100 text-blue-800 border-blue-200',
}

export function CalendarSlot({ datetime, posts, onDrop, onRetry }: CalendarSlotProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const postId = e.dataTransfer.getData('postId')
    if (postId) onDrop(postId, datetime)
  }

  return (
    <div
      className="min-h-[40px] border-b border-r border-border/40 p-0.5 hover:bg-muted/20 transition-colors"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {posts.map((post) => (
        <div
          key={post.id}
          draggable
          onDragStart={(e) => e.dataTransfer.setData('postId', post.id)}
          className="rounded p-1 mb-0.5 bg-background border text-xs cursor-grab active:cursor-grabbing select-none"
        >
          <div className="flex items-center gap-1 mb-0.5">
            <span>{PLATFORM_EMOJI[post.platform] ?? PLATFORM_EMOJI.default}</span>
            <span className="truncate max-w-[80px] font-medium">
              {(post.title ?? 'Untitled').slice(0, 30)}
            </span>
          </div>
          <Badge
            variant={STATUS_VARIANT[post.status] as 'default' | 'secondary' | 'destructive' | 'outline' ?? 'secondary'}
            className={`text-[10px] px-1 py-0 h-4 ${STATUS_CLASS[post.status] ?? ''}`}
          >
            {post.status}
          </Badge>
          {post.status === 'failed' && (
            <Button
              variant="outline"
              size="sm"
              className="mt-0.5 h-5 text-[10px] px-1"
              onClick={() => onRetry(post.id)}
            >
              Retry
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}

export type { ScheduledPost }
