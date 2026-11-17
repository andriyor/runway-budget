import { ReachDate } from './ReachDate'
import { format } from '../../lib/format'
import { card, muted } from '../../lib/styles'
import type { Currency } from '../../lib/types'

// the usual rule: 3 to 6 months of essential spending
const MINIMUM = 3
const DEFAULT_MONTHS = 6

const tones = {
  emerald: { text: 'text-emerald-700 dark:text-emerald-400', bar: 'bg-emerald-500' },
  amber: { text: 'text-amber-700 dark:text-amber-400', bar: 'bg-amber-500' },
  rose: { text: 'text-rose-600 dark:text-rose-400', bar: 'bg-rose-500' },
}

type EmergencyFundProps = {
  // available savings: total balance minus the untouchable reserve
  available: number
  // Runway's essential spending; undefined when not set
  essential: number | undefined
  // Runway's usual monthly spending
  usual: number
  // incomes that keep coming without the others, e.g. a pension
  kept: number
  // Runway's "months to cover without income"; null when not set
  months: number | null
  // income minus usual spending per month, and yearly inflation, to date reaching each target like a goal;
  // net is undefined when spending is not set
  net: number | undefined
  inflation: number | undefined
  currency: Currency
}

// How many months without income the available savings cover, against a target of `months` (6 by default)
// and the 3-month minimum: at essential spending, and at the usual spending that Goals keep aside.
// Incomes that keep coming lower what a month takes from savings.
export function EmergencyFund({
  available,
  essential,
  usual,
  kept,
  months,
  net,
  inflation,
  currency,
}: EmergencyFundProps) {
  const target = months ?? DEFAULT_MONTHS
  const tile = (label: string, monthly: number) => (
    <Tile
      label={label}
      monthly={monthly}
      kept={kept}
      target={target}
      available={available}
      net={net}
      spend={usual}
      inflation={inflation}
      currency={currency}
    />
  )

  return (
    <section className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Emergency fund</h2>
        <span className={muted}>{target} months without income</span>
      </div>
      <p className={`mt-1 ${muted}`}>
        {months === null
          ? 'The usual 6 months; set “Emergency fund” in Runway to change it.'
          : 'Savings for the usual spending are kept aside before goals.'}
        {essential === undefined && ' Set “Essential spending per month” in Runway to see essentials alone.'}
      </p>

      <div className={`mt-4 grid gap-3 ${essential !== undefined ? 'sm:grid-cols-2' : ''}`}>
        {essential !== undefined && tile('Essential spending', essential)}
        {tile('Usual spending', usual)}
      </div>
    </section>
  )
}

type TileProps = {
  label: string
  // spending per month, before incomes that keep coming
  monthly: number
  kept: number
  target: number
  available: number
  net: number | undefined
  spend: number
  inflation: number | undefined
  currency: Currency
}

// months covered at one level of spending, its bar with the 3-month minimum, and when the target is reached
function Tile({ label, monthly, kept, target, available, net, spend, inflation, currency }: TileProps) {
  const burn = monthly - kept
  const goal = target * Math.max(0, burn)
  const have = Math.max(0, available)
  const covered = burn > 0 ? have / burn : Infinity
  const progress = goal > 0 ? Math.min(1, have / goal) : 1
  const tone = tones[covered >= target ? 'emerald' : covered >= MINIMUM ? 'amber' : 'rose']

  return (
    <div className="flex flex-col rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</p>
      <p className={`text-xs tabular-nums ${muted}`}>
        {format(monthly, currency)}
        {kept > 0 && ` − ${format(kept, currency)} income`} per month · {format(goal, currency)} for {target} months
      </p>

      <p className={`mt-3 text-2xl font-semibold tabular-nums ${tone.text}`}>
        {covered === Infinity ? 'Indefinitely' : covered.toFixed(1)}
        {covered !== Infinity && (
          <span className="ml-1.5 text-sm font-normal text-zinc-500 dark:text-zinc-400">of {target} months</span>
        )}
      </p>
      <div
        role="progressbar"
        aria-label={`Emergency fund at ${label.toLowerCase()}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="relative mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
      >
        <div className={`h-full rounded-full transition-[width] ${tone.bar}`} style={{ width: `${progress * 100}%` }} />
        {/* the 3-month minimum */}
        {target > MINIMUM && (
          <div
            aria-hidden
            className="absolute inset-y-0 w-0.5 bg-zinc-50 dark:bg-zinc-800"
            style={{ left: `${(MINIMUM / target) * 100}%` }}
          />
        )}
      </div>

      <p className={`mt-1.5 text-sm tabular-nums ${tone.text}`}>
        {covered === Infinity
          ? 'Income that continues without a job covers it.'
          : have >= goal
            ? `Covered · ${format(have - goal, currency)} beyond it`
            : `${format(goal - have, currency)} short${covered < MINIMUM ? ` · below the ${MINIMUM}-month minimum` : ''}`}
      </p>
      {have < goal && (
        <p className="mt-2 text-sm">
          <ReachDate need={goal - have} net={net} spend={spend} inflation={inflation} currency={currency} />
        </p>
      )}
    </div>
  )
}
