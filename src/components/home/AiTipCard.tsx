import { Link } from 'react-router-dom'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'

const tips = [
  'Round up your next grocery trip and toss the difference into Emergency Fund.',
  'Your Shopping budget is warming up — try a 48-hour wait rule before big buys.',
  'Set a Sunday 10-minute money check-in. Tiny habits compound.',
]

export function AiTipCard({ name }: { name: string }) {
  const tip = tips[name.length % tips.length]
  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-fingo-blue to-blue-600 p-5 text-white sm:p-6">
      <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
      <div className="absolute -bottom-8 right-10 h-24 w-24 rounded-full bg-white/10" />
      <div className="relative">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
          <Icon name="smart_toy" className="text-[1.1rem]" />
          AI Coach tip
        </div>
        <h2 className="font-display text-lg font-bold">A nudge for {name.split(' ')[0]}</h2>
        <p className="mt-2 text-sm leading-relaxed text-blue-50">{tip}</p>
        <Link
          to="/ai-coach"
          className="mt-4 inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 font-display text-sm font-bold text-fingo-blue"
        >
          Chat with Coach
          <Icon name="arrow_forward" className="text-[1.1rem]" />
        </Link>
      </div>
    </Card>
  )
}
