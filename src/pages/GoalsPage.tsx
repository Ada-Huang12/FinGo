import { useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { goalCompletionPoints } from '../lib/avatarCatalog'
import { formatCurrency, formatDate, percent } from '../lib/format'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'
import { Modal } from '../components/ui/Modal'
import { ProgressBar } from '../components/ui/ProgressBar'

export function GoalsPage() {
  const { user } = useAuth()
  const {
    goals,
    contributions,
    friends,
    createGoal,
    contributeToGoal,
    inviteFriendToGoal,
    lastPointsEarned,
    clearPointsToast,
    loading,
  } = useData()
  const [createOpen, setCreateOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState<string | null>(null)
  const [contributeOpen, setContributeOpen] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [collaborative, setCollaborative] = useState(false)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [friendId, setFriendId] = useState('')

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    await createGoal({
      title,
      target_amount: Number(target),
      deadline: deadline || null,
      is_collaborative: collaborative,
      icon: collaborative ? 'diversity_3' : 'savings',
      color: collaborative ? '#3B82F6' : '#22C55E',
    })
    setCreateOpen(false)
    setTitle('')
    setTarget('')
    setDeadline('')
    setCollaborative(false)
  }

  async function onContribute(e: FormEvent) {
    e.preventDefault()
    if (!contributeOpen) return
    await contributeToGoal(contributeOpen, Number(amount), note)
    setContributeOpen(null)
    setAmount('')
    setNote('')
  }

  async function onInvite(e: FormEvent) {
    e.preventDefault()
    if (!inviteOpen || !friendId) return
    await inviteFriendToGoal(inviteOpen, friendId)
    setInviteOpen(null)
    setFriendId('')
  }

  if (loading) return <p className="text-fingo-muted">Loading goals…</p>

  return (
    <div className="page-enter space-y-5">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-fingo-green">Goals</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Savings that stick</h1>
          <p className="mt-1 text-fingo-muted">
            Solo targets, shared adventures, and contribution buzz. Completing a goal earns avatar shop
            points.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setCreateOpen(true)}>
            <Icon name="add" />
            Create Goal
          </Button>
          <Button variant="blue" onClick={() => setInviteOpen(goals[0]?.id ?? null)} disabled={!goals.length}>
            <Icon name="person_add" />
            Invite Friend
          </Button>
        </div>
      </section>

      {lastPointsEarned != null && (
        <Card className="flex items-center justify-between gap-3 bg-fingo-green-soft p-4 text-sm font-semibold text-fingo-green-dark">
          <span>Goal complete! +{lastPointsEarned} points — spend them in Social → Avatar shop.</span>
          <button type="button" className="underline" onClick={clearPointsToast}>
            Dismiss
          </button>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {goals.map((goal) => {
          const pct = percent(Number(goal.current_amount), Number(goal.target_amount))
          return (
            <Card key={goal.id} className="flex flex-col p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div
                  className="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-md"
                  style={{ background: goal.color }}
                >
                  <Icon name={goal.icon} />
                </div>
                {goal.is_collaborative && (
                  <span className="rounded-full bg-fingo-blue-soft px-2.5 py-1 text-[11px] font-bold text-fingo-blue">
                    Collaborative
                  </span>
                )}
              </div>
              <h3 className="font-display text-lg font-bold">{goal.title}</h3>
              <p className="mt-1 text-sm text-fingo-muted">
                {formatCurrency(Number(goal.current_amount))} of {formatCurrency(Number(goal.target_amount))}
                {goal.deadline ? ` · by ${formatDate(goal.deadline)}` : ''}
                {goal.points_awarded
                  ? ' · points claimed'
                  : ` · +${goalCompletionPoints(Number(goal.target_amount))} pts when done`}
              </p>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs font-semibold text-fingo-muted">
                  <span>{pct}%</span>
                  <span>{formatCurrency(Number(goal.target_amount) - Number(goal.current_amount))} to go</span>
                </div>
                <ProgressBar value={pct} tone={goal.is_collaborative ? 'blue' : 'green'} />
              </div>
              {goal.members && goal.members.length > 0 && (
                <div className="mt-3 flex -space-x-2">
                  {goal.members.slice(0, 4).map((m) => (
                    <div
                      key={m.id}
                      title={m.profile?.full_name ?? 'Member'}
                      className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-fingo-green-soft text-xs font-bold text-fingo-green-dark"
                    >
                      {(m.profile?.full_name ?? '?').slice(0, 1)}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <Button className="flex-1 !py-2 text-sm" onClick={() => setContributeOpen(goal.id)}>
                  Contribute
                </Button>
                <Button
                  variant="secondary"
                  className="!px-3 !py-2"
                  onClick={() => {
                    setInviteOpen(goal.id)
                    setFriendId(friends[0]?.id ?? '')
                  }}
                >
                  <Icon name="group_add" />
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold">Recent contribution activity</h2>
        <p className="mb-4 text-sm text-fingo-muted">What you and collaborators have been adding</p>
        <div className="space-y-3">
          {contributions.slice(0, 8).map((c) => {
            const goal = goals.find((g) => g.id === c.goal_id)
            const isYou = c.user_id === user?.id
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-white font-bold text-fingo-green shadow-sm">
                  {(c.profile?.full_name ?? (isYou ? user?.full_name : '?'))?.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fingo-ink">
                    {isYou ? 'You' : c.profile?.full_name ?? 'Friend'} added{' '}
                    <span className="text-fingo-green">{formatCurrency(Number(c.amount))}</span>
                    {goal ? ` to ${goal.title}` : ''}
                  </p>
                  <p className="text-xs text-fingo-muted">
                    {c.note || 'Contribution'} · {formatDate(c.created_at.slice(0, 10))}
                  </p>
                </div>
              </div>
            )
          })}
          {contributions.length === 0 && (
            <p className="text-sm text-fingo-muted">No contributions yet — start one!</p>
          )}
        </div>
      </Card>

      <Modal open={createOpen} title="Create savings goal" onClose={() => setCreateOpen(false)}>
        <form onSubmit={onCreate} className="space-y-3">
          <input className="input-field" required placeholder="Goal title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="input-field" required type="number" min="1" placeholder="Target amount" value={target} onChange={(e) => setTarget(e.target.value)} />
          <input className="input-field" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={collaborative} onChange={(e) => setCollaborative(e.target.checked)} />
            Collaborative savings goal
          </label>
          <Button className="w-full" type="submit">Create goal</Button>
        </form>
      </Modal>

      <Modal open={!!contributeOpen} title="Add contribution" onClose={() => setContributeOpen(null)}>
        <form onSubmit={onContribute} className="space-y-3">
          <input className="input-field" required type="number" min="0.01" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <input className="input-field" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button className="w-full" type="submit">Contribute</Button>
        </form>
      </Modal>

      <Modal open={!!inviteOpen} title="Invite friend to goal" onClose={() => setInviteOpen(null)}>
        <form onSubmit={onInvite} className="space-y-3">
          {friends.length === 0 ? (
            <p className="text-sm text-fingo-muted">Add friends on the Social tab first.</p>
          ) : (
            <select className="input-field" value={friendId} onChange={(e) => setFriendId(e.target.value)} required>
              <option value="">Select a friend</option>
              {friends.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.full_name}
                </option>
              ))}
            </select>
          )}
          <Button className="w-full" disabled={!friends.length || !friendId} type="submit">
            Send invite
          </Button>
        </form>
      </Modal>
    </div>
  )
}
