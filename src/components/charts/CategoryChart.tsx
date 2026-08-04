import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { CategorySlice } from '../../lib/types'
import { formatCurrency } from '../../lib/format'
import { Card } from '../ui/Card'

export function CategoryChart({ data }: { data: CategorySlice[] }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-display text-lg font-bold text-fingo-ink">Spending categories</h2>
      <p className="mb-4 text-sm text-fingo-muted">This month&apos;s breakdown</p>
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-fingo-muted">No expenses logged yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr] sm:items-center">
          <div className="mx-auto h-48 w-full max-w-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="amount" nameKey="category" innerRadius={48} outerRadius={78} paddingAngle={3}>
                  {data.map((entry) => (
                    <Cell key={entry.category} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-2">
            {data.slice(0, 6).map((item) => (
              <li key={item.category} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-medium text-fingo-ink">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                  {item.category}
                </span>
                <span className="font-display font-bold text-fingo-muted">{formatCurrency(item.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
