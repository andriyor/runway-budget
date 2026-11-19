import { format, wholeMoney } from '../../lib/format'
import { muted } from '../../lib/styles'
import type { Currency } from '../../lib/types'

// how a change from the period before is shown: in money or as a share of what it was
export type ChangeMode = 'amount' | 'percent'

const signed = (value: number, text: string) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${text}`

// A change from the period before: "+4 900 грн" or "+12%", amber when spending grew and green when it fell;
// "new" as a percent when there was none before. The tooltip gives the other form and both totals.
export function Change({
  now,
  before,
  mode,
  currency,
  className = '',
}: {
  now: number
  before: number | undefined
  mode: ChangeMode
  currency: Currency
  className?: string
}) {
  if (before === undefined || (before <= 0 && now <= 0)) return null
  const diff = now - Math.max(0, before)
  const amount = signed(Math.round(diff), wholeMoney(Math.abs(diff), currency))
  const share = before > 0 ? now / before - 1 : undefined
  const percent = share === undefined ? 'new' : signed(Math.round(share * 100), `${Math.abs(Math.round(share * 100))}%`)
  const title = `${mode === 'amount' ? percent : amount} · from ${format(Math.max(0, before), currency)} to ${format(now, currency)}`
  const tone =
    Math.round(diff) === 0 || (share !== undefined && Math.round(share * 100) === 0)
      ? muted
      : diff > 0
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-emerald-600 dark:text-emerald-400'
  return (
    <span title={title} className={`${tone} ${className}`}>
      {mode === 'amount' ? amount : percent}
    </span>
  )
}

// the % | грн switch for the change column
export function ChangeModeSwitch({
  mode,
  currency,
  onChange,
}: {
  mode: ChangeMode
  currency: Currency
  onChange: (mode: ChangeMode) => void
}) {
  const options: Array<[ChangeMode, string]> = [
    ['amount', currency === 'UAH' ? 'грн' : currency],
    ['percent', '%'],
  ]
  return (
    <div
      role="group"
      aria-label="Show changes as"
      className="inline-flex rounded-lg bg-zinc-100 p-0.5 text-xs dark:bg-zinc-800"
    >
      {options.map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => onChange(value)}
          className={`rounded-md px-2 py-0.5 font-medium ${
            mode === value
              ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
