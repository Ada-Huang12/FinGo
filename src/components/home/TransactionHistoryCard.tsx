import { useMemo, useState } from 'react'
import { useData } from '../../contexts/DataContext'
import { CATEGORY_COLORS, formatCurrency, formatDate, formatShortDate } from '../../lib/format'
import type { Transaction } from '../../lib/types'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'

type Filter = 'all' | 'expense' | 'income'

function categoryIcon(category: string, type: Transaction['type']): string {
  if (type === 'income') return 'trending_up'
  const map: Record<string, string> = {
    Food: 'restaurant',
    Transport: 'directions_car',
    Shopping: 'shopping_bag',
    Entertainment: 'movie',
    Utilities: 'bolt',
    Health: 'local_hospital',
    Housing: 'home',
    Education: 'school',
    Other: 'payments',
  }
  return map[category] ?? 'receipt_long'
}

function groupByDate(transactions: Transaction[]): { date: string; items: Transaction[] }[] {
  const map = new Map<string, Transaction[]>()
  for (const tx of transactions) {
    const key = String(tx.date).slice(0, 10)
    const list = map.get(key) ?? []
    list.push(tx)
    map.set(key, list)
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({
      date,
      items: [...items].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    }))
}

export function TransactionHistoryCard() {
  const { transactions } = useData()
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    const list =
      filter === 'all' ? transactions : transactions.filter((t) => t.type === filter)
    return [...list].sort((a, b) => {
      const byDate = String(b.date).localeCompare(String(a.date))
      if (byDate !== 0) return byDate
      return b.created_at.localeCompare(a.created_at)
    })
  }, [transactions, filter])

  const groups = useMemo(() => groupByDate(filtered), [filtered])
  const expenseTotal = filtered
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount), 0)
  const incomeTotal = filtered
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount), 0)

  return (
    <Card className="flex h-full min-h-[420px] flex-col p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-fingo-ink">Transaction history</h2>
          <p className="text-sm text-fingo-muted">See what you spent and earned</p>
        </div>
        <div className="flex rounded-full bg-slate-100 p-1">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'expense', label: 'Spent' },
              { id: 'income', label: 'Income' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                filter === tab.id ? 'bg-white text-fingo-ink shadow-sm' : 'text-fingo-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-3 text-xs font-semibold text-fingo-muted">
          {(filter === 'all' || filter === 'expense') && (
            <span>
              Spent{' '}
              <span className="text-fingo-ink">{formatCurrency(expenseTotal)}</span>
            </span>
          )}
          {(filter === 'all' || filter === 'income') && (
            <span>
              Earned{' '}
              <span className="text-fingo-green">{formatCurrency(incomeTotal)}</span>
            </span>
          )}
          <span>· {filtered.length} item{filtered.length === 1 ? '' : 's'}</span>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {groups.map((group) => (
          <div key={group.date}>
            <p className="mb-2 sticky top-0 z-[1] bg-white/95 py-1 text-xs font-bold uppercase tracking-wide text-fingo-muted backdrop-blur">
              {formatDate(group.date)}
            </p>
            <ul className="space-y-2">
              {group.items.map((tx) => {
                const color = CATEGORY_COLORS[tx.category] ?? '#94A3B8'
                const isExpense = tx.type === 'expense'
                return (
                  <li
                    key={tx.id}
                    className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5"
                  >
                    <div
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white shadow-sm"
                      style={{ background: color }}
                    >
                      <Icon name={categoryIcon(tx.category, tx.type)} className="text-[1.2rem]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-bold text-fingo-ink">
                        {tx.description || tx.category}
                      </p>
                      <p className="text-xs text-fingo-muted">
                        {tx.category} · {formatShortDate(String(tx.date).slice(0, 10))}
                      </p>
                    </div>
                    <p
                      className={`shrink-0 font-display text-sm font-extrabold ${
                        isExpense ? 'text-fingo-ink' : 'text-fingo-green'
                      }`}
                    >
                      {isExpense ? '−' : '+'}
                      {formatCurrency(Number(tx.amount))}
                    </p>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="grid h-full min-h-[240px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <div>
              <Icon name="receipt_long" className="mx-auto mb-2 text-[2rem] text-slate-300" />
              <p className="text-sm font-semibold text-fingo-ink">No transactions yet</p>
              <p className="mt-1 text-sm text-fingo-muted">
                Add a transaction or import a receipt/CSV to see your history here.
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
