import { useState, type FormEvent } from 'react'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../lib/format'
import { useData } from '../../contexts/DataContext'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'

export function AddTransactionButton() {
  const { addTransaction } = useData()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Food')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const value = Number(amount)
    if (!value || value <= 0) {
      setError('Enter a valid amount.')
      return
    }
    setSaving(true)
    try {
      await addTransaction({
        type,
        amount: value,
        category,
        description: description || category,
        date,
      })
      setOpen(false)
      setAmount('')
      setDescription('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save transaction.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button
        className="w-full sm:w-auto"
        onClick={() => {
          setCategory(type === 'income' ? 'Salary' : 'Food')
          setOpen(true)
        }}
      >
        <Icon name="add" />
        Add Transaction
      </Button>

      <Modal open={open} title="Add transaction" onClose={() => setOpen(false)}>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t)
                  setCategory(t === 'income' ? 'Salary' : 'Food')
                }}
                className={`rounded-xl py-2 font-display text-sm font-bold capitalize ${
                  type === t ? 'bg-white text-fingo-ink shadow-sm' : 'text-fingo-muted'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-fingo-muted">Amount</label>
            <input
              className="input-field"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-fingo-muted">Category</label>
            <select
              className="input-field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-fingo-muted">Description</label>
            <input
              className="input-field"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this for?"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-fingo-muted">Date</label>
            <input
              className="input-field"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button className="w-full" disabled={saving} type="submit">
            {saving ? 'Saving…' : 'Save transaction'}
          </Button>
        </form>
      </Modal>
    </>
  )
}
