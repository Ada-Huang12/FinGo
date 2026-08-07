import { useEffect, useRef, useState, type FormEvent } from 'react'
import { puter } from '@heyputer/puter.js'
import { useData } from '../contexts/DataContext'
import { PUTER_COACH_MODEL } from '../lib/aiCoach'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'
import { AiCoachProfileCard } from '../components/ai/AiCoachProfileCard'

const quickPrompts = [
  'I spent $40 on snacks today, log it',
  'Set Food budget to $400',
  'How is my budget looking?',
  'Help me save more',
]

function providerLabel(provider?: string | null, model?: string | null) {
  if (provider === 'puter') return `via ${model ?? PUTER_COACH_MODEL}`
  if (provider === 'action') return 'local action'
  if (provider === 'local') return 'local tip (not LLM)'
  return null
}

export function AiCoachPage() {
  const { aiMessages, sendAiMessage, clearAiChat, loading, bills, budgets, goals } = useData()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [puterSignedIn, setPuterSignedIn] = useState(() => puter.auth.isSignedIn())
  const [puterBusy, setPuterBusy] = useState(false)
  const [puterError, setPuterError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiMessages, sending])

  useEffect(() => {
    setPuterSignedIn(puter.auth.isSignedIn())
  }, [])

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

  async function onClearChat() {
    if (clearing || aiMessages.length === 0) return
    setClearing(true)
    try {
      await clearAiChat()
    } finally {
      setClearing(false)
    }
  }

  async function onPuterSignIn() {
    setPuterBusy(true)
    setPuterError('')
    try {
      await puter.auth.signIn()
      setPuterSignedIn(puter.auth.isSignedIn())
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'msg' in err
          ? String((err as { msg: unknown }).msg)
          : err instanceof Error
            ? err.message
            : 'Could not sign in to Puter.'
      setPuterError(msg)
      setPuterSignedIn(puter.auth.isSignedIn())
    } finally {
      setPuterBusy(false)
    }
  }

  function onPuterSignOut() {
    puter.auth.signOut()
    setPuterSignedIn(false)
    setPuterError('')
  }

  const overdue = bills.filter((b) => !b.archived && b.status === 'overdue').length
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="animate-floaty grid h-12 w-12 place-items-center rounded-2xl bg-white text-fingo-green shadow-md">
                <Icon name="smart_toy" filled />
              </div>
              <div>
                <p className="font-display font-bold">FinGo Coach</p>
                <p className="text-xs text-fingo-muted">
                  {puterSignedIn
                    ? `Puter connected · model ${PUTER_COACH_MODEL}`
                    : 'Local tips until you sign in to Puter'}
                </p>
              </div>
            </div>
            {puterSignedIn ? (
              <Button type="button" variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={onPuterSignOut}>
                Sign out of Puter
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="!px-3 !py-1.5 text-xs"
                disabled={puterBusy}
                onClick={() => void onPuterSignIn()}
              >
                {puterBusy ? 'Opening Puter…' : 'Sign in to Puter'}
              </Button>
            )}
          </div>
          {puterError && <p className="mt-2 text-xs text-rose-600">{puterError}</p>}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 px-4 py-4 sm:px-5">
          {aiMessages.map((m) => {
            const label = m.role === 'assistant' ? providerLabel(m.provider, m.model) : null
            return (
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
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  {label && (
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-fingo-muted">
                      {label}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
          {sending && (
            <div className="flex justify-start" aria-live="polite" aria-label="Coach is typing">
              <div className="flex items-center gap-2 rounded-3xl rounded-bl-md bg-white px-3 py-2.5 text-fingo-muted shadow-sm">
                <Icon name="progress_activity" className="animate-spin text-[1.25rem] text-fingo-green" />
                <span className="text-xs font-semibold">Thinking…</span>
              </div>
            </div>
          )}
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

      <AiCoachProfileCard />

      <div className="flex flex-col items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          className="text-sm text-fingo-muted"
          disabled={clearing || aiMessages.length === 0}
          onClick={() => void onClearChat()}
        >
          <Icon name="delete" className="text-base" />
          {clearing ? 'Clearing…' : 'Clear chat'}
        </Button>
        <a
          href="https://developer.puter.com"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-fingo-muted underline-offset-2 hover:underline"
        >
          Powered by Puter
        </a>
      </div>
    </div>
  )
}
