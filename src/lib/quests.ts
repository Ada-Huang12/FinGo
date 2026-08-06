import { format, startOfWeek } from 'date-fns'
import { currentMonth, todayISO } from './format'
import type { Bill, Budget, Goal, GoalContribution, Transaction } from './types'

export type QuestPeriod = 'daily' | 'weekly'

export interface QuestDef {
  id: string
  title: string
  description: string
  xp: number
  period: QuestPeriod
  icon: string
}

export interface QuestClaim {
  quest_id: string
  period_key: string
  xp_awarded: number
  claimed_at: string
}

export interface QuestStatus {
  quest: QuestDef
  periodKey: string
  progress: number
  target: number
  percent: number
  complete: boolean
  claimed: boolean
  claimable: boolean
}

/** Personal finance quests. XP also credits spendable shop points on claim. */
export const QUEST_CATALOG: QuestDef[] = [
  {
    id: 'log_daily_expense',
    title: 'Log a daily expense',
    description: 'Record at least one expense today.',
    xp: 25,
    period: 'daily',
    icon: 'receipt_long',
  },
  {
    id: 'log_daily_income',
    title: 'Log today’s income',
    description: 'Add an income transaction for today.',
    xp: 25,
    period: 'daily',
    icon: 'payments',
  },
  {
    id: 'under_budget_week',
    title: 'Stay under budget this week',
    description: 'Keep every active budget category at or under its limit.',
    xp: 60,
    period: 'weekly',
    icon: 'pie_chart',
  },
  {
    id: 'save_50_goal',
    title: 'Save $50 into a goal',
    description: 'Contribute at least $50 to any savings goal this week.',
    xp: 50,
    period: 'weekly',
    icon: 'flag',
  },
  {
    id: 'pay_a_bill',
    title: 'Pay a bill',
    description: 'Mark at least one bill as paid this week.',
    xp: 40,
    period: 'weekly',
    icon: 'check_circle',
  },
]

export function questPeriodKey(period: QuestPeriod, now = new Date()): string {
  if (period === 'daily') return todayISO()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  return `w-${format(weekStart, 'yyyy-MM-dd')}`
}

/** Flat 100 XP per level: Level 1 = 0–99, Level 2 = 100–199, … */
export function levelFromXp(xp: number) {
  const safe = Math.max(0, Math.floor(Number(xp) || 0))
  const xpPerLevel = 100
  const level = Math.floor(safe / xpPerLevel) + 1
  const xpIntoLevel = safe % xpPerLevel
  const xpToNext = xpPerLevel - xpIntoLevel
  const percent = Math.round((xpIntoLevel / xpPerLevel) * 100)
  return {
    level,
    xp: safe,
    xpIntoLevel,
    xpPerLevel,
    xpToNext,
    percent,
    nextLevelAt: level * xpPerLevel,
  }
}

export function getQuestById(id: string): QuestDef | undefined {
  return QUEST_CATALOG.find((q) => q.id === id)
}

function weekStartISO(now = new Date()): string {
  return format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

function inCurrentWeek(isoDate: string, now = new Date()): boolean {
  const start = weekStartISO(now)
  // Compare calendar dates (YYYY-MM-DD or ISO timestamps)
  const day = isoDate.slice(0, 10)
  return day >= start && day <= todayISO()
}

export function evaluateQuestProgress(
  quest: QuestDef,
  ctx: {
    transactions: Transaction[]
    budgets: Budget[]
    bills: Bill[]
    goals: Goal[]
    contributions: GoalContribution[]
    userId: string
  },
): { progress: number; target: number } {
  const today = todayISO()
  const month = currentMonth()

  switch (quest.id) {
    case 'log_daily_expense': {
      const count = ctx.transactions.filter(
        (t) => t.type === 'expense' && String(t.date).slice(0, 10) === today,
      ).length
      return { progress: Math.min(1, count), target: 1 }
    }
    case 'log_daily_income': {
      const count = ctx.transactions.filter(
        (t) => t.type === 'income' && String(t.date).slice(0, 10) === today,
      ).length
      return { progress: Math.min(1, count), target: 1 }
    }
    case 'under_budget_week': {
      const monthBudgets = ctx.budgets.filter((b) => b.month === month)
      if (monthBudgets.length === 0) return { progress: 0, target: 1 }
      const allUnder = monthBudgets.every((b) => Number(b.spent_amount) <= Number(b.limit_amount))
      return { progress: allUnder ? 1 : 0, target: 1 }
    }
    case 'save_50_goal': {
      const saved = ctx.contributions
        .filter((c) => c.user_id === ctx.userId && inCurrentWeek(c.created_at))
        .reduce((s, c) => s + Number(c.amount), 0)
      return { progress: Math.min(50, Math.round(saved * 100) / 100), target: 50 }
    }
    case 'pay_a_bill': {
      // Bills don't store paid_at; treat any currently paid bill as progress for the week.
      const paid = ctx.bills.filter((b) => b.status === 'paid').length
      return { progress: Math.min(1, paid), target: 1 }
    }
    default:
      return { progress: 0, target: 1 }
  }
}

export function buildQuestStatuses(
  claims: QuestClaim[],
  ctx: {
    transactions: Transaction[]
    budgets: Budget[]
    bills: Bill[]
    goals: Goal[]
    contributions: GoalContribution[]
    userId: string
  },
): QuestStatus[] {
  return QUEST_CATALOG.map((quest) => {
    const periodKey = questPeriodKey(quest.period)
    const claimed = claims.some((c) => c.quest_id === quest.id && c.period_key === periodKey)
    const { progress, target } = evaluateQuestProgress(quest, ctx)
    const percent = target <= 0 ? 0 : Math.min(100, Math.round((progress / target) * 100))
    const complete = progress >= target
    return {
      quest,
      periodKey,
      progress,
      target,
      percent,
      complete,
      claimed,
      claimable: complete && !claimed,
    }
  })
}
