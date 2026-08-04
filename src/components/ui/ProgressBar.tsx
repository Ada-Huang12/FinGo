export function ProgressBar({
  value,
  tone = 'green',
  className = '',
}: {
  value: number
  tone?: 'green' | 'blue' | 'warning' | 'danger'
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, value))
  const toneClass =
    tone === 'blue' ? 'blue' : tone === 'warning' ? 'warning' : tone === 'danger' ? 'danger' : ''
  return (
    <div className={`progress-track ${className}`}>
      <div className={`progress-fill ${toneClass}`} style={{ width: `${clamped}%` }} />
    </div>
  )
}
