import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../../contexts/DataContext'
import { todayISO } from '../../lib/format'
import { computeTransactionStreak } from '../../lib/streaks'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function weekdayLabel(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return WEEKDAYS[new Date(y, m - 1, d).getDay()]
}

export function TransactionStreakCard() {
  const { transactions } = useData()
  const streak = useMemo(() => computeTransactionStreak(transactions), [transactions])
  const today = todayISO()

  const headline =
    streak.current === 0
      ? 'Start your logging streak'
      : streak.current === 1
        ? '1 day streak'
        : `${streak.current} day streak`

  const subtitle = streak.loggedToday
    ? 'You logged a transaction today — keep it going tomorrow.'
    : streak.current > 0
      ? 'Log something today to keep your streak alive.'
      : 'Log at least one income or expense each day to build a streak.'

  return (
    <Card className="overflow-hidden p-0">
      <div className="bg-gradient-to-br from-orange-50 via-white to-fingo-green-soft px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`grid h-12 w-12 place-items-center rounded-2xl shadow-sm ${
                streak.current > 0
                  ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white'
                  : 'bg-white text-orange-400'
              }`}
            >
              <Icon name="local_fire_department" className="text-[1.6rem]" filled={streak.current > 0} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-orange-600/80">Logging streak</p>
              <h2 className="font-display text-2xl font-extrabold text-fingo-ink">{headline}</h2>
              <p className="mt-1 max-w-md text-sm text-fingo-muted">{subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 sm:justify-end">
            <div className="rounded-2xl bg-white/90 px-4 py-2 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wide text-fingo-muted">Best</p>
              <p className="font-display text-lg font-extrabold text-fingo-ink">
                {streak.best} day{streak.best === 1 ? '' : 's'}
              </p>
            </div>
            <div className="rounded-2xl bg-white/90 px-4 py-2 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wide text-fingo-muted">Today</p>
              <p
                className={`font-display text-lg font-extrabold ${
                  streak.loggedToday ? 'text-fingo-green' : 'text-fingo-muted'
                }`}
              >
                {streak.loggedToday ? 'Logged' : 'Pending'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-fingo-muted">Last 7 days</p>
          <div className="flex gap-2">
            {streak.recentDays.map((day) => {
              const isToday = day.date === today
              return (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className={`flex h-10 w-full max-w-12 items-center justify-center rounded-xl text-sm font-bold ${
                      day.logged
                        ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-sm'
                        : isToday
                          ? 'border-2 border-dashed border-orange-300 bg-white text-orange-300'
                          : 'bg-white/70 text-slate-300'
                    }`}
                    title={day.date}
                  >
                    {day.logged ? (
                      <Icon name="check" className="text-[1.1rem]" />
                    ) : (
                      <Icon name="remove" className="text-[1rem]" />
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-fingo-muted">{weekdayLabel(day.date)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {!streak.loggedToday && (
          <Link
            to="/"
            className="mt-5 inline-flex items-center gap-1 rounded-full bg-fingo-ink px-4 py-2 font-display text-sm font-bold text-white"
          >
            Log a transaction
            <Icon name="arrow_forward" className="text-[1.1rem]" />
          </Link>
        )}
      </div>
    </Card>
  )
}
