'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface ROISparklineProps {
  data: number[]
}

export function ROISparkline({ data }: ROISparklineProps) {
  const chartData = data.map((v, i) => ({ day: i, v }))
  return (
    <ResponsiveContainer width={80} height={28}>
      <LineChart data={chartData}>
        <Line type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
