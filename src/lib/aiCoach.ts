import type { Bill, Budget, Goal, Subscription, Transaction } from './types'
import { formatCurrency } from './format'

export function generateCoachReply(
  prompt: string,
  ctx: {
    name: string
    transactions: Transaction[]
    budgets: Budget[]
    bills: Bill[]
    subscriptions: Subscription[]
    goals: Goal[]
  },
): string {
  const q = prompt.toLowerCase()
  const income = ctx.transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses = ctx.transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const overdue = ctx.bills.filter((b) => b.status === 'overdue')
  const pending = ctx.bills.filter((b) => b.status === 'pending')
  const activeSubs = ctx.subscriptions.filter((s) => s.active)
  const subTotal = activeSubs.reduce((s, sub) => s + sub.amount, 0)
  const topBudget = [...ctx.budgets].sort((a, b) => b.spent_amount / b.limit_amount - a.spent_amount / a.limit_amount)[0]
  const topGoal = [...ctx.goals].sort((a, b) => b.current_amount / b.target_amount - a.current_amount / a.target_amount)[0]

  if (q.includes('bill') || q.includes('remind')) {
    if (overdue.length) {
      return `Heads up — you have ${overdue.length} overdue bill${overdue.length > 1 ? 's' : ''}: ${overdue.map((b) => `${b.name} (${formatCurrency(b.amount)})`).join(', ')}. Paying those first protects your credit and frees up mental space.`
    }
    if (pending.length) {
      return `You have ${pending.length} upcoming bill${pending.length > 1 ? 's' : ''}. Next up: ${pending.sort((a, b) => a.due_date.localeCompare(b.due_date))[0].name} for ${formatCurrency(pending[0].amount)}. Want me to suggest a payment order?`
    }
    return `Nice — no overdue bills right now. Keep checking the Bills tab so nothing sneaks up on you.`
  }

  if (q.includes('budget') || q.includes('spend')) {
    if (topBudget) {
      const pct = Math.round((topBudget.spent_amount / topBudget.limit_amount) * 100)
      return `${topBudget.category} is at ${pct}% of its budget (${formatCurrency(topBudget.spent_amount)} of ${formatCurrency(topBudget.limit_amount)}). Try a soft cap for the rest of the month and move leftover room into savings.`
    }
    return `Your tracked spending this period is ${formatCurrency(expenses)} against ${formatCurrency(income)} income. Aim to keep discretionary categories under 30% of take-home.`
  }

  if (q.includes('save') || q.includes('goal')) {
    if (topGoal) {
      const left = topGoal.target_amount - topGoal.current_amount
      return `"${topGoal.title}" is looking good at ${formatCurrency(topGoal.current_amount)} of ${formatCurrency(topGoal.target_amount)}. If you tuck away ${formatCurrency(Math.ceil(left / 8))} a week, you'll close the gap smoothly.`
    }
    return `Create a savings goal on the Goals tab — even a small emergency fund target builds momentum.`
  }

  if (q.includes('sub') || q.includes('netflix') || q.includes('spotify')) {
    return `Active subscriptions total about ${formatCurrency(subTotal)}/month across ${activeSubs.length} services. Toggle off anything you haven't used in 30 days — that alone can fund a goal contribution.`
  }

  if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
    return `Hey ${ctx.name.split(' ')[0]}! Ready to make money feel lighter today? Ask me about bills, budgets, goals, or subscriptions.`
  }

  return `Here's your snapshot, ${ctx.name.split(' ')[0]}: income ${formatCurrency(income)}, spending ${formatCurrency(expenses)}, ${pending.length} pending bills, and ${ctx.goals.length} savings goals. Ask about budgets, bill reminders, subscriptions, or a specific goal for a sharper tip.`
}
