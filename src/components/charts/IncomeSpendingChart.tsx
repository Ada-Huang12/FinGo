import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MonthlyChartPoint } from '../../lib/types'
import { formatCurrency } from '../../lib/format'
import { Card } from '../ui/Card'

export function IncomeSpendingChart({ data }: { data: MonthlyChartPoint[] }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-fingo-ink">Income vs. spending</h2>
          <p className="text-sm text-fingo-muted">Last 6 months at a glance</p>
        </div>
      </div>
      <div className="h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={6}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={(v) => `$${v / 1000}k`}
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value ?? 0))}
              contentStyle={{
                borderRadius: 16,
                border: '1px solid #e2e8f0',
                boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
              }}
            />
            <Legend />
            <Bar dataKey="income" name="Income" fill="#22C55E" radius={[8, 8, 0, 0]} />
            <Bar dataKey="spending" name="Spending" fill="#3B82F6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
