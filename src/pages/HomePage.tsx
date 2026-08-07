import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { currentMonth, formatCurrency } from '../lib/format'
import { IncomeSpendingChart } from '../components/charts/IncomeSpendingChart'
import { CategoryChart } from '../components/charts/CategoryChart'
import { BudgetTracker } from '../components/home/BudgetTracker'
import { AiTipCard } from '../components/home/AiTipCard'
import { LevelProgressCard } from '../components/home/LevelProgressCard'
import { QuestsCard } from '../components/home/QuestsCard'
import { TransactionHistoryCard } from '../components/home/TransactionHistoryCard'
import { AddTransactionButton } from '../components/home/AddTransactionButton'
import { ImportScanButton } from '../components/home/ImportScanButton'
import { Card } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'

export function HomePage() {
  const { user } = useAuth()
  const { chartData, categoryData, budgets, transactions, loading, lastPointsEarned, clearPointsToast } =
    useData()

  const month = currentMonth()
  const monthTx = transactions.filter((t) => String(t.date).startsWith(month))
  const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const spending = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  if (loading) {
    return <p className="page-enter text-fingo-muted">Loading your dashboard…</p>
  }

  return (
    <div className="page-enter space-y-5">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-fingo-green">Home</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-fingo-ink sm:text-4xl">
            Your money pulse
          </h1>
          <p className="mt-1 max-w-xl text-fingo-muted">
            Track income, spending, and budgets in one friendly view.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
          <AddTransactionButton />
          <ImportScanButton />
        </div>
      </section>

      {lastPointsEarned != null && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-fingo-green-soft px-4 py-3 text-sm text-fingo-ink">
          <span className="font-semibold">+{lastPointsEarned} XP earned!</span>
          <button type="button" className="font-semibold text-fingo-muted" onClick={clearPointsToast}>
            Dismiss
          </button>
        </div>
      )}

      <AiTipCard name={user?.full_name ?? 'friend'} />

      <section className="grid items-stretch gap-5 lg:grid-cols-2">
        <TransactionHistoryCard />
        <div className="flex flex-col gap-5">
          <LevelProgressCard />
          <QuestsCard />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2 text-fingo-muted">
            <Icon name="trending_up" className="text-fingo-green" />
            <span className="text-sm font-semibold">Income</span>
          </div>
          <p className="font-display text-2xl font-extrabold text-fingo-ink">{formatCurrency(income)}</p>
          <p className="mt-1 text-xs text-fingo-muted">This month</p>
        </Card>
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2 text-fingo-muted">
            <Icon name="trending_down" className="text-fingo-blue" />
            <span className="text-sm font-semibold">Spending</span>
          </div>
          <p className="font-display text-2xl font-extrabold text-fingo-ink">{formatCurrency(spending)}</p>
          <p className="mt-1 text-xs text-fingo-muted">This month</p>
        </Card>
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2 text-fingo-muted">
            <Icon name="savings" className="text-amber-500" />
            <span className="text-sm font-semibold">Net</span>
          </div>
          <p className="font-display text-2xl font-extrabold text-fingo-ink">
            {formatCurrency(income - spending)}
          </p>
          <p className="mt-1 text-xs text-fingo-muted">This month</p>
        </Card>
      </section>

      <IncomeSpendingChart data={chartData} />

      <section className="grid gap-5 lg:grid-cols-2">
        <BudgetTracker budgets={budgets} />
        <CategoryChart data={categoryData} />
      </section>
    </div>
  )
}
