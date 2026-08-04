export function Icon({
  name,
  className = '',
  filled = false,
}: {
  name: string
  className?: string
  filled?: boolean
}) {
  return (
    <span className={`material-symbols-rounded ${filled ? 'filled' : ''} ${className}`} aria-hidden>
      {name}
    </span>
  )
}
