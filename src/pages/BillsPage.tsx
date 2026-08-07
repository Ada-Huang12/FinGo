import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { useMemo, useState, type FormEvent } from 'react'
import { useData } from '../contexts/DataContext'
import { EXPENSE_CATEGORIES, formatCurrency, formatShortDate } from '../lib/format'
import type { Bill, BillStatus, BillingCycle, Subscription } from '../lib/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'
import { Modal } from '../components/ui/Modal'

const statusStyles: Record<BillStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-600',
  paid: 'bg-emerald-100 text-emerald-700',
}

const BILL_ICONS = [
  'receipt_long',
  'wifi',
  'bolt',
  'smartphone',
  'directions_car',
  'fitness_center',
  'home',
  'water_drop',
  'local_hospital',
] as const

const SUB_ICONS = ['subscriptions', 'movie', 'music_note', 'cloud', 'brush', 'sports_esports', 'newspaper'] as const
const SUB_COLORS = ['#3B82F6', '#EF4444', '#22C55E', '#8B5CF6', '#EC4899', '#F59E0B', '#06B6D4'] as const

function BillRow({
  bill,
  onEdit,
  onDelete,
  onArchive,
}: {
  bill: Bill
  onEdit: (bill: Bill) => void
  onDelete: (bill: Bill) => void
  onArchive: (bill: Bill) => void
}) {
  const { updateBillStatus } = useData()
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-fingo-blue shadow-sm">
        <Icon name={bill.icon} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-display font-bold text-fingo-ink">{bill.name}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusStyles[bill.status]}`}>
            {bill.status}
          </span>
        </div>
        <p className="text-xs text-fingo-muted">Due {formatShortDate(bill.due_date)}</p>
      </div>
      <div className="text-right">
        <p className="font-display font-bold">{formatCurrency(Number(bill.amount))}</p>
        <div className="mt-1 flex flex-wrap justify-end gap-1">
          {bill.status !== 'paid' && (
            <button
              type="button"
              className="rounded-full bg-fingo-green px-2 py-0.5 text-[10px] font-bold text-white"
              onClick={() => void updateBillStatus(bill.id, 'paid')}
            >
              Mark paid
            </button>
          )}
          {bill.status === 'paid' && (
            <button
              type="button"
              className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600"
              onClick={() => void updateBillStatus(bill.id, 'pending')}
            >
              Undo
            </button>
          )}
          {bill.status === 'pending' && (
            <button
              type="button"
              className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600"
              onClick={() => void updateBillStatus(bill.id, 'overdue')}
            >
              Overdue
            </button>
          )}
          <button
            type="button"
            className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-fingo-blue shadow-sm"
            onClick={() => onEdit(bill)}
          >
            Edit
          </button>
          <button
            type="button"
            className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 shadow-sm"
            onClick={() => onArchive(bill)}
          >
            Archive
          </button>
          <button
            type="button"
            className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-red-600 shadow-sm"
            onClick={() => onDelete(bill)}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function ArchivedBillRow({
  bill,
  onRestore,
  onDelete,
}: {
  bill: Bill
  onRestore: (bill: Bill) => void
  onDelete: (bill: Bill) => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <Icon name={bill.icon} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-display font-bold text-fingo-ink">{bill.name}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusStyles[bill.status]}`}>
            {bill.status}
          </span>
        </div>
        <p className="text-xs text-fingo-muted">
          {bill.category} · Due {formatShortDate(bill.due_date)}
        </p>
      </div>
      <div className="text-right">
        <p className="font-display font-bold">{formatCurrency(Number(bill.amount))}</p>
        <div className="mt-1 flex flex-wrap justify-end gap-1">
          <button
            type="button"
            className="rounded-full bg-fingo-blue px-2 py-0.5 text-[10px] font-bold text-white"
            onClick={() => onRestore(bill)}
          >
            Restore
          </button>
          <button
            type="button"
            className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-red-600 shadow-sm"
            onClick={() => onDelete(bill)}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function BillCalendar({ bills, selected, onSelect }: { bills: Bill[]; selected: Date; onSelect: (d: Date) => void }) {
  const monthStart = startOfMonth(selected)
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(endOfMonth(monthStart)),
  })

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">{format(selected, 'MMMM yyyy')}</h2>
        <div className="flex gap-1">
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full bg-slate-100"
            onClick={() => onSelect(addDays(monthStart, -1))}
          >
            <Icon name="chevron_left" />
          </button>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full bg-slate-100"
            onClick={() => onSelect(addDays(endOfMonth(monthStart), 1))}
          >
            <Icon name="chevron_right" />
          </button>
        </div>
      </div>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-fingo-muted">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayBills = bills.filter((b) => isSameDay(new Date(b.due_date + 'T12:00:00'), day))
          const selectedDay = isSameDay(day, selected)
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelect(day)}
              className={`relative aspect-square rounded-xl text-sm font-semibold transition ${
                !isSameMonth(day, monthStart)
                  ? 'text-slate-300'
                  : selectedDay
                    ? 'bg-fingo-green text-white shadow-md'
                    : 'hover:bg-slate-100'
              }`}
            >
              {format(day, 'd')}
              {dayBills.length > 0 && (
                <span
                  className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                    selectedDay ? 'bg-white' : 'bg-fingo-blue'
                  }`}
                />
              )}
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function SubscriptionList({
  subscriptions,
  onAdd,
}: {
  subscriptions: Subscription[]
  onAdd: () => void
}) {
  const { toggleSubscription } = useData()
  const [busyId, setBusyId] = useState<string | null>(null)
  const activeMonthly = subscriptions
    .filter((s) => s.active)
    .reduce((sum, s) => {
      const amount = Number(s.amount)
      if (s.billing_cycle === 'weekly') return sum + amount * (52 / 12)
      if (s.billing_cycle === 'yearly') return sum + amount / 12
      return sum + amount
    }, 0)

  async function onToggle(id: string) {
    if (busyId) return
    setBusyId(id)
    try {
      await toggleSubscription(id)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-fingo-ink">Subscriptions</h2>
          <p className="text-sm text-fingo-muted">
            Use the switch to pause or resume. Active ≈ {formatCurrency(activeMonthly)}/mo
          </p>
        </div>
        <Button variant="secondary" className="!px-3 !py-2 text-sm" onClick={onAdd}>
          <Icon name="add" />
          Add
        </Button>
      </div>
      <div className="space-y-3">
        {subscriptions.map((sub) => (
          <div
            key={sub.id}
            className={`flex items-center gap-3 rounded-2xl p-3 transition ${
              sub.active ? 'bg-slate-50' : 'bg-slate-100/80 opacity-75'
            }`}
          >
            <div
              className={`grid h-11 w-11 place-items-center rounded-2xl text-white shadow-sm ${
                sub.active ? '' : 'grayscale'
              }`}
              style={{ background: sub.color }}
            >
              <Icon name={sub.icon} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display font-bold text-fingo-ink">{sub.name}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    sub.active ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {sub.active ? 'Active' : 'Paused'}
                </span>
              </div>
              <p className="text-xs text-fingo-muted">
                {formatCurrency(Number(sub.amount))}/
                {sub.billing_cycle === 'monthly' ? 'mo' : sub.billing_cycle}
                {sub.active
                  ? ` · next ${formatShortDate(sub.next_billing_date)}`
                  : ' · not billing while paused'}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                role="switch"
                aria-checked={sub.active}
                aria-label={sub.active ? `Pause ${sub.name}` : `Resume ${sub.name}`}
                disabled={busyId === sub.id}
                onClick={() => void onToggle(sub.id)}
                className={`relative h-7 w-12 rounded-full transition disabled:opacity-60 ${
                  sub.active ? 'bg-fingo-green' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                    sub.active ? 'left-[1.35rem]' : 'left-0.5'
                  }`}
                />
              </button>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-fingo-muted">
                {sub.active ? 'Pause' : 'Resume'}
              </span>
            </div>
          </div>
        ))}
        {subscriptions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-fingo-ink">No subscriptions yet</p>
            <p className="mt-1 text-sm text-fingo-muted">Add Netflix, Spotify, or anything you pay for regularly.</p>
            <Button className="mt-4" onClick={onAdd}>
              <Icon name="add" />
              Add subscription
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}

export function BillsPage() {
  const {
    bills,
    subscriptions,
    addBill,
    updateBill,
    deleteBill,
    setBillArchived,
    addSubscription,
    loading,
  } = useData()
  const [selected, setSelected] = useState(new Date())
  const [billOpen, setBillOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [deletingBill, setDeletingBill] = useState<Bill | null>(null)
  const [subOpen, setSubOpen] = useState(false)

  const [billName, setBillName] = useState('')
  const [billAmount, setBillAmount] = useState('')
  const [billDue, setBillDue] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'))
  const [billCategory, setBillCategory] = useState('Utilities')
  const [billStatus, setBillStatus] = useState<BillStatus>('pending')
  const [billIcon, setBillIcon] = useState<string>('receipt_long')
  const [billError, setBillError] = useState('')
  const [billSaving, setBillSaving] = useState(false)
  const [billDeleting, setBillDeleting] = useState(false)

  const [subName, setSubName] = useState('')
  const [subAmount, setSubAmount] = useState('')
  const [subCycle, setSubCycle] = useState<BillingCycle>('monthly')
  const [subNext, setSubNext] = useState(format(addDays(new Date(), 14), 'yyyy-MM-dd'))
  const [subIcon, setSubIcon] = useState<string>('subscriptions')
  const [subColor, setSubColor] = useState<string>(SUB_COLORS[0])
  const [subError, setSubError] = useState('')
  const [subSaving, setSubSaving] = useState(false)

  const activeBills = useMemo(() => bills.filter((b) => !b.archived), [bills])
  const archivedBills = useMemo(
    () =>
      [...bills]
        .filter((b) => b.archived)
        .sort((a, b) => b.due_date.localeCompare(a.due_date)),
    [bills],
  )

  const upcoming = useMemo(
    () =>
      [...activeBills]
        .filter((b) => b.status !== 'paid')
        .sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [activeBills],
  )

  const selectedBills = activeBills.filter((b) =>
    isSameDay(new Date(b.due_date + 'T12:00:00'), selected),
  )

  const overdueCount = activeBills.filter((b) => b.status === 'overdue').length

  function resetBillForm() {
    setEditingBill(null)
    setBillName('')
    setBillAmount('')
    setBillDue(format(addDays(new Date(), 7), 'yyyy-MM-dd'))
    setBillCategory('Utilities')
    setBillStatus('pending')
    setBillIcon('receipt_long')
    setBillError('')
  }

  function openAddBill() {
    resetBillForm()
    setBillOpen(true)
  }

  function openEditBill(bill: Bill) {
    setEditingBill(bill)
    setBillName(bill.name)
    setBillAmount(String(bill.amount))
    setBillDue(bill.due_date)
    setBillCategory(bill.category)
    setBillStatus(bill.status)
    setBillIcon(bill.icon)
    setBillError('')
    setBillOpen(true)
  }

  async function onSaveBill(e: FormEvent) {
    e.preventDefault()
    setBillError('')
    const amount = Number(billAmount)
    if (!billName.trim() || !amount || amount <= 0) {
      setBillError('Enter a name and valid amount.')
      return
    }
    setBillSaving(true)
    try {
      const payload = {
        name: billName.trim(),
        amount,
        due_date: billDue,
        status: billStatus,
        category: billCategory,
        icon: billIcon,
      }
      if (editingBill) await updateBill(editingBill.id, payload)
      else await addBill(payload)
      setBillOpen(false)
      resetBillForm()
      setSelected(new Date(billDue + 'T12:00:00'))
    } catch (err) {
      setBillError(err instanceof Error ? err.message : 'Could not save bill.')
    } finally {
      setBillSaving(false)
    }
  }

  async function onConfirmDelete() {
    if (!deletingBill) return
    setBillDeleting(true)
    try {
      await deleteBill(deletingBill.id)
      setDeletingBill(null)
    } catch {
      setDeletingBill(null)
    } finally {
      setBillDeleting(false)
    }
  }

  async function onArchiveBill(bill: Bill) {
    try {
      await setBillArchived(bill.id, true)
    } catch {
      /* ignore — list stays as-is */
    }
  }

  async function onRestoreBill(bill: Bill) {
    try {
      await setBillArchived(bill.id, false)
    } catch {
      /* ignore */
    }
  }

  async function onAddSub(e: FormEvent) {
    e.preventDefault()
    setSubError('')
    const amount = Number(subAmount)
    if (!subName.trim() || !amount || amount <= 0) {
      setSubError('Enter a name and valid amount.')
      return
    }
    setSubSaving(true)
    try {
      await addSubscription({
        name: subName.trim(),
        amount,
        billing_cycle: subCycle,
        next_billing_date: subNext,
        active: true,
        icon: subIcon,
        color: subColor,
      })
      setSubOpen(false)
      setSubName('')
      setSubAmount('')
      setSubNext(format(addDays(new Date(), 14), 'yyyy-MM-dd'))
    } catch (err) {
      setSubError(err instanceof Error ? err.message : 'Could not save subscription.')
    } finally {
      setSubSaving(false)
    }
  }

  if (loading) return <p className="text-fingo-muted">Loading bills…</p>

  return (
    <div className="page-enter space-y-5">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-fingo-blue">Bills</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-fingo-ink">
            Stay ahead of due dates
          </h1>
          <p className="mt-1 text-fingo-muted">
            Add your own bills and subscriptions — nothing is pre-filled for new accounts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setArchiveOpen(true)}>
            <Icon name="inventory_2" />
            Archive{archivedBills.length > 0 ? ` (${archivedBills.length})` : ''}
          </Button>
          <Button onClick={openAddBill}>
            <Icon name="add" />
            Add bill
          </Button>
          <Button variant="blue" onClick={() => setSubOpen(true)}>
            <Icon name="subscriptions" />
            Add subscription
          </Button>
        </div>
      </section>

      {overdueCount > 0 && (
        <Card className="flex items-start gap-3 border-red-100 bg-red-50 p-4">
          <Icon name="notification_important" className="text-red-500" />
          <div>
            <p className="font-display font-bold text-red-700">AI Coach reminder</p>
            <p className="text-sm text-red-600">
              You have {overdueCount} overdue bill{overdueCount > 1 ? 's' : ''}. Paying them today
              keeps fees away and frees your budget.
            </p>
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <BillCalendar bills={activeBills} selected={selected} onSelect={setSelected} />
        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-bold">
            {format(selected, 'MMM d')} · {selectedBills.length ? 'Due today' : 'No bills'}
          </h2>
          <div className="space-y-3">
            {selectedBills.map((b) => (
              <BillRow
                key={b.id}
                bill={b}
                onEdit={openEditBill}
                onDelete={setDeletingBill}
                onArchive={(bill) => void onArchiveBill(bill)}
              />
            ))}
            {selectedBills.length === 0 && (
              <p className="text-sm text-fingo-muted">
                {activeBills.length === 0
                  ? 'Add a bill to see it on the calendar.'
                  : 'Pick a dotted day to inspect bills.'}
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">Upcoming bills</h2>
            <p className="text-sm text-fingo-muted">
              Pending and overdue — archive paid or old bills to keep this list short
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="!px-3 !py-2 text-sm" onClick={() => setSelected(new Date())}>
              Today
            </Button>
            <Button className="!px-3 !py-2 text-sm" onClick={openAddBill}>
              <Icon name="add" />
              Add bill
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          {upcoming.map((b) => (
            <BillRow
              key={b.id}
              bill={b}
              onEdit={openEditBill}
              onDelete={setDeletingBill}
              onArchive={(bill) => void onArchiveBill(bill)}
            />
          ))}
          {activeBills
            .filter((b) => b.status === 'paid')
            .slice(0, 2)
            .map((b) => (
              <BillRow
                key={b.id}
                bill={b}
                onEdit={openEditBill}
                onDelete={setDeletingBill}
                onArchive={(bill) => void onArchiveBill(bill)}
              />
            ))}
          {activeBills.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-fingo-ink">No bills yet</p>
              <p className="mt-1 text-sm text-fingo-muted">
                {archivedBills.length > 0
                  ? 'Your active list is empty — restore something from the archive, or add a new bill.'
                  : 'Start with rent, utilities, phone, or insurance — whatever you pay.'}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {archivedBills.length > 0 && (
                  <Button variant="secondary" onClick={() => setArchiveOpen(true)}>
                    <Icon name="inventory_2" />
                    Open archive
                  </Button>
                )}
                <Button onClick={openAddBill}>
                  <Icon name="add" />
                  Add your first bill
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <SubscriptionList subscriptions={subscriptions} onAdd={() => setSubOpen(true)} />

      <Modal
        open={billOpen}
        title={editingBill ? 'Edit bill' : 'Add bill'}
        onClose={() => {
          setBillOpen(false)
          resetBillForm()
        }}
      >
        <form onSubmit={onSaveBill} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-fingo-muted">Name</label>
            <input
              className="input-field"
              required
              value={billName}
              onChange={(e) => setBillName(e.target.value)}
              placeholder="Internet, Rent, Phone…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-fingo-muted">Amount</label>
              <input
                className="input-field"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-fingo-muted">Due date</label>
              <input
                className="input-field"
                type="date"
                required
                value={billDue}
                onChange={(e) => setBillDue(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-fingo-muted">Category</label>
              <select
                className="input-field"
                value={billCategory}
                onChange={(e) => setBillCategory(e.target.value)}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-fingo-muted">Status</label>
              <select
                className="input-field"
                value={billStatus}
                onChange={(e) => setBillStatus(e.target.value as BillStatus)}
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-fingo-muted">Icon</label>
            <div className="flex flex-wrap gap-2">
              {BILL_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setBillIcon(icon)}
                  className={`grid h-10 w-10 place-items-center rounded-xl ${
                    billIcon === icon ? 'bg-fingo-blue text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon name={icon} />
                </button>
              ))}
            </div>
          </div>
          {billError && <p className="text-sm text-red-500">{billError}</p>}
          <Button className="w-full" type="submit" disabled={billSaving}>
            {billSaving ? 'Saving…' : editingBill ? 'Update bill' : 'Save bill'}
          </Button>
        </form>
      </Modal>

      <Modal
        open={Boolean(deletingBill)}
        title="Delete bill"
        onClose={() => setDeletingBill(null)}
      >
        <p className="text-sm text-fingo-muted">
          Delete <span className="font-semibold text-fingo-ink">{deletingBill?.name}</span>
          {deletingBill ? ` (${formatCurrency(Number(deletingBill.amount))})` : ''}? This can’t be
          undone.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setDeletingBill(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={billDeleting}
            onClick={() => void onConfirmDelete()}
          >
            {billDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Modal>

      <Modal open={archiveOpen} title="Bills archive" onClose={() => setArchiveOpen(false)}>
        <p className="mb-4 text-sm text-fingo-muted">
          Archived bills leave the calendar and upcoming list. Restore them anytime, or delete for
          good.
        </p>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          {archivedBills.map((b) => (
            <ArchivedBillRow
              key={b.id}
              bill={b}
              onRestore={(bill) => void onRestoreBill(bill)}
              onDelete={setDeletingBill}
            />
          ))}
          {archivedBills.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <Icon name="inventory_2" className="mx-auto text-slate-400" />
              <p className="mt-2 text-sm font-semibold text-fingo-ink">Archive is empty</p>
              <p className="mt-1 text-sm text-fingo-muted">
                Use Archive on any bill to tuck it away when your list gets long.
              </p>
            </div>
          )}
        </div>
      </Modal>

      <Modal open={subOpen} title="Add subscription" onClose={() => setSubOpen(false)}>
        <form onSubmit={onAddSub} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-fingo-muted">Name</label>
            <input
              className="input-field"
              required
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              placeholder="Netflix, Spotify…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-fingo-muted">Amount</label>
              <input
                className="input-field"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={subAmount}
                onChange={(e) => setSubAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-fingo-muted">Billing cycle</label>
              <select
                className="input-field"
                value={subCycle}
                onChange={(e) => setSubCycle(e.target.value as BillingCycle)}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-fingo-muted">Next billing date</label>
            <input
              className="input-field"
              type="date"
              required
              value={subNext}
              onChange={(e) => setSubNext(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-fingo-muted">Icon</label>
            <div className="flex flex-wrap gap-2">
              {SUB_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSubIcon(icon)}
                  className={`grid h-10 w-10 place-items-center rounded-xl ${
                    subIcon === icon ? 'bg-fingo-blue text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon name={icon} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-fingo-muted">Color</label>
            <div className="flex flex-wrap gap-2">
              {SUB_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSubColor(color)}
                  className={`h-8 w-8 rounded-full border-2 ${
                    subColor === color ? 'border-fingo-ink scale-110' : 'border-white'
                  }`}
                  style={{ background: color }}
                />
              ))}
            </div>
          </div>
          {subError && <p className="text-sm text-red-500">{subError}</p>}
          <Button className="w-full" type="submit" disabled={subSaving}>
            {subSaving ? 'Saving…' : 'Save subscription'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
