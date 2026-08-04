export function formatCurrency(amount: number, compact = false): string {
  if (compact && Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string): string {
  return new Date(date + (date.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatShortDate(date: string): string {
  return new Date(date + (date.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** Local calendar date as YYYY-MM-DD (avoids UTC shift from toISOString). */
export function todayISO(): string {
  const now = new Date()
  return `${currentMonth()}-${String(now.getDate()).padStart(2, '0')}`
}

export function uid(): string {
  return crypto.randomUUID()
}

export function percent(current: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, Math.round((current / target) * 100))
}

export const CATEGORY_COLORS: Record<string, string> = {
  Food: '#F59E0B',
  Transport: '#3B82F6',
  Shopping: '#EC4899',
  Entertainment: '#8B5CF6',
  Utilities: '#06B6D4',
  Health: '#EF4444',
  Housing: '#22C55E',
  Education: '#6366F1',
  Other: '#94A3B8',
  Salary: '#22C55E',
  Freelance: '#3B82F6',
}

export const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Entertainment',
  'Utilities',
  'Health',
  'Housing',
  'Education',
  'Other',
] as const

export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Other'] as const
