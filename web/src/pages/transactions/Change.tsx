import { muted } from '../../lib/styles'

// "+12%" amber when spending grew, "−8%" green when it fell; "new" when there was none before
export function Change({
  now,
  before,
  className = '',
}: {
  now: number
  before: number | undefined
  className?: string
}) {
  if (before === undefined) return null
  if (before <= 0)
    return now > 0 ? <span className={`text-amber-700 dark:text-amber-400 ${className}`}>new</span> : null
  const change = now / before - 1
  if (Math.abs(change) < 0.005) return <span className={`${muted} ${className}`}>0%</span>
  return (
    <span
      className={`${change > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'} ${className}`}
    >
      {change > 0 ? '+' : '−'}
      {Math.round(Math.abs(change) * 100)}%
    </span>
  )
}
