import { todayISO } from './format'
import type { Transaction } from './types'

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(iso: string, delta: number): string {
  const d = parseLocalDate(iso)
  d.setDate(d.getDate() + delta)
  return formatLocalDate(d)
}

export interface TransactionStreak {
  current: number
  best: number
  loggedToday: boolean
  /** Oldest → newest, last 7 calendar days including today */
  recentDays: { date: string; logged: boolean }[]
}

/** Consecutive calendar days with ≥1 transaction, based on transaction `date`. */
export function computeTransactionStreak(transactions: Transaction[]): TransactionStreak {
  const logged = new Set(
    transactions.map((t) => String(t.date).slice(0, 10)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)),
  )

  const today = todayISO()
  const loggedToday = logged.has(today)

  let current = 0
  let cursor = loggedToday ? today : addDays(today, -1)
  if (logged.has(cursor)) {
    while (logged.has(cursor)) {
      current += 1
      cursor = addDays(cursor, -1)
    }
  }

  const sorted = [...logged].sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const day of sorted) {
    if (prev && addDays(prev, 1) === day) run += 1
    else run = 1
    best = Math.max(best, run)
    prev = day
  }

  const recentDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6)
    return { date, logged: logged.has(date) }
  })

  return { current, best: Math.max(best, current), loggedToday, recentDays }
}
