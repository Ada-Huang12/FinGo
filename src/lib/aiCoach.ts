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

export interface CoachResult {
  reply: string
  actions: CoachAction[]
}

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

export function generateCoachReply(
  prompt: string,
  ctx: {
    name: string
    transactions: Transaction[]
    budgets: Budget[]
    bills: Bill[]
    subscriptions: Subscription[]
    goals: Goal[]
    coachPrefs?: CoachPrefs
  },
): CoachResult {
  const intent = parseCoachIntent(prompt)
  if (intent) {
    if ('needAmount' in intent) return { reply: intent.reply, actions: [] }
    return { reply: confirmAction(intent), actions: [intent] }
  }

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

  if (/\b(my (job|income|profile|survey)|what do you know about me)\b/i.test(q) && prefs) {
    if (!prefs.job_title && prefs.yearly_income == null && !prefs.money_goal) {
      return {
        reply: `I don’t have coach-profile details yet. Tell me something like “I work as a nurse and make $70,000 a year” or “Update my money goal to build an emergency fund”.`,
        actions: [],
      }
    }
    return {
      reply: `Here’s what I’m using for personalized tips:${prefsBlurb(prefs).replace(/^ With your profile/, '')} You can change any of this anytime in chat.`,
      actions: [],
    }
  }

  if (q.includes('bill') || q.includes('remind')) {
    if (overdue.length) {
      return {
        reply: `Heads up — you have ${overdue.length} overdue bill${overdue.length > 1 ? 's' : ''}: ${overdue.map((b) => `${b.name} (${formatCurrency(b.amount)})`).join(', ')}. Paying those first protects your credit and frees up mental space.`,
        actions: [],
      }
    }
    if (pending.length) {
      const next = [...pending].sort((a, b) => a.due_date.localeCompare(b.due_date))[0]
      return {
        reply: `You have ${pending.length} upcoming bill${pending.length > 1 ? 's' : ''}. Next up: ${next.name} for ${formatCurrency(next.amount)}. You can also say “Schedule a wifi bill for $60 due on the 15th”.`,
        actions: [],
      }
    }
    return {
      reply: `Nice — no overdue bills right now. Want me to schedule one? Try “Schedule a rent bill for $1200 due on the 1st”.`,
      actions: [],
    }
  }

  if (q.includes('budget') || (q.includes('spend') && !looksLikeExpense(q))) {
    if (topBudget) {
      const pct = Math.round((topBudget.spent_amount / topBudget.limit_amount) * 100)
      const focus =
        prefs?.spend_focus && prefs.spend_focus === topBudget.category
          ? ` That matches the ${prefs.spend_focus} focus you shared — keep a soft cap there.`
          : prefs?.spend_focus
            ? ` Also keep an eye on ${prefs.spend_focus}, since you flagged it.`
            : ''
      return {
        reply: `${topBudget.category} is at ${pct}% of its budget (${formatCurrency(topBudget.spent_amount)} of ${formatCurrency(topBudget.limit_amount)}).${focus}`,
        actions: [],
      }
    }
    const takeHome = prefs?.monthly_income ?? null
    const tip = takeHome
      ? ` With ~${formatCurrency(takeHome)} monthly income on file, try keeping discretionary spend under ${formatCurrency(Math.round(takeHome * 0.3))}.`
      : ' Aim to keep discretionary categories under 30% of take-home.'
    return {
      reply: `Your tracked spending this period is ${formatCurrency(expenses)} against ${formatCurrency(income)} income.${tip}`,
      actions: [],
    }
  }

  if (q.includes('save') || q.includes('goal')) {
    if (topGoal) {
      const left = topGoal.target_amount - topGoal.current_amount
      return {
        reply: `"${topGoal.title}" is looking good at ${formatCurrency(topGoal.current_amount)} of ${formatCurrency(topGoal.target_amount)}. If you tuck away ${formatCurrency(Math.ceil(left / 8))} a week, you'll close the gap smoothly.`,
        actions: [],
      }
    }
    if (prefs?.money_goal) {
      return {
        reply: `Your coach goal is “${prefs.money_goal}”. Create a matching savings goal on the Goals tab so we can track progress together.`,
        actions: [],
      }
    }
    return {
      reply: `Create a savings goal on the Goals tab — even a small emergency fund target builds momentum.`,
      actions: [],
    }
  }

  if (q.includes('sub') || q.includes('netflix') || q.includes('spotify')) {
    return {
      reply: `Active subscriptions total about ${formatCurrency(subTotal)}/month across ${activeSubs.length} services. You can add one here: “Add Netflix subscription for $15.99 monthly”.`,
      actions: [],
    }
  }

  if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
    const personal = prefs?.job_title ? ` As a ${prefs.job_title},` : ''
    return {
      reply: `Hey ${ctx.name.split(' ')[0]}!${personal} I can log spending or income, schedule bills, add subscriptions, and update your coach profile. Try “I spent $40 on gas today” or “I switched jobs to teaching and make $55,000 a year”.`,
      actions: [],
    }
  }

  const personal = prefs ? prefsBlurb(prefs) : ' '
  return {
    reply: `Here's your snapshot, ${ctx.name.split(' ')[0]}: income ${formatCurrency(income)}, spending ${formatCurrency(expenses)}, ${pending.length} pending bills, and ${ctx.goals.length} savings goals.${personal}Ask me to log money, schedule a bill, or update your job/income anytime.`,
    actions: [],
  }
}
