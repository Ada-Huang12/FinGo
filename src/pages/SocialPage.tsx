import { useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { formatCurrency, formatDate, percent } from '../lib/format'
import { AvatarShopSection } from '../components/social/AvatarShop'
import { ThemePicker } from '../components/social/ThemePicker'
import { TransactionStreakCard } from '../components/social/TransactionStreakCard'
import { AvatarFigure } from '../components/avatar/AvatarFigure'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'
import { Modal } from '../components/ui/Modal'
import { ProgressBar } from '../components/ui/ProgressBar'
import { EMPTY_EQUIPPED } from '../lib/avatarCatalog'

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'object' && err && 'message' in err) {
    const message = (err as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return fallback
}

export function SocialPage() {
  const { user } = useAuth()
  const {
    friends,
    friendships,
    goals,
    contributions,
    challenges,
    acceptFriendship,
    declineFriendship,
    sendFriendRequest,
    loading,
  } = useData()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const pendingIncoming = friendships.filter(
    (f) => f.status === 'pending' && f.addressee_id === user?.id,
  )
  const sharedGoals = goals.filter((g) => g.is_collaborative)
  const socialContribs = contributions.filter((c) => {
    const goal = goals.find((g) => g.id === c.goal_id)
    return goal?.is_collaborative
  })

  async function onInvite(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      await sendFriendRequest(email.trim())
      setMessage('Friend request sent!')
      setEmail('')
      setOpen(false)
    } catch (err) {
      setError(errorMessage(err, 'Could not send request.'))
    }
  }

  if (loading) return <p className="text-fingo-muted">Loading social…</p>

  return (
    <div className="page-enter space-y-5">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-fingo-blue">Social</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Grow together</h1>
          <p className="mt-1 text-fingo-muted">
            Avatar shop, logging streaks, theme colors, friends, and challenges.
          </p>
        </div>
        <Button variant="blue" onClick={() => setOpen(true)}>
          <Icon name="person_add" />
          Add friend
        </Button>
      </section>

      <AvatarShopSection />

      <TransactionStreakCard />

      <ThemePicker />

      {message && (
        <Card className="bg-fingo-green-soft p-3 text-sm font-semibold text-fingo-green-dark">{message}</Card>
      )}

      {pendingIncoming.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-bold">Friend requests</h2>
          <div className="space-y-3">
            {pendingIncoming.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                <div className="overflow-hidden rounded-2xl">
                  <AvatarFigure
                    name={f.friend?.full_name ?? '?'}
                    skin={f.friend?.avatar_skin ?? 'peach'}
                    equipped={f.friend?.avatar_equipped ?? EMPTY_EQUIPPED}
                    size={44}
                  />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{f.friend?.full_name ?? 'Someone'}</p>
                  <p className="text-xs text-fingo-muted">{f.friend?.email}</p>
                </div>
                <Button className="!px-3 !py-1.5 text-sm" onClick={() => void acceptFriendship(f.id)}>
                  Accept
                </Button>
                <Button variant="ghost" onClick={() => void declineFriendship(f.id)}>
                  Decline
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold">Friends</h2>
          <p className="mb-4 text-sm text-fingo-muted">{friends.length} connected</p>
          <div className="space-y-3">
            {friends.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                <div className="overflow-hidden rounded-2xl shadow-sm">
                  <AvatarFigure
                    name={f.full_name}
                    skin={f.avatar_skin}
                    equipped={f.avatar_equipped}
                    size={48}
                  />
                </div>
                <div>
                  <p className="font-display font-bold">{f.full_name}</p>
                  <p className="text-xs text-fingo-muted">{f.email}</p>
                </div>
              </div>
            ))}
            {friends.length === 0 && (
              <p className="text-sm text-fingo-muted">No friends yet — invite someone!</p>
            )}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold">Shared savings goals</h2>
          <p className="mb-4 text-sm text-fingo-muted">Goals you&apos;re building with others</p>
          <div className="space-y-3">
            {sharedGoals.map((g) => {
              const pct = percent(Number(g.current_amount), Number(g.target_amount))
              return (
                <div key={g.id} className="rounded-2xl bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-display font-bold">{g.title}</p>
                    <span className="text-xs font-semibold text-fingo-muted">{pct}%</span>
                  </div>
                  <ProgressBar value={pct} tone="blue" />
                  <p className="mt-2 text-xs text-fingo-muted">
                    {formatCurrency(Number(g.current_amount))} / {formatCurrency(Number(g.target_amount))}
                  </p>
                </div>
              )
            })}
            {sharedGoals.length === 0 && (
              <p className="text-sm text-fingo-muted">Invite a friend to a goal to see it here.</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold">Contributions</h2>
        <p className="mb-4 text-sm text-fingo-muted">Activity on shared goals</p>
        <div className="space-y-3">
          {socialContribs.slice(0, 6).map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
              <div>
                <p className="text-sm font-semibold">
                  {c.user_id === user?.id ? 'You' : c.profile?.full_name ?? 'Friend'} contributed{' '}
                  {formatCurrency(Number(c.amount))}
                </p>
                <p className="text-xs text-fingo-muted">
                  {c.note || 'Nice save'} · {formatDate(c.created_at.slice(0, 10))}
                </p>
              </div>
            </div>
          ))}
          {socialContribs.length === 0 && (
            <p className="text-sm text-fingo-muted">Shared contributions will show up here.</p>
          )}
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold">Challenges / activity</h2>
        <p className="mb-4 text-sm text-fingo-muted">Friendly money quests with your circle</p>
        <div className="grid gap-3 md:grid-cols-2">
          {challenges.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm"
            >
              <div className="mb-2 flex items-center gap-2">
                <Icon name="emoji_events" className="text-amber-500" />
                <h3 className="font-display font-bold">{c.title}</h3>
              </div>
              <p className="text-sm text-fingo-muted">{c.description}</p>
              {c.goal_amount != null && (
                <div className="mt-3">
                  <ProgressBar value={percent(c.progress ?? 0, Number(c.goal_amount))} tone="warning" />
                  <p className="mt-1 text-xs text-fingo-muted">
                    {formatCurrency(c.progress ?? 0)} / {formatCurrency(Number(c.goal_amount))}
                    {c.ends_at ? ` · ends ${formatDate(c.ends_at)}` : ''}
                  </p>
                </div>
              )}
            </div>
          ))}
          {challenges.length === 0 && <p className="text-sm text-fingo-muted">No challenges yet.</p>}
        </div>
      </Card>

      <Modal open={open} title="Add a friend" onClose={() => setOpen(false)}>
        <form onSubmit={onInvite} className="space-y-3">
          <p className="text-sm text-fingo-muted">
            Enter the exact email they used to sign up for FinGo.
          </p>
          <input
            className="input-field"
            type="email"
            required
            placeholder="friend@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button className="w-full" variant="blue" type="submit">
            Send request
          </Button>
        </form>
      </Modal>
    </div>
  )
}
