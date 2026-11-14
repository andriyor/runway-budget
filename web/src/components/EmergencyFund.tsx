import { format } from '../lib/format'
import { card, muted } from '../lib/styles'
import type { Currency } from '../lib/types'

// the usual rule: 3 to 6 months of essential spending
const MINIMUM = 3
const DEFAULT_MONTHS = 6

type EmergencyFundProps = {
  // available savings: total balance minus the untouchable reserve
  available: number
  // Runway's essential spending; undefined when not set
  essential: number | undefined
  // Runway's usual monthly spending, used when essentials are not set
  usual: number
  // incomes that keep coming without the others, e.g. a pension
  kept: number
  // Runway's "months to cover without income"; null when not set
  months: number | null
  currency: Currency
}

// How many months of essential spending the available savings cover, against a target of `months`
// (6 by default) and the 3-month minimum. Incomes that keep coming lower what a month takes from savings.
export function EmergencyFund({ available, essential, usual, kept, months, currency }: EmergencyFundProps) {
  const target = months ?? DEFAULT_MONTHS
  const monthly = essential ?? usual
  const burn = monthly - kept
  const goal = target * Math.max(0, burn)
  const have = Math.max(0, available)
  const covered = burn > 0 ? have / burn : Infinity
  const progress = goal > 0 ? Math.min(1, have / goal) : 1
  const tone = covered >= target ? 'emerald' : covered >= MINIMUM ? 'amber' : 'rose'
  const colors = {
    emerald: { text: 'text-emerald-700 dark:text-emerald-400', bar: 'bg-emerald-500' },
    amber: { text: 'text-amber-700 dark:text-amber-400', bar: 'bg-amber-500' },
    rose: { text: 'text-rose-600 dark:text-rose-400', bar: 'bg-rose-500' },
  }[tone]

  return (
    <section className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Emergency fund</h2>
        <span className={`tabular-nums ${muted}`}>
          {target} months × {format(monthly, currency)}{kept > 0 && ` − ${format(kept, currency)} income`} = {format(goal, currency)}
        </span>
      </div>
      <p className={`mt-1 ${muted}`}>
        {essential === undefined
          ? 'Uses your usual spending: set “Essential spending per month” in Runway to count essentials only.'
          : 'Essential spending from Runway.'}
        {months === null && ' Target: the usual 6 months; set “Months to cover without income” in Runway to change it.'}
      </p>

      <p className={`mt-3 text-2xl font-semibold tabular-nums ${colors.text}`}>
        {covered === Infinity ? 'Covered indefinitely' : `${covered.toFixed(1)} of ${target} months`}
      </p>
      <div
        role="progressbar"
        aria-label="Emergency fund"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="relative mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
      >
        <div className={`h-full rounded-full transition-[width] ${colors.bar}`} style={{ width: `${progress * 100}%` }} />
        {/* the 3-month minimum */}
        {target > MINIMUM && (
          <div aria-hidden className="absolute inset-y-0 w-0.5 bg-white dark:bg-zinc-900" style={{ left: `${(MINIMUM / target) * 100}%` }} />
        )}
      </div>
      <p className={`mt-1.5 text-sm tabular-nums ${colors.text}`}>
        {covered === Infinity
          ? 'Incomes that keep coming cover your essentials.'
          : tone === 'emerald'
            ? `Fully funded · ${format(have - goal, currency)} beyond it`
            : tone === 'amber'
              ? `Above the ${MINIMUM}-month minimum · ${format(goal - have, currency)} short of ${target} months`
              : `Below the ${MINIMUM}-month minimum · ${format(MINIMUM * burn - have, currency)} short of it, ${format(goal - have, currency)} of ${target} months`}
      </p>
    </section>
  )
}
