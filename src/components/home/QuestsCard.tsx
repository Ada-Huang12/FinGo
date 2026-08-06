import { useState } from 'react'
import { useData } from '../../contexts/DataContext'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'
import { ProgressBar } from '../ui/ProgressBar'

export function QuestsCard() {
  const { questStatuses, claimQuest } = useData()
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function onClaim(questId: string) {
    setClaimingId(questId)
    setError('')
    try {
      await claimQuest(questId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not claim quest.')
    } finally {
      setClaimingId(null)
    }
  }

  const ready = questStatuses.filter((q) => q.claimable).length
  const done = questStatuses.filter((q) => q.claimed).length

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-fingo-ink">Quests & daily tasks</h2>
          <p className="text-sm text-fingo-muted">
            {ready > 0
              ? `${ready} ready to claim`
              : done === questStatuses.length
                ? 'All current quests claimed — nice work'
                : 'Complete money habits to earn XP'}
          </p>
        </div>
        <Icon name="emoji_events" className="text-amber-500" />
      </div>

      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

      <div className="space-y-3">
        {questStatuses.map((status) => {
          const { quest, percent, claimable, claimed, progress, target } = status
          const tone = claimed ? 'green' : claimable ? 'blue' : percent >= 70 ? 'warning' : 'green'
          return (
            <div key={quest.id} className="rounded-2xl bg-slate-50 p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-fingo-blue shadow-sm">
                  <Icon name={quest.icon} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display font-bold text-fingo-ink">{quest.title}</p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fingo-muted">
                      {quest.period}
                    </span>
                    <span className="rounded-full bg-fingo-green-soft px-2 py-0.5 text-[10px] font-bold text-fingo-green">
                      +{quest.xp} XP
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-fingo-muted">{quest.description}</p>
                  <div className="mt-2">
                    <div className="mb-1 flex justify-between text-xs text-fingo-muted">
                      <span>
                        {quest.id === 'save_50_goal'
                          ? `$${progress} / $${target}`
                          : `${progress} / ${target}`}
                      </span>
                      <span>{claimed ? 'Claimed' : claimable ? 'Ready' : `${percent}%`}</span>
                    </div>
                    <ProgressBar value={claimed ? 100 : percent} tone={tone} />
                  </div>
                  <div className="mt-3">
                    {claimed ? (
                      <p className="text-xs font-semibold text-fingo-green">Reward claimed</p>
                    ) : (
                      <Button
                        type="button"
                        variant={claimable ? 'primary' : 'secondary'}
                        className="!px-3 !py-1.5 text-xs"
                        disabled={!claimable || claimingId === quest.id}
                        onClick={() => void onClaim(quest.id)}
                      >
                        {claimingId === quest.id
                          ? 'Claiming…'
                          : claimable
                            ? `Claim +${quest.xp} XP`
                            : 'In progress'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
