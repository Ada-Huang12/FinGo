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
  const [settingsOpen, setSettingsOpen] = useState(false)
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
    setSavingPref(true)
    try {
      const next = !autoPurge
      await setAutoPurgeTransactions(next)
      if (next) await purgeStaleTransactions()
    } finally {
      setSavingPref(false)
    }
  }

  async function onClearHistory() {
    setClearing(true)
    try {
      await clearTransactionHistory()
      setConfirmClear(false)
      setSettingsOpen(false)
    } finally {
      setClearing(false)
    }
  }

  return (
    <Card className="flex max-h-[32rem] flex-col p-5 sm:max-h-[36rem] sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-fingo-ink">Transaction history</h2>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              aria-label="Transaction history settings"
            >
              <Icon name="settings" className="text-[1.1rem]" />
            </button>
          </div>
          <p className="text-sm text-fingo-muted">
            {autoPurge ? 'Keeps the last 7 days · scroll for more' : 'All saved transactions · scroll for more'}
          </p>
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

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
        {groups.map((group) => (
          <div key={group.date}>
            <p className="sticky top-0 z-[1] mb-2 bg-white/95 py-1 text-xs font-bold uppercase tracking-wide text-fingo-muted backdrop-blur">
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
          <div className="grid min-h-[12rem] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
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

      <Modal open={settingsOpen} title="History settings" onClose={() => setSettingsOpen(false)}>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 p-4">
            <div>
              <p className="font-display text-sm font-bold text-fingo-ink">Auto-delete after 1 week</p>
              <p className="mt-1 text-xs text-fingo-muted">
                Transactions older than 7 days are removed automatically to keep history light.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoPurge}
              disabled={savingPref}
              onClick={() => void onToggleAutoPurge()}
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                autoPurge ? 'bg-fingo-green' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                  autoPurge ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <p className="font-display text-sm font-bold text-red-700">Clear transaction history</p>
            <p className="mt-1 text-xs text-red-600/80">
              Permanently delete every transaction. Budget totals are adjusted to match.
            </p>
            <Button
              variant="danger"
              className="mt-3 w-full"
              disabled={transactions.length === 0}
              onClick={() => setConfirmClear(true)}
            >
              <Icon name="delete" />
              Delete all history
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={confirmClear} title="Delete all history?" onClose={() => setConfirmClear(false)}>
        <p className="text-sm text-fingo-muted">
          This removes all {transactions.length} transaction
          {transactions.length === 1 ? '' : 's'} and cannot be undone.
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
            {clearing ? 'Deleting…' : 'Delete all'}
          </Button>
        </div>
      </Modal>
    </Card>
  )
}
