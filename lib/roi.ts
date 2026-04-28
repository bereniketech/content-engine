export function computeTrend(
  rows: Array<{ clicks: number; measured_at: string }>,
  days = 14
): number[] {
  const result = new Array(days).fill(0)
  const now = new Date()
  for (const row of rows) {
    const daysAgo = Math.floor((now.getTime() - new Date(row.measured_at).getTime()) / 86_400_000)
    if (daysAgo >= 0 && daysAgo < days) {
      result[days - 1 - daysAgo] += row.clicks
    }
  }
  return result
}

export function estimateTrafficValue(
  clicks: number | null,
  avgPosition: number | null
): number | null {
  if (!clicks || !avgPosition) return null
  const cpc = avgPosition <= 3 ? 2 : avgPosition <= 10 ? 1 : 0.5
  return Math.round(clicks * cpc * 100) / 100
}
