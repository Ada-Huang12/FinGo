import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { EXPENSE_CATEGORIES } from '../lib/format'
import { EMPTY_COACH_PREFS, type CoachPrefs } from '../lib/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'

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

export function OnboardingPage() {
  const { user, loading, saveCoachPrefs } = useAuth()
  const navigate = useNavigate()
  const [jobTitle, setJobTitle] = useState('')
  const [yearlyIncome, setYearlyIncome] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [moneyGoal, setMoneyGoal] = useState('')
  const [spendFocus, setSpendFocus] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-fingo-muted">Loading FinGo…</div>
    )
  }
  if (!user) return <Navigate to="/signup" replace />
  if (user.onboarding_completed) return <Navigate to="/" replace />

  async function finish(prefs: CoachPrefs) {
    setBusy(true)
    setError('')
    try {
      await saveCoachPrefs(prefs, { complete: true })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your answers.')
    } finally {
      setBusy(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const yearly = parseMoney(yearlyIncome)
    let monthly = parseMoney(monthlyIncome)
    if (yearly != null && monthly == null) monthly = Math.round((yearly / 12) * 100) / 100

    await finish({
      job_title: jobTitle.trim() || null,
      yearly_income: yearly,
      monthly_income: monthly,
      money_goal: moneyGoal.trim() || null,
      spend_focus: spendFocus.trim() || null,
      notes: notes.trim() || null,
    })
  }

  async function onSkip() {
    await finish(EMPTY_COACH_PREFS)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-fingo-green/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-72 w-72 rounded-full bg-fingo-blue/20 blur-3xl" />

      <div className="relative w-full max-w-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-3xl bg-gradient-to-br from-fingo-green to-emerald-600 text-white shadow-lg">
            <Icon name="smart_toy" className="text-[1.75rem]" filled />
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            Quick coach setup
          </h1>
          <p className="mt-2 text-fingo-muted">
            Optional questions so FinGo Coach can personalize tips for {user.full_name.split(' ')[0]}.
          </p>
        </div>

        <Card className="p-6 sm:p-7">
          <form onSubmit={onSubmit} className="space-y-5">
            <section className="space-y-3">
              <div>
                <h2 className="font-display text-lg font-bold text-fingo-ink">Work & income</h2>
                <p className="text-sm text-fingo-muted">
                  What job are you currently working, and how much do you make yearly and monthly?
                </p>
              </div>
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
                  <label className="mb-1 block text-sm font-semibold text-fingo-muted">
                    Yearly income
                  </label>
                  <input
                    className="input-field"
                    inputMode="decimal"
                    value={yearlyIncome}
                    onChange={(e) => setYearlyIncome(e.target.value)}
                    placeholder="e.g. 65000"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-fingo-muted">
                    Monthly income
                  </label>
                  <input
                    className="input-field"
                    inputMode="decimal"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    placeholder="e.g. 4200"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <h2 className="font-display text-lg font-bold text-fingo-ink">Main money goal</h2>
                <p className="text-sm text-fingo-muted">What should the coach prioritize?</p>
              </div>
              <div className="flex flex-wrap gap-2">
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
            </section>

            <section className="space-y-3">
              <div>
                <h2 className="font-display text-lg font-bold text-fingo-ink">Spending focus</h2>
                <p className="text-sm text-fingo-muted">Where do you tend to overspend?</p>
              </div>
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
            </section>

            <section>
              <label className="mb-1 block text-sm font-semibold text-fingo-muted">
                Anything else the coach should know?
              </label>
              <textarea
                className="input-field min-h-[88px] resize-y"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Saving for a move in 6 months, share rent with a roommate…"
              />
            </section>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="w-full sm:flex-1" disabled={busy} type="submit">
                {busy ? 'Saving…' : 'Save & continue'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:flex-1"
                disabled={busy}
                onClick={() => void onSkip()}
              >
                Skip for now
              </Button>
            </div>

            <p className="rounded-2xl bg-fingo-blue-soft/60 px-4 py-3 text-sm leading-relaxed text-fingo-blue-dark">
              You can change any of these answers later by telling the AI Coach — for example, “I
              switched jobs to teaching and make $55,000 a year” or “Update my money goal to pay off
              debt.”
            </p>
          </form>
        </Card>
      </div>
    </div>
  )
}
