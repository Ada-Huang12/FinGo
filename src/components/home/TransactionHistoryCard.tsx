import { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import { CATEGORY_COLORS, formatCurrency, formatDate, formatShortDate } from '../../lib/format'
import type { Transaction } from '../../lib/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'

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
  const { user, setAutoPurgeTransactions } = useAuth()
  const { transactions, clearTransactionHistory, purgeStaleTransactions } = useData()
  const [filter, setFilter] = useState<Filter>('all')
  const [confirmClear, setConfirmClear] = useState(false)
  const [savingPref, setSavingPref] = useState(false)
  const [clearing, setClearing] = useState(false)

  const autoPurge = user?.auto_purge_transactions !== false

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

  async function onToggleAutoPurge() {
    if (savingPref) return
    setSavingPref(true)
    const next = !autoPurge
    try {
      await setAutoPurgeTransactions(next)
      if (next) await purgeStaleTransactions()
    } catch (err) {
      console.warn(err)
    } finally {
      setSavingPref(false)
    }
  }

  async function onClearHistory() {
    setClearing(true)
    try {
      await clearTransactionHistory()
      setConfirmClear(false)
    } finally {
      setClearing(false)
    }
  }

  return (
    <Card className="flex h-full min-h-[22rem] flex-col overflow-hidden p-5 sm:p-6 lg:min-h-0">
      <div className="shrink-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h2 className="font-display text-lg font-bold text-fingo-ink">Transaction history</h2>
            <button
              type="button"
              role="switch"
              aria-checked={autoPurge}
              aria-label="Auto-delete transaction history after 7 days"
              disabled={savingPref}
              onClick={() => void onToggleAutoPurge()}
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                autoPurge ? 'bg-fingo-green' : 'bg-slate-300'
              } ${savingPref ? 'opacity-70' : ''}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                  autoPurge ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            <Button
              variant="ghost"
              className="!px-3 !py-1.5 text-xs text-red-600 hover:bg-red-50"
              disabled={transactions.length === 0}
              onClick={() => setConfirmClear(true)}
            >
              <Icon name="delete" className="text-[1rem]" />
              Clear history
            </Button>
          </div>
        </div>

        <p className="text-sm text-fingo-muted">
          {autoPurge
            ? 'Note: transaction history is automatically deleted after 7 days. Use the toggle next to the title to turn this off.'
            : 'Note: auto-delete is off — history is kept until you clear it. Use the toggle next to the title to turn 7-day cleanup back on.'}
        </p>

        {filtered.length > 0 && (
          <div className="flex flex-wrap gap-3 text-xs font-semibold text-fingo-muted">
            {(filter === 'all' || filter === 'expense') && (
              <span>
                Spent <span className="text-fingo-ink">{formatCurrency(expenseTotal)}</span>
              </span>
            )}
            {(filter === 'all' || filter === 'income') && (
              <span>
                Earned <span className="text-fingo-green">{formatCurrency(incomeTotal)}</span>
              </span>
            )}
            <span>
              · {filtered.length} item{filtered.length === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.date}>
              <p className="sticky top-0 z-[1] mb-2 bg-white py-1 text-xs font-bold uppercase tracking-wide text-fingo-muted">
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
            <div className="grid h-full min-h-[10rem] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
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
      </div>

      <Modal open={confirmClear} title="Clear transaction history?" onClose={() => setConfirmClear(false)}>
        <p className="text-sm text-fingo-muted">
          This deletes your entire transaction history ({transactions.length}{' '}
          {transactions.length === 1 ? 'entry' : 'entries'}), not a single transaction. This cannot be
          undone.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirmClear(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={clearing}
            onClick={() => void onClearHistory()}
          >
            {clearing ? 'Clearing…' : 'Clear history'}
          </Button>
        </div>
      </Modal>
    </Card>
  )
}
