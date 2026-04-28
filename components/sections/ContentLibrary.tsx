'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ROISparkline } from '@/components/ui/ROISparkline'

interface ROIItem {
  sessionId: string
  title: string | null
  publishedAt: string | null
  organicClicks: number | null
  impressions: number | null
  avgPosition: number | null
  trafficValue: number | null
  trend: number[]
  needsRefresh: boolean
}

interface ContentLibraryProps {
  items: ROIItem[]
  isGA4Connected: boolean
  onRowClick: (sessionId: string) => void
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

function formatNumber(n: number | null): string {
  return n === null ? '—' : n.toLocaleString()
}

function formatDate(d: string | null): string {
  return d === null ? '—' : new Date(d).toLocaleDateString()
}

function formatCurrency(v: number | null): string {
  return v === null ? '—' : `$${v.toFixed(2)}`
}

function formatPosition(v: number | null): string {
  return v === null ? '—' : v.toFixed(1)
}

export function ContentLibrary({
  items,
  isGA4Connected,
  onRowClick,
  page,
  totalPages,
  onPageChange,
}: ContentLibraryProps) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Title</th>
              <th className="px-4 py-3 text-left font-medium">Published</th>
              <th className="px-4 py-3 text-right font-medium">Clicks</th>
              <th className="px-4 py-3 text-right font-medium">Impressions</th>
              <th className="px-4 py-3 text-right font-medium">Avg Position</th>
              <th className="px-4 py-3 text-right font-medium">Traffic Value</th>
              <th className="px-4 py-3 text-center font-medium">Trend</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {!isGA4Connected ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  <div className="space-y-2">
                    <p>Connect GA4 to see performance metrics</p>
                    <Button variant="outline" size="sm" onClick={() => {}}>
                      Connect GA4
                    </Button>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                  No articles found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.sessionId}
                  className="border-t cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onRowClick(item.sessionId)}
                >
                  <td className="px-4 py-3 font-medium max-w-[200px] truncate">
                    {item.title ?? <span className="text-muted-foreground italic">Untitled</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(item.publishedAt)}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(item.organicClicks)}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(item.impressions)}</td>
                  <td className="px-4 py-3 text-right">{formatPosition(item.avgPosition)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(item.trafficValue)}</td>
                  <td className="px-4 py-3 text-center">
                    {item.trend.length > 0 ? (
                      <ROISparkline data={item.trend} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.needsRefresh ? (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                        Needs Refresh
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
