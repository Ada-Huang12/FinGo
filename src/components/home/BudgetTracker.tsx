import { useMemo, useState } from 'react'
import { EXPENSE_CATEGORIES, formatCurrency, percent } from '../../lib/format'
import type { Budget } from '../../lib/types'
import { useData } from '../../contexts/DataContext'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import { ProgressBar } from '../ui/ProgressBar'

export function BudgetTracker({ budgets }: { budgets: Budget[] }) {
  const { updateBudget, setBudget } = useData()
  const [editing, setEditing] = useState<Budget | null>(null)
  const [adding, setAdding] = useState(false)
  const [limit, setLimit] = useState('')
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const availableCategories = useMemo(() => {
    const used = new Set(budgets.map((b) => b.category))
    return EXPENSE_CATEGORIES.filter((c) => !used.has(c))
  }, [budgets])

  function openAdd() {
    setError('')
    setLimit('')
    setCategory(availableCategories[0] ?? EXPENSE_CATEGORIES[0])
    setAdding(true)
  }

  function openEdit(b: Budget) {
    setError('')
    setEditing(b)
    setLimit(String(b.limit_amount))
  }

  return (
    <>
      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-fingo-ink">Budget tracker</h2>
            <p className="text-sm text-fingo-muted">Stay cozy inside your limits</p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" className="!px-3 !py-2 text-sm" onClick={openAdd}>
              Add budget
            </Button>
            <Icon name="account_balance_wallet" className="text-fingo-blue" />
          </div>
        </div>
        <div className="space-y-4">
          {budgets.map((b) => {
            const pct = percent(Number(b.spent_amount), Number(b.limit_amount))
            const tone = pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : 'green'
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => openEdit(b)}
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
            <p className="text-sm text-fingo-muted">
              No budgets for this month yet. Add one here, or ask the AI coach: “Set Food budget to $400”.
            </p>
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
        {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
        <Button
          className="w-full"
          disabled={saving}
          onClick={async () => {
            if (!editing) return
            setSaving(true)
            setError('')
            try {
              await updateBudget(editing.id, Number(limit))
              setEditing(null)
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not save budget.')
            } finally {
              setSaving(false)
            }
          }}
        >
          Save budget
        </Button>
      </Modal>

      <Modal open={adding} title="Add budget" onClose={() => setAdding(false)}>
        <label className="mb-1 block text-sm font-semibold text-fingo-muted">Category</label>
        <select
          className="input-field mb-4"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {(availableCategories.length ? availableCategories : EXPENSE_CATEGORIES).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="mb-1 block text-sm font-semibold text-fingo-muted">Monthly limit</label>
        <input
          className="input-field mb-4"
          type="number"
          min="0"
          step="1"
          placeholder="e.g. 400"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
        />
        {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
        <Button
          className="w-full"
          disabled={saving || !limit}
          onClick={async () => {
            setSaving(true)
            setError('')
            try {
              await setBudget(category, Number(limit))
              setAdding(false)
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not save budget.')
            } finally {
              setSaving(false)
            }
          }}
        >
          Create budget
        </Button>
      </Modal>
    </>
  )
}
