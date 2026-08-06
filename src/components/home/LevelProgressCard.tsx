import { useAuth } from '../../contexts/AuthContext'
import { levelFromXp } from '../../lib/quests'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'
import { ProgressBar } from '../ui/ProgressBar'

export function LevelProgressCard() {
  const { user } = useAuth()
  if (!user) return null

  const progress = levelFromXp(user.xp)

  return (
    <Card className="overflow-hidden p-0">
      <div className="bg-gradient-to-br from-fingo-green-soft via-white to-fingo-blue-soft px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-fingo-green">Progress</p>
            <h2 className="font-display text-2xl font-extrabold text-fingo-ink">Level {progress.level}</h2>
            <p className="mt-1 text-sm text-fingo-muted">
              {progress.xp.toLocaleString()} total XP · {user.points.toLocaleString()} shop points
            </p>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-fingo-green shadow-md">
            <Icon name="military_tech" className="text-[1.75rem]" filled />
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2 text-sm">
            <span className="font-semibold text-fingo-ink">
              {progress.xpIntoLevel} / {progress.xpPerLevel} XP to Level {progress.level + 1}
            </span>
            <span className="text-fingo-muted">{progress.xpToNext} XP left</span>
          </div>
          <ProgressBar value={progress.percent} tone="green" />
        </div>
      </div>
    </Card>
  )
}
