import { puter } from '@heyputer/puter.js'
import { inferCategory } from './importParsers'
import { EXPENSE_CATEGORIES, formatCurrency, formatShortDate, todayISO } from './format'
import type {
  BillingCycle,
  Bill,
  BillStatus,
  Budget,
  CoachPrefs,
  Goal,
  Subscription,
  Transaction,
  TransactionType,
} from './types'

export type CoachAction =
  | {
      kind: 'transaction'
      type: TransactionType
      amount: number
      category: string
      description: string
      date: string
    }
  | {
      kind: 'bill'
      name: string
      amount: number
      due_date: string
      status: BillStatus
      category: string
      icon: string
    }
  | {
      kind: 'subscription'
      name: string
      amount: number
      billing_cycle: BillingCycle
      next_billing_date: string
      active: boolean
      icon: string
      color: string
    }
  | {
      kind: 'profile_prefs'
      prefs: Partial<CoachPrefs>
    }
  | {
      kind: 'budget'
      category: string
      limit_amount: number
    }

export interface CoachResult {
  reply: string
  actions: CoachAction[]
  provider: 'puter' | 'local' | 'action'
  model?: string | null
}

/** Model used for Puter conversational replies. */
export const PUTER_COACH_MODEL = 'gpt-5-nano'

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return formatLocalDate(date)
}

function cleanPhrase(raw: string): string {
  return raw
    .replace(/\b(please|thanks|thank you|log it|log this|add it|record it)\b/gi, '')
    .replace(/[?.!,]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function titleCase(raw: string): string {
  const cleaned = cleanPhrase(raw)
  if (!cleaned) return 'Item'
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function parseAmount(text: string): number | null {
  const patterns = [
    /\$\s*([\d,]+(?:\.\d{1,2})?)/,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:dollars?|usd|bucks)\b/i,
    /(?:spent|paid|bought|cost|costs|earned|received|got\s+paid|income|deposit(?:ed)?|bill|subscription|for|of)\s+\$?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /\b([\d,]+(?:\.\d{1,2})?)\b/,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (!m) continue
    const n = Number((m[1] ?? '').replace(/,/g, ''))
    if (Number.isFinite(n) && n > 0) return Math.round(n * 100) / 100
  }
  return null
}

function parseRelativeDate(text: string): string {
  const q = text.toLowerCase()
  const today = todayISO()

  if (/\byesterday\b/.test(q)) return addDaysISO(today, -1)
  if (/\btomorrow\b/.test(q)) return addDaysISO(today, 1)
  if (/\bnext week\b/.test(q)) return addDaysISO(today, 7)
  if (/\btoday\b/.test(q)) return today

  const inDays = q.match(/\bin\s+(\d+)\s+days?\b/)
  if (inDays) return addDaysISO(today, Number(inDays[1]))

  const iso = q.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/)
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
  }

  // Avoid matching money like 15.99 — only slash/dash calendar dates.
  const slash = q.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/)
  if (slash) {
    const month = Number(slash[1])
    const day = Number(slash[2])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const year = slash[3]
        ? slash[3].length === 2
          ? `20${slash[3]}`
          : slash[3]
        : String(new Date().getFullYear())
      return `${year}-${slash[1].padStart(2, '0')}-${slash[2].padStart(2, '0')}`
    }
  }

  const dayOfMonth = q.match(/\b(?:on\s+the\s+|due\s+(?:on\s+)?(?:the\s+)?)(\d{1,2})(?:st|nd|rd|th)?\b/)
  if (dayOfMonth) {
    const day = Number(dayOfMonth[1])
    const now = new Date()
    let candidate = new Date(now.getFullYear(), now.getMonth(), day)
    if (candidate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      candidate = new Date(now.getFullYear(), now.getMonth() + 1, day)
    }
    return formatLocalDate(candidate)
  }

  const months =
    'january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec'
  const named = q.match(new RegExp(`\\b(${months})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*,?\\s*(\\d{4}))?\\b`))
  if (named) {
    const parsed = new Date(`${named[1]} ${named[2]}, ${named[3] ?? new Date().getFullYear()}`)
    if (!Number.isNaN(parsed.getTime())) return formatLocalDate(parsed)
  }

  return today
}

function parseBillingCycle(text: string): BillingCycle {
  const q = text.toLowerCase()
  if (/\b(yearly|annually|annual|year)\b/.test(q)) return 'yearly'
  if (/\b(weekly|every week|per week|a week)\b/.test(q)) return 'weekly'
  return 'monthly'
}

function pickBillIcon(name: string, category: string): string {
  const hay = `${name} ${category}`.toLowerCase()
  if (/wifi|internet|comcast/.test(hay)) return 'wifi'
  if (/electric|power|utility|gas/.test(hay)) return 'bolt'
  if (/phone|mobile|verizon|at&t/.test(hay)) return 'smartphone'
  if (/car|auto|gas|uber|transport/.test(hay)) return 'directions_car'
  if (/gym|fitness/.test(hay)) return 'fitness_center'
  if (/rent|mortgage|housing|home/.test(hay)) return 'home'
  if (/water/.test(hay)) return 'water_drop'
  if (/health|doctor|dental|hospital/.test(hay)) return 'local_hospital'
  return 'receipt_long'
}

function pickSubIcon(name: string): string {
  const hay = name.toLowerCase()
  if (/netflix|hulu|disney|movie|prime video|youtube/.test(hay)) return 'movie'
  if (/spotify|apple music|music|tidal/.test(hay)) return 'music_note'
  if (/icloud|dropbox|google one|aws|cloud/.test(hay)) return 'cloud'
  if (/adobe|canva|figma|design/.test(hay)) return 'brush'
  if (/game|xbox|playstation|steam|nintendo/.test(hay)) return 'sports_esports'
  if (/news|nyt|wsj|magazine/.test(hay)) return 'newspaper'
  return 'subscriptions'
}

function pickSubColor(name: string): string {
  const hay = name.toLowerCase()
  if (/netflix/.test(hay)) return '#EF4444'
  if (/spotify/.test(hay)) return '#22C55E'
  if (/disney|hulu/.test(hay)) return '#3B82F6'
  if (/adobe/.test(hay)) return '#EC4899'
  if (/apple/.test(hay)) return '#94A3B8'
  return '#8B5CF6'
}

function extractAfter(text: string, patterns: RegExp[]): string {
  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]) {
      const cleaned = cleanPhrase(m[1])
      if (cleaned) return cleaned
    }
  }
  return ''
}

function looksLikeSubscription(q: string): boolean {
  return (
    /\b(add|create|start|set\s*up)\b.{0,20}\bsubscri/i.test(q) ||
    /\bsubscri(be|ption)\b.{0,40}\b(add|create|log|schedule|for|\$|\d)/i.test(q) ||
    /\badd\b.{0,20}\b(netflix|spotify|hulu|disney|youtube|apple music|adobe)\b/i.test(q)
  )
}

function looksLikeBill(q: string): boolean {
  return (
    /\b(schedule|add|create|set\s*up)\b.{0,24}\bbill\b/i.test(q) ||
    /\bbill\b.{0,24}\b(schedule|add|create|due|remind)/i.test(q) ||
    /\bremind me (to pay|about)\b/i.test(q) ||
    /\bschedule\b.{0,20}\b(payment|rent|utilities|electric|wifi)\b/i.test(q)
  )
}

function looksLikeIncome(q: string): boolean {
  return (
    /\b(earned|received|got paid|paycheck|payroll|deposit(?:ed)?|income)\b/i.test(q) ||
    /\b(log|add|record)\b.{0,16}\bincome\b/i.test(q) ||
    /\bincome\b.{0,16}\b(log|add|record|of|from)\b/i.test(q)
  )
}

function looksLikeExpense(q: string): boolean {
  return (
    /\b(spent|paid|bought|purchase(?:d)?|cost me)\b/i.test(q) ||
    /\b(log|add|record)\b.{0,16}\b(expense|purchase|spending)\b/i.test(q) ||
    /\b(expense|purchase)\b.{0,16}\b(log|add|record)\b/i.test(q) ||
    (/\blog it\b/i.test(q) && parseAmount(q) != null)
  )
}

function looksLikeBudgetSet(q: string): boolean {
  const hasVerb =
    /\b(set|create|add|update|change|raise|lower|increase|decrease|adjust)\b.{0,40}\bbudgets?\b/i.test(q) ||
    /\bbudgets?\b.{0,40}\b(set|create|add|update|change|raise|lower|increase|decrease|adjust)\b/i.test(q)
  const hasLimitPhrase =
    /\bbudgets?\b.{0,40}\b(to|at|of)\s+\$?\s*\d/i.test(q) ||
    /\b(cap|limit)\b.{0,24}\b(for|on)\b.{0,24}\b(food|transport|shopping|entertainment|utilities|health|housing|education|other|grocer|rent|gas)\b/i.test(
      q,
    )
  return hasVerb || hasLimitPhrase
}

function parseBudgetCategory(prompt: string): string | null {
  for (const cat of EXPENSE_CATEGORIES) {
    if (new RegExp(`\\b${cat}\\b`, 'i').test(prompt)) return cat
  }
  const alias: Record<string, (typeof EXPENSE_CATEGORIES)[number]> = {
    groceries: 'Food',
    grocery: 'Food',
    snacks: 'Food',
    dining: 'Food',
    restaurants: 'Food',
    gas: 'Transport',
    commute: 'Transport',
    uber: 'Transport',
    lyft: 'Transport',
    clothes: 'Shopping',
    clothing: 'Shopping',
    movies: 'Entertainment',
    fun: 'Entertainment',
    wifi: 'Utilities',
    electric: 'Utilities',
    utilities: 'Utilities',
    rent: 'Housing',
    mortgage: 'Housing',
    doctor: 'Health',
    medical: 'Health',
    school: 'Education',
    tuition: 'Education',
  }
  const q = prompt.toLowerCase()
  for (const [word, cat] of Object.entries(alias)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(q)) return cat
  }
  return null
}

function parseBudgetIntent(prompt: string): CoachAction | { needAmount: true; reply: string } | null {
  const q = prompt.toLowerCase()
  if (!looksLikeBudgetSet(q)) return null

  const category = parseBudgetCategory(prompt)
  const amount = parseAmount(prompt)

  if (!category && amount == null) {
    return {
      needAmount: true,
      reply:
        'I can set a monthly budget — which category and limit? Example: “Set my Food budget to $400”.',
    }
  }
  if (!category) {
    return {
      needAmount: true,
      reply: `I can set that $${amount} budget — which category? Try Food, Transport, Shopping, Entertainment, Utilities, Health, Housing, Education, or Other.`,
    }
  }
  if (amount == null) {
    return {
      needAmount: true,
      reply: `I can set your ${category} budget — what’s the monthly limit? Example: “Set ${category} budget to $300”.`,
    }
  }

  return {
    kind: 'budget',
    category,
    limit_amount: amount,
  }
}

function parseSubscriptionIntent(prompt: string): CoachAction | { needAmount: true; reply: string } | null {
  const q = prompt.toLowerCase()
  if (!looksLikeSubscription(q)) return null

  const amount = parseAmount(prompt)
  if (amount == null) {
    return {
      needAmount: true,
      reply:
        'I can add that subscription — what’s the amount and billing cycle? Example: “Add Netflix subscription for $15.99 monthly”.',
    }
  }

  let name = extractAfter(prompt, [
    /(?:add|create|start|set\s*up)\s+(?:a\s+|an\s+|my\s+)?(?:subscription\s+(?:for\s+|to\s+)?)?(.+?)(?:\s+for\s+|\s+at\s+|\$|\s+\d|\s+monthly|\s+weekly|\s+yearly|$)/i,
    /subscri(?:be|ption)\s+(?:to\s+|for\s+)?(.+?)(?:\s+for\s+|\s+at\s+|\$|\s+\d|\s+monthly|\s+weekly|\s+yearly|$)/i,
    /\b(netflix|spotify|hulu|disney\+?|youtube(?:\s+premium)?|apple music|adobe|canva|icloud)\b/i,
  ])
  if (!name || /^(a|an|the|subscription|monthly|weekly|yearly)$/i.test(name)) {
    name = 'New subscription'
  }
  name = titleCase(name.replace(/\bsubscription\b/gi, '').trim() || 'New subscription')

  const cycle = parseBillingCycle(prompt)
  const next = parseRelativeDate(prompt)

  return {
    kind: 'subscription',
    name,
    amount,
    billing_cycle: cycle,
    next_billing_date: next === todayISO() && !/\b(today|tomorrow|yesterday|next week|on the|due)\b/i.test(q)
      ? addDaysISO(todayISO(), cycle === 'weekly' ? 7 : cycle === 'yearly' ? 365 : 30)
      : next,
    active: true,
    icon: pickSubIcon(name),
    color: pickSubColor(name),
  }
}

function parseBillIntent(prompt: string): CoachAction | { needAmount: true; reply: string } | null {
  const q = prompt.toLowerCase()
  if (!looksLikeBill(q)) return null

  const amount = parseAmount(prompt)
  if (amount == null) {
    return {
      needAmount: true,
      reply:
        'I can schedule that bill — what amount and due date? Example: “Schedule a rent bill for $1200 due on the 1st”.',
    }
  }

  let name = extractAfter(prompt, [
    /(?:schedule|add|create|set\s*up)\s+(?:a\s+|an\s+|my\s+)?(?:bill\s+(?:for\s+)?)?(.+?)(?:\s+for\s+|\s+of\s+|\$|\s+\d|\s+due|\s+on\s+|$)/i,
    /(?:bill|payment)\s+(?:for\s+)?(.+?)(?:\s+for\s+|\s+of\s+|\$|\s+\d|\s+due|\s+on\s+|$)/i,
    /remind me (?:to pay|about)\s+(.+?)(?:\s+for\s+|\$|\s+\d|\s+due|$)/i,
  ])
  name = titleCase(name.replace(/\bbill\b/gi, '').trim() || 'Bill')
  const category = inferCategory(name, 'expense')
  const due = parseRelativeDate(prompt)

  return {
    kind: 'bill',
    name,
    amount,
    due_date: due,
    status: 'pending',
    category,
    icon: pickBillIcon(name, category),
  }
}

function parseIncomeIntent(prompt: string): CoachAction | { needAmount: true; reply: string } | null {
  const q = prompt.toLowerCase()
  if (!looksLikeIncome(q)) return null

  const amount = parseAmount(prompt)
  if (amount == null) {
    return {
      needAmount: true,
      reply:
        'I can log that income — how much and from where? Example: “I earned $500 from freelance today, log it”.',
    }
  }

  let description = extractAfter(prompt, [
    /(?:earned|received|got paid|deposit(?:ed)?)\s+(?:\$?[\d,]+(?:\.\d{1,2})?\s*(?:dollars?|usd|bucks)?\s+)?(?:from\s+|for\s+)?(.+?)(?:\s+today|\s+yesterday|\s+on\s+|,|\.|$)/i,
    /(?:income|paycheck|payroll)\s+(?:of\s+|from\s+|for\s+)?(.+?)(?:\s+today|\s+yesterday|,|\.|$)/i,
    /(?:from|for)\s+(.+?)(?:\s+today|\s+yesterday|,|\.|$)/i,
  ])
  if (!description || /^\$?[\d,.]+/.test(description)) {
    description = /paycheck|salary|payroll/.test(q) ? 'Salary' : 'Income'
  }
  description = titleCase(description)
  const category = inferCategory(`${description} ${prompt}`, 'income')
  const date = parseRelativeDate(prompt)

  return {
    kind: 'transaction',
    type: 'income',
    amount,
    category,
    description,
    date,
  }
}

function parseExpenseIntent(prompt: string): CoachAction | { needAmount: true; reply: string } | null {
  const q = prompt.toLowerCase()
  if (!looksLikeExpense(q)) return null

  const amount = parseAmount(prompt)
  if (amount == null) {
    return {
      needAmount: true,
      reply:
        'I can log that expense — how much and on what? Example: “I spent $150 on snacks today, log it please”.',
    }
  }

  let description = extractAfter(prompt, [
    /(?:spent|paid)\s+(?:\$?[\d,]+(?:\.\d{1,2})?\s*(?:dollars?|usd|bucks)?\s+)?(?:on|for)\s+(.+?)(?:\s+today|\s+yesterday|\s+on\s+\d|\s+please|\s+log|,|\.|$)/i,
    /(?:bought|purchased)\s+(.+?)(?:\s+for\s+|\s+at\s+|\$|\s+\d|\s+today|\s+yesterday|,|\.|$)/i,
    /(?:expense|purchase)\s+(?:of\s+|for\s+)?(.+?)(?:\s+today|\s+yesterday|,|\.|$)/i,
    /(?:on|for)\s+(.+?)(?:\s+today|\s+yesterday|\s+please|\s+log|,|\.|$)/i,
  ])
  if (!description || /^\$?[\d,.]+/.test(description)) {
    description = 'Expense'
  }
  description = titleCase(description)
  const category = inferCategory(`${description} ${prompt}`, 'expense')
  const date = parseRelativeDate(prompt)

  return {
    kind: 'transaction',
    type: 'expense',
    amount,
    category,
    description,
    date,
  }
}

function confirmAction(action: CoachAction): string {
  if (action.kind === 'transaction') {
    const verb = action.type === 'income' ? 'Logged income' : 'Logged expense'
    return `${verb}: ${formatCurrency(action.amount)} under ${action.category} (“${action.description}”) for ${formatShortDate(action.date)}. It’s on your Home totals now.`
  }
  if (action.kind === 'bill') {
    return `Scheduled bill “${action.name}” for ${formatCurrency(action.amount)} due ${formatShortDate(action.due_date)} (${action.category}). Check the Bills tab anytime.`
  }
  if (action.kind === 'subscription') {
    return `Added ${action.name} subscription for ${formatCurrency(action.amount)}/${action.billing_cycle}. Next billing: ${formatShortDate(action.next_billing_date)}.`
  }
  if (action.kind === 'budget') {
    return `Set your ${action.category} budget to ${formatCurrency(action.limit_amount)} for this month. You can tweak it anytime on Home → Budget tracker.`
  }
  const bits: string[] = []
  if (action.prefs.job_title) bits.push(`job → ${action.prefs.job_title}`)
  if (action.prefs.yearly_income != null) bits.push(`yearly income → ${formatCurrency(action.prefs.yearly_income)}`)
  if (action.prefs.monthly_income != null) bits.push(`monthly income → ${formatCurrency(action.prefs.monthly_income)}`)
  if (action.prefs.money_goal) bits.push(`money goal → ${action.prefs.money_goal}`)
  if (action.prefs.spend_focus) bits.push(`spend focus → ${action.prefs.spend_focus}`)
  if (action.prefs.notes) bits.push(`notes updated`)
  return `Got it — I updated your coach profile (${bits.join('; ')}). I’ll use this when personalizing tips.`
}

function parseProfilePrefsIntent(prompt: string): CoachAction | null {
  const q = prompt.toLowerCase()
  const prefs: Partial<CoachPrefs> = {}

  const wantsUpdate =
    /\b(update|change|switch(?:ed)?|now work|new job|my job|i work|i'm a|i am a|yearly income|monthly income|make \$?\d|money goal|overspend|coach profile|survey)\b/i.test(
      q,
    )

  const jobMatch = prompt.match(
    /(?:update|change|switch(?:ed)?(?:\s+jobs?)?\s+to|my job(?:\s+is|\s+to)?|i(?:'m| am)(?:\s+now)?(?:\s+a|\s+an)?|i work(?:\s+as)?(?:\s+a|\s+an)?|now work(?:\s+as)?(?:\s+a|\s+an)?)\s+([^,.]+?)(?:\s+and\s+|\s+making\s+|\s+making\s+\$|\s+for\s+\$|,|\.|$)/i,
  )
  if (jobMatch?.[1]) {
    const job = cleanPhrase(jobMatch[1].replace(/\b(job|role|position)\b/gi, ''))
    if (job && job.length < 60) prefs.job_title = titleCase(job)
  }

  const yearly =
    prompt.match(
      /(?:yearly(?:\s+income)?(?:\s+is)?|make|making|earn|earning|salary(?:\s+of)?)\s+\$?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:k\b)?\s*(?:a year|per year|\/year|yearly)/i,
    ) ||
    prompt.match(/\$?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:k\b)?\s*(?:a year|per year|\/year|yearly)/i)
  if (yearly) {
    let n = Number(yearly[1].replace(/,/g, ''))
    if (/k\b/i.test(yearly[0]) && n < 1000) n *= 1000
    if (n > 0) {
      prefs.yearly_income = Math.round(n * 100) / 100
      if (prefs.monthly_income == null) prefs.monthly_income = Math.round((n / 12) * 100) / 100
    }
  }

  const monthly = prompt.match(
    /(?:monthly(?:\s+income)?(?:\s+is)?|a month|per month|\/month|monthly)\s+\$?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ) || prompt.match(/\$?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:a month|per month|\/mo|\/month|monthly)/i)
  if (monthly) {
    const n = Number(monthly[1].replace(/,/g, ''))
    if (n > 0) prefs.monthly_income = Math.round(n * 100) / 100
  }

  const goalMatch = prompt.match(
    /(?:money goal|main goal|saving goal|update my goal|goal is(?:\s+to)?|goal to)\s+(.+?)(?:\.|$)/i,
  )
  if (goalMatch?.[1]) prefs.money_goal = cleanPhrase(goalMatch[1])

  for (const cat of EXPENSE_CATEGORIES) {
    if (new RegExp(`overspend(?:ing)?(?:\\s+on)?\\s+${cat}`, 'i').test(prompt) || new RegExp(`spend focus(?:\\s+is)?\\s+${cat}`, 'i').test(prompt)) {
      prefs.spend_focus = cat
      break
    }
  }

  if (Object.keys(prefs).length === 0) return null
  if (!wantsUpdate && !prefs.job_title && prefs.yearly_income == null && prefs.monthly_income == null) {
    return null
  }
  // Require an update cue unless it's clearly a job/income profile statement.
  if (
    !wantsUpdate &&
    !(prefs.job_title && (prefs.yearly_income != null || prefs.monthly_income != null))
  ) {
    return null
  }

  return { kind: 'profile_prefs', prefs }
}

function parseCoachIntent(
  prompt: string,
): CoachAction | { needAmount: true; reply: string } | null {
  return (
    parseBudgetIntent(prompt) ||
    parseSubscriptionIntent(prompt) ||
    parseBillIntent(prompt) ||
    parseIncomeIntent(prompt) ||
    parseExpenseIntent(prompt) ||
    parseProfilePrefsIntent(prompt)
  )
}

function prefsBlurb(prefs: CoachPrefs): string {
  const parts: string[] = []
  if (prefs.job_title) parts.push(`you work as ${prefs.job_title}`)
  if (prefs.monthly_income != null) parts.push(`about ${formatCurrency(prefs.monthly_income)}/mo income`)
  else if (prefs.yearly_income != null) parts.push(`about ${formatCurrency(prefs.yearly_income)}/yr income`)
  if (prefs.money_goal) parts.push(`goal: ${prefs.money_goal}`)
  if (prefs.spend_focus) parts.push(`${prefs.spend_focus} is a watch area`)
  return parts.length ? ` With your profile (${parts.join('; ')}), ` : ' '
}

type CoachContext = {
  name: string
  transactions: Transaction[]
  budgets: Budget[]
  bills: Bill[]
  subscriptions: Subscription[]
  goals: Goal[]
  coachPrefs?: CoachPrefs
  recentMessages?: { role: 'user' | 'assistant'; content: string }[]
}

function buildSnapshot(ctx: CoachContext): string {
  const prefs = ctx.coachPrefs
  const income = ctx.transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses = ctx.transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const overdue = ctx.bills.filter((b) => b.status === 'overdue')
  const pending = ctx.bills.filter((b) => b.status === 'pending')
  const activeSubs = ctx.subscriptions.filter((s) => s.active)
  const subTotal = activeSubs.reduce((s, sub) => s + sub.amount, 0)
  const budgetLines =
    ctx.budgets.length === 0
      ? 'none set this month'
      : ctx.budgets
          .map(
            (b) =>
              `${b.category}: ${formatCurrency(b.spent_amount)} / ${formatCurrency(b.limit_amount)}`,
          )
          .join('; ')
  const goalLines =
    ctx.goals.length === 0
      ? 'none'
      : ctx.goals
          .slice(0, 4)
          .map((g) => `${g.title}: ${formatCurrency(g.current_amount)} / ${formatCurrency(g.target_amount)}`)
          .join('; ')

  return [
    `User: ${ctx.name}`,
    `Tracked income: ${formatCurrency(income)}; spending: ${formatCurrency(expenses)}`,
    `Budgets: ${budgetLines}`,
    `Bills: ${overdue.length} overdue, ${pending.length} pending`,
    `Active subscriptions: ${activeSubs.length} (~${formatCurrency(subTotal)}/mo)`,
    `Goals: ${goalLines}`,
    prefs ? `Coach profile:${prefsBlurb(prefs).replace(/^ With your profile/, '')}` : 'Coach profile: not set',
  ].join('\n')
}

function extractPuterText(response: unknown): string {
  if (typeof response === 'string') return response.trim()
  if (!response || typeof response !== 'object') return ''

  const asRecord = response as Record<string, unknown>
  const message = asRecord.message
  if (typeof message === 'string') return message.trim()
  if (message && typeof message === 'object') {
    const content = (message as { content?: unknown }).content
    if (typeof content === 'string') return content.trim()
    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (typeof part === 'string') return part
          if (part && typeof part === 'object' && 'text' in part) {
            return String((part as { text: unknown }).text ?? '')
          }
          return ''
        })
        .join('')
        .trim()
    }
  }

  if (typeof asRecord.text === 'string') return asRecord.text.trim()
  return ''
}

async function askPuterCoach(prompt: string, ctx: CoachContext): Promise<string | null> {
  if (!puter.auth.isSignedIn()) {
    return null
  }

  const system = [
    'You are FinGo Coach, a friendly personal finance buddy inside the FinGo habit tracker.',
    'Use only the account snapshot below — do not invent balances, bills, or goals.',
    'Keep replies short (2–4 sentences), warm, and practical.',
    'Users can also ask you to log money with phrases like “I spent $40 on gas today”, “Set Food budget to $400”, “Schedule a rent bill for $1200 due on the 1st”, or “Add Netflix subscription for $15.99 monthly”.',
    'If they want an action you cannot confirm from this chat turn, tell them the exact phrase to try.',
    '',
    'Account snapshot:',
    buildSnapshot(ctx),
  ].join('\n')

  const history = (ctx.recentMessages ?? []).slice(-8).map((m) => ({
    role: m.role,
    content: m.content,
    images: [] as [],
  }))

  const response = await puter.ai.chat(
    [
      { role: 'system', content: system, images: [] },
      ...history,
      { role: 'user', content: prompt, images: [] },
    ],
    { model: PUTER_COACH_MODEL },
  )
  const text = extractPuterText(response)
  return text || null
}

function localCoachReply(prompt: string, ctx: CoachContext): CoachResult {
  const prefs = ctx.coachPrefs
  const q = prompt.toLowerCase()
  const income = ctx.transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses = ctx.transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const overdue = ctx.bills.filter((b) => b.status === 'overdue')
  const pending = ctx.bills.filter((b) => b.status === 'pending')
  const activeSubs = ctx.subscriptions.filter((s) => s.active)
  const subTotal = activeSubs.reduce((s, sub) => s + sub.amount, 0)
  const topBudget = [...ctx.budgets].sort(
    (a, b) => b.spent_amount / b.limit_amount - a.spent_amount / a.limit_amount,
  )[0]
  const topGoal = [...ctx.goals].sort(
    (a, b) => b.current_amount / b.target_amount - a.current_amount / a.target_amount,
  )[0]

  let reply: string
  if (/\b(my (job|income|profile|survey)|what do you know about me)\b/i.test(q) && prefs) {
    if (!prefs.job_title && prefs.yearly_income == null && !prefs.money_goal) {
      reply = `I don’t have coach-profile details yet. Tell me something like “I work as a nurse and make $70,000 a year” or “Update my money goal to build an emergency fund”.`
    } else {
      reply = `Here’s what I’m using for personalized tips:${prefsBlurb(prefs).replace(/^ With your profile/, '')} You can change any of this anytime in chat.`
    }
  } else if (q.includes('bill') || q.includes('remind')) {
    if (overdue.length) {
      reply = `Heads up — you have ${overdue.length} overdue bill${overdue.length > 1 ? 's' : ''}: ${overdue.map((b) => `${b.name} (${formatCurrency(b.amount)})`).join(', ')}. Paying those first protects your credit and frees up mental space.`
    } else if (pending.length) {
      const next = [...pending].sort((a, b) => a.due_date.localeCompare(b.due_date))[0]
      reply = `You have ${pending.length} upcoming bill${pending.length > 1 ? 's' : ''}. Next up: ${next.name} for ${formatCurrency(next.amount)}. You can also say “Schedule a wifi bill for $60 due on the 15th”.`
    } else {
      reply = `Nice — no overdue bills right now. Want me to schedule one? Try “Schedule a rent bill for $1200 due on the 1st”.`
    }
  } else if (q.includes('budget') || (q.includes('spend') && !looksLikeExpense(q))) {
    if (topBudget) {
      const pct = Math.round((topBudget.spent_amount / topBudget.limit_amount) * 100)
      const focus =
        prefs?.spend_focus && prefs.spend_focus === topBudget.category
          ? ` That matches the ${prefs.spend_focus} focus you shared — keep a soft cap there.`
          : prefs?.spend_focus
            ? ` Also keep an eye on ${prefs.spend_focus}, since you flagged it.`
            : ''
      reply = `${topBudget.category} is at ${pct}% of its budget (${formatCurrency(topBudget.spent_amount)} of ${formatCurrency(topBudget.limit_amount)}).${focus} Say “Set Food budget to $400” anytime, or edit limits on Home.`
    } else {
      const takeHome = prefs?.monthly_income ?? null
      const tip = takeHome
        ? ` With ~${formatCurrency(takeHome)} monthly income on file, try keeping discretionary spend under ${formatCurrency(Math.round(takeHome * 0.3))}.`
        : ' Aim to keep discretionary categories under 30% of take-home.'
      reply = `No category budgets yet this month. Your spending is ${formatCurrency(expenses)} against ${formatCurrency(income)} income.${tip} Try “Set Food budget to $400”, or tap Add budget on Home.`
    }
  } else if (q.includes('save') || q.includes('goal')) {
    if (topGoal) {
      const left = topGoal.target_amount - topGoal.current_amount
      reply = `"${topGoal.title}" is looking good at ${formatCurrency(topGoal.current_amount)} of ${formatCurrency(topGoal.target_amount)}. If you tuck away ${formatCurrency(Math.ceil(left / 8))} a week, you'll close the gap smoothly.`
    } else if (prefs?.money_goal) {
      reply = `Your coach goal is “${prefs.money_goal}”. Create a matching savings goal on the Goals tab so we can track progress together.`
    } else {
      reply = `Create a savings goal on the Goals tab — even a small emergency fund target builds momentum.`
    }
  } else if (q.includes('sub') || q.includes('netflix') || q.includes('spotify')) {
    reply = `Active subscriptions total about ${formatCurrency(subTotal)}/month across ${activeSubs.length} services. You can add one here: “Add Netflix subscription for $15.99 monthly”.`
  } else if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
    const personal = prefs?.job_title ? ` As a ${prefs.job_title},` : ''
    reply = `Hey ${ctx.name.split(' ')[0]}!${personal} I can log spending or income, set budgets, schedule bills, add subscriptions, and update your coach profile. Try “Set Food budget to $400” or “I spent $40 on gas today”.`
  } else {
    const personal = prefs ? prefsBlurb(prefs) : ' '
    reply = `Here's your snapshot, ${ctx.name.split(' ')[0]}: income ${formatCurrency(income)}, spending ${formatCurrency(expenses)}, ${pending.length} pending bills, and ${ctx.goals.length} savings goals.${personal}Ask me to log money, set a budget, schedule a bill, or update your job/income anytime.`
  }

  return { reply, actions: [], provider: 'local', model: null }
}

export async function generateCoachReply(prompt: string, ctx: CoachContext): Promise<CoachResult> {
  const intent = parseCoachIntent(prompt)
  if (intent) {
    if ('needAmount' in intent) {
      return { reply: intent.reply, actions: [], provider: 'action', model: null }
    }
    return { reply: confirmAction(intent), actions: [intent], provider: 'action', model: null }
  }

  if (!puter.auth.isSignedIn()) {
    const local = localCoachReply(prompt, ctx)
    return {
      ...local,
      reply: `${local.reply}\n\n(Local tip — sign in to Puter above to use ${PUTER_COACH_MODEL}.)`,
    }
  }

  try {
    const puterReply = await askPuterCoach(prompt, ctx)
    if (puterReply) {
      return { reply: puterReply, actions: [], provider: 'puter', model: PUTER_COACH_MODEL }
    }
  } catch (err) {
    console.warn('Puter AI coach unavailable, using local tips:', err)
  }

  const local = localCoachReply(prompt, ctx)
  return {
    ...local,
    reply: `${local.reply}\n\n(Local tip — Puter ${PUTER_COACH_MODEL} didn’t respond. Try signing in again.)`,
  }
}
