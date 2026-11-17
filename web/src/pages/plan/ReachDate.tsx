import { useState } from 'react'
import { dateIn, format } from '../../lib/format'
import { monthsToSave } from '../../lib/inflation'
import { muted } from '../../lib/styles'
import type { Currency } from '../../lib/types'

type ReachDateProps = {
  // still to save
  need: number
  // income minus spending per month; undefined when spending is not set
  net: number | undefined
  // monthly spending, which grows with inflation while income stays flat
  spend: number | undefined
  // yearly inflation, e.g. 0.11; undefined while unknown
  inflation: number | undefined
  currency: Currency
  // leaves out "not reached before spending catches up with income", for a list that says it once
  hideUnreachable?: boolean
}

// When `need` is saved from the monthly surplus: "In 7.3 months · 23.06.2027 · saving X per month",
// and the same with spending growing by inflation
export function ReachDate({ need, net, spend, inflation, currency, hideUnreachable }: ReachDateProps) {
  const [now] = useState(Date.now)
  if (net === undefined) return <span className={muted}>Set monthly spending and income to see when.</span>
  if (net <= 0) return <span className="text-rose-600 dark:text-rose-400">Not reachable: you spend at least as much as you earn.</span>
  const months = need / net
  const date = (m: number) => dateIn(m, now)
  const inflated = inflation !== undefined && inflation > 0 && spend !== undefined
    ? { months: monthsToSave(need, spend, spend + net, inflation) }
    : undefined
  return (
    <span className="text-zinc-700 tabular-nums dark:text-zinc-300">
      In <strong>{months.toFixed(1)} months</strong>
      <span className="text-zinc-500 dark:text-zinc-400"> · {date(months)} · saving {format(net, currency)} per month</span>
      {inflated && !(hideUnreachable && inflated.months === undefined) && (
        <span className={`block ${inflated.months === undefined ? 'text-amber-700 dark:text-amber-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
          With {(inflation! * 100).toFixed(1)}% inflation:{' '}
          {inflated.months === undefined ? 'not reached before spending catches up with income' : `${inflated.months.toFixed(1)} months · ${date(inflated.months)}`}
        </span>
      )}
    </span>
  )
}
