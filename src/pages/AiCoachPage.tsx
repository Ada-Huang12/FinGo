import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useData } from '../contexts/DataContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'

const quickPrompts = [
  'I spent $40 on snacks today, log it',
  'I earned $500 from freelance today',
  'How is my budget looking?',
  'Help me save more',
]

export function AiCoachPage() {
  const { aiMessages, sendAiMessage, loading, bills, budgets, goals } = useData()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiMessages])

  async function onSend(content: string) {
    if (!content.trim() || sending) return
    setSending(true)
    setInput('')
    try {
      await sendAiMessage(content.trim())
    } finally {
      setSending(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await onSend(input)
  }

  const overdue = bills.filter((b) => b.status === 'overdue').length
  const tightBudget = budgets.filter((b) => Number(b.spent_amount) / Number(b.limit_amount) >= 0.8).length

  if (loading) return <p className="text-fingo-muted">Loading coach…</p>

  return (
    <div className="page-enter mx-auto flex max-w-3xl flex-col gap-5">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-fingo-green">AI Coach</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Your friendly money buddy</h1>
        <p className="mt-1 text-fingo-muted">
          Ask for tips — or tell me to log spending, income, bills, and subscriptions.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <Icon name="notifications" className="text-red-500" />
          <p className="mt-2 font-display font-bold">{overdue} overdue</p>
          <p className="text-xs text-fingo-muted">Bill reminders ready</p>
        </Card>
        <Card className="p-4">
          <Icon name="pie_chart" className="text-amber-500" />
          <p className="mt-2 font-display font-bold">{tightBudget} budgets warm</p>
          <p className="text-xs text-fingo-muted">Near or over limit</p>
        </Card>
        <Card className="p-4">
          <Icon name="flag" className="text-fingo-green" />
          <p className="mt-2 font-display font-bold">{goals.length} goals</p>
          <p className="text-xs text-fingo-muted">Savings in motion</p>
        </Card>
      </div>

      <Card className="flex min-h-[420px] flex-col overflow-hidden p-0">
        <div className="border-b border-slate-100 bg-gradient-to-r from-fingo-green-soft to-fingo-blue-soft px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="animate-floaty grid h-12 w-12 place-items-center rounded-2xl bg-white text-fingo-green shadow-md">
              <Icon name="smart_toy" filled />
            </div>
            <div>
              <p className="font-display font-bold">FinGo Coach</p>
              <p className="text-xs text-fingo-muted">Online · can log money for you</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 px-4 py-4 sm:px-5">
          {aiMessages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  m.role === 'user'
                    ? 'rounded-br-md bg-fingo-green text-white'
                    : 'rounded-bl-md bg-white text-fingo-ink'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="space-y-3 border-t border-slate-100 bg-white p-4">
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-0.5">
            {quickPrompts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => void onSend(p)}
                className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                {p}
              </button>
            ))}
          </div>
          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              className="input-field"
              placeholder='Try “I spent $40 on gas today”…'
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button className="!px-4" disabled={sending || !input.trim()} type="submit">
              <Icon name="send" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
