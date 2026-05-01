'use client'

import { CalendarSlot, type ScheduledPost } from '@/components/ui/CalendarSlot'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'

interface ScheduleCalendarProps {
  posts: ScheduledPost[]
  weekStart: Date
  onReschedule: (postId: string, newPublishAt: string) => Promise<void>
  onRetry: (postId: string) => Promise<void>
  onWeekChange: (direction: 'prev' | 'next') => void
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const START_HOUR = 6
const END_HOUR = 22

function buildDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    d.setHours(0, 0, 0, 0)
    return d
  })
}

function buildHours(): number[] {
  const hours = []
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h)
  return hours
}

function isSameSlot(post: ScheduledPost, day: Date, hour: number): boolean {
  const d = new Date(post.publishAt)
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth() === day.getMonth() &&
    d.getDate() === day.getDate() &&
    d.getHours() === hour
  )
}

export function ScheduleCalendar({
  posts,
  weekStart,
  onReschedule,
  onRetry,
  onWeekChange,
}: ScheduleCalendarProps) {
  const days = buildDays(weekStart)
  const hours = buildHours()

  const weekLabel = weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  const handleDrop = async (postId: string, newDateTime: Date) => {
    await onReschedule(postId, newDateTime.toISOString())
  }

  return (
    <div className="space-y-3">
      {/* Week header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => onWeekChange('prev')}>
          ← Prev
        </Button>
        <span className="text-sm font-medium">Week of {weekLabel}</span>
        <Button variant="outline" size="sm" onClick={() => onWeekChange('next')}>
          Next →
        </Button>
      </div>

      {posts.length === 0 && (
        <EmptyState
          title="Nothing scheduled yet"
          description="Generate and distribute content from the pipeline, then return here to manage your publishing queue."
          variant="muted"
        />
      )}

      {/* Calendar grid */}
      {posts.length > 0 && <div className="overflow-x-auto border rounded-md">
        <div className="min-w-[700px]">
          {/* Day headers */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-muted border-b">
            <div className="p-2 text-xs text-muted-foreground" />
            {days.map((day, i) => (
              <div key={i} className="p-2 text-center border-l">
                <div className="text-xs font-medium">{DAY_NAMES[i]}</div>
                <div className="text-xs text-muted-foreground">
                  {day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))}
          </div>

          {/* Hour rows */}
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)]">
              <div className="p-1 text-[10px] text-muted-foreground text-right pr-2 border-b border-r">
                {hour}:00
              </div>
              {days.map((day, dayIdx) => {
                const slotPosts = posts.filter((p) => isSameSlot(p, day, hour))
                const slotDt = new Date(day)
                slotDt.setHours(hour, 0, 0, 0)
                return (
                  <CalendarSlot
                    key={dayIdx}
                    datetime={slotDt}
                    posts={slotPosts}
                    onDrop={handleDrop}
                    onRetry={(id) => void onRetry(id)}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>}
    </div>
  )
}
