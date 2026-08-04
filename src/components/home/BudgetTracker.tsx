import { useState } from 'react'
import { formatCurrency, percent } from '../../lib/format'
import type { Budget } from '../../lib/types'
import { useData } from '../../contexts/DataContext'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import { ProgressBar } from '../ui/ProgressBar'

export function BudgetTracker({ budgets }: { budgets: Budget[] }) {
  const { updateBudget } = useData()
  const [editing, setEditing] = useState<Budget | null>(null)
  const [limit, setLimit] = useState('')

  return (
    <>
      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-fingo-ink">Budget tracker</h2>
            <p className="text-sm text-fingo-muted">Stay cozy inside your limits</p>
          </div>
          <Icon name="account_balance_wallet" className="text-fingo-blue" />
        </div>
        <div className="space-y-4">
          {budgets.map((b) => {
            const pct = percent(Number(b.spent_amount), Number(b.limit_amount))
            const tone = pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : 'green'
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setEditing(b)
                  setLimit(String(b.limit_amount))
                }}
                className="w-full rounded-2xl bg-slate-50 p-3 text-left transition hover:bg-slate-100"
              >
                <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                  <span className="font-display font-bold text-fingo-ink">{b.category}</span>
                  <span className="text-fingo-muted">
                    {formatCurrency(Number(b.spent_amount))} / {formatCurrency(Number(b.limit_amount))}
                  </span>
                </div>
                <ProgressBar value={pct} tone={tone} />
              </button>
            )
          })}
          {budgets.length === 0 && (
            <p className="text-sm text-fingo-muted">No budgets for this month yet.</p>
          )}
        </div>
      </Card>

      <Modal open={!!editing} title={`Edit ${editing?.category ?? ''} budget`} onClose={() => setEditing(null)}>
        <label className="mb-1 block text-sm font-semibold text-fingo-muted">Monthly limit</label>
        <input
          className="input-field mb-4"
          type="number"
          min="0"
          step="1"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
        />
        <Button
          className="w-full"
          onClick={async () => {
            if (!editing) return
            await updateBudget(editing.id, Number(limit))
            setEditing(null)
          }}
        >
          Save budget
        </Button>
      </Modal>
    </>
  )
}
