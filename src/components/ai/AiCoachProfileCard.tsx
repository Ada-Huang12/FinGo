import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { EXPENSE_CATEGORIES, formatCurrency } from '../../lib/format'
import type { CoachPrefs } from '../../lib/types'
import { AvatarFigure } from '../avatar/AvatarFigure'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'

const MONEY_GOALS = [
  'Build an emergency fund',
  'Pay off debt',
  'Stick to a budget',
  'Save for a big purchase',
  'Invest for the future',
]

function parseMoney(raw: string): number | null {
  const n = Number(raw.replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

function ProfileFact({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: string | null
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-fingo-muted">
        <Icon name={icon} className="text-[1.1rem]" />
        <span className="text-[11px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-sm font-semibold ${value ? 'text-fingo-ink' : 'text-fingo-muted'}`}>
        {value ?? 'Not set yet'}
      </p>
    </div>
  )
}

export function AiCoachProfileCard() {
  const { user, saveCoachPrefs } = useAuth()
  const [editOpen, setEditOpen] = useState(false)
  const [jobTitle, setJobTitle] = useState('')
  const [yearlyIncome, setYearlyIncome] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [moneyGoal, setMoneyGoal] = useState('')
  const [spendFocus, setSpendFocus] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)

  const prefs = user?.coach_prefs

  useEffect(() => {
    if (!editOpen || !user) return
    const p = user.coach_prefs
    setJobTitle(p.job_title ?? '')
    setYearlyIncome(p.yearly_income != null ? String(p.yearly_income) : '')
    setMonthlyIncome(p.monthly_income != null ? String(p.monthly_income) : '')
    setMoneyGoal(p.money_goal ?? '')
    setSpendFocus(p.spend_focus ?? '')
    setNotes(p.notes ?? '')
    setError('')
  }, [editOpen, user])

  if (!user) return null

  const hasAnyPref = Boolean(
    prefs?.job_title ||
      prefs?.yearly_income != null ||
      prefs?.monthly_income != null ||
      prefs?.money_goal ||
      prefs?.spend_focus ||
      prefs?.notes,
  )

  async function onSave(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const yearly = parseMoney(yearlyIncome)
      let monthly = parseMoney(monthlyIncome)
      if (yearly != null && monthly == null) monthly = Math.round((yearly / 12) * 100) / 100

      const next: CoachPrefs = {
        job_title: jobTitle.trim() || null,
        yearly_income: yearly,
        monthly_income: monthly,
        money_goal: moneyGoal.trim() || null,
        spend_focus: spendFocus.trim() || null,
        notes: notes.trim() || null,
      }
      await saveCoachPrefs(next)
      setEditOpen(false)
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 bg-gradient-to-r from-fingo-green-soft/80 via-white to-fingo-blue-soft/80 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <AvatarFigure
                name={user.full_name}
                skin={user.avatar_skin}
                equipped={user.avatar_equipped}
                size={72}
                className="shadow-md"
              />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-fingo-green">
                  AI Coach profile
                </p>
                <h2 className="font-display text-xl font-extrabold text-fingo-ink">{user.full_name}</h2>
                <p className="text-sm text-fingo-muted">{user.email}</p>
              </div>
            </div>
            <Button variant="secondary" className="!px-3 !py-2 text-sm" onClick={() => setEditOpen(true)}>
              <Icon name="edit" />
              Edit
            </Button>
          </div>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          {savedFlash && (
            <p className="rounded-2xl bg-fingo-green-soft px-3 py-2 text-sm font-semibold text-fingo-green-dark">
              Coach profile updated.
            </p>
          )}

          {!hasAnyPref ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
              <p className="text-sm font-semibold text-fingo-ink">No coach details yet</p>
              <p className="mt-1 text-sm text-fingo-muted">
                Add your job, income, and goals so tips feel personal — or tell the coach in chat.
              </p>
              <Button className="mt-4" onClick={() => setEditOpen(true)}>
                <Icon name="person" />
                Set up profile
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <ProfileFact icon="work" label="Job / role" value={prefs?.job_title ?? null} />
                <ProfileFact
                  icon="payments"
                  label="Yearly income"
                  value={prefs?.yearly_income != null ? formatCurrency(prefs.yearly_income) : null}
                />
                <ProfileFact
                  icon="calendar_month"
                  label="Monthly income"
                  value={prefs?.monthly_income != null ? formatCurrency(prefs.monthly_income) : null}
                />
                <ProfileFact icon="flag" label="Money goal" value={prefs?.money_goal ?? null} />
                <ProfileFact icon="shopping_bag" label="Spend focus" value={prefs?.spend_focus ?? null} />
              </div>
              {prefs?.notes && (
                <div className="rounded-2xl bg-fingo-blue-soft/50 p-4">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-fingo-blue">
                    Notes for coach
                  </p>
                  <p className="text-sm leading-relaxed text-fingo-ink">{prefs.notes}</p>
                </div>
              )}
            </>
          )}

          <p className="text-xs text-fingo-muted">
            You can also update this in chat — e.g. “I work as a nurse and make $70,000 a year.”
          </p>
        </div>
      </Card>

      <Modal open={editOpen} wide title="Edit coach profile" onClose={() => setEditOpen(false)}>
        <form onSubmit={onSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-fingo-muted">Job / role</label>
            <input
              className="input-field"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Student, nurse, software engineer…"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-fingo-muted">Yearly income</label>
              <input
                className="input-field"
                inputMode="decimal"
                value={yearlyIncome}
                onChange={(e) => setYearlyIncome(e.target.value)}
                placeholder="e.g. 65000"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-fingo-muted">Monthly income</label>
              <input
                className="input-field"
                inputMode="decimal"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                placeholder="e.g. 4200"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-fingo-muted">Main money goal</label>
            <div className="mb-2 flex flex-wrap gap-2">
              {MONEY_GOALS.map((goal) => (
                <button
                  key={goal}
                  type="button"
                  onClick={() => setMoneyGoal(goal)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    moneyGoal === goal
                      ? 'bg-fingo-ink text-white'
                      : 'bg-slate-100 text-fingo-muted hover:bg-slate-200'
                  }`}
                >
                  {goal}
                </button>
              ))}
            </div>
            <input
              className="input-field"
              value={moneyGoal}
              onChange={(e) => setMoneyGoal(e.target.value)}
              placeholder="Or type your own goal"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-fingo-muted">Spending focus</label>
            <div className="flex flex-wrap gap-2">
              {EXPENSE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSpendFocus(cat)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    spendFocus === cat
                      ? 'bg-fingo-ink text-white'
                      : 'bg-slate-100 text-fingo-muted hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-fingo-muted">Notes for coach</label>
            <textarea
              className="input-field min-h-[88px] resize-y"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything else that helps personalize tips…"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button className="w-full" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save profile'}
          </Button>
        </form>
      </Modal>
    </>
  )
}
