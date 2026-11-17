import { useState, type ReactNode } from 'react'
import { Skeleton } from '../../components/Skeleton'
import { useApi } from '../../lib/api'
import { dateIn, wholeMoney } from '../../lib/format'
import { goalProgress } from '../../lib/goals'
import { card, muted } from '../../lib/styles'
import type { Convert, Currency, Goal } from '../../lib/types'

// amount: what the months take from savings; available: savings after the untouchable reserve
type Cushion = { months: number; amount: number; available: number; currency: Currency }

type TimelineProps = {
  // available savings minus the months-without-income cushion; negative while the cushion is not covered
  forGoalsIn: (c: Currency) => number | undefined
  convert: Convert
  // income minus spending per month; undefined when spending is not set
  netIn: (c: Currency) => number | undefined
  cushion: Cushion | undefined
  // usual monthly spending and the incomes that keep coming without the others, in the cushion's currency:
  // the cushion's line shows how its amount is made up from them
  usualSpend: number | undefined
  keptIncome: number
}

// amount: what it takes in all; left: what is still missing for it alone, undefined while loading;
// detail: a smaller line saying how amount is made up
type Milestone = {
  key: string
  label: string
  amount: number
  left: number | undefined
  detail?: string
  need: number | undefined
  currency: Currency
}

// "12 months × 73 075 грн (80 075 грн spending − 7 000 грн income that continues without a job)"
function cushionDetail({ months, amount, currency }: Cushion, usual: number | undefined, kept: number) {
  if (usual === undefined) return undefined
  const spending = `${wholeMoney(usual, currency)} spending`
  if (kept <= 0) return `${months} months × ${spending}`
  const income = `${wholeMoney(kept, currency)} income that continues without a job`
  if (amount === 0) return `${months} months × ${spending}, all covered by ${income}`
  return `${months} months × ${wholeMoney(usual - kept, currency)} (${spending} − ${income})`
}

// The plan in one list: the cushion, then each goal in the order savings fill them, with the date each is reached
// at today's spending. Inflation-adjusted dates stay with each goal below.
export function Timeline({ forGoalsIn, convert, netIn, cushion, usualSpend, keptIncome }: TimelineProps) {
  const [now] = useState(Date.now)
  const goals = (useApi<Goal[]>('/goals').data ?? []).filter((g) => !g.wish)
  const progress = goalProgress(goals, convert, forGoalsIn)

  const milestones: Milestone[] = [
    ...(cushion
      ? [
          {
            key: 'cushion',
            label: `Emergency fund · ${cushion.months} months`,
            // what savings must hold: the usual spending for the months, less the incomes that keep coming
            amount: cushion.amount,
            detail: cushionDetail(cushion, usualSpend, keptIncome),
            left: Math.max(0, cushion.amount - Math.max(0, cushion.available)),
            need: (() => {
              const f = forGoalsIn(cushion.currency)
              return f === undefined ? undefined : -f
            })(),
            currency: cushion.currency,
          },
        ]
      : []),
    ...goals.map((g, i) => ({
      key: String(g.id),
      label: g.name,
      amount: g.target,
      left: progress[i] && g.target - progress[i].have,
      need: progress[i]?.need,
      currency: g.currency,
    })),
  ]
  if (milestones.length === 0) return null

  // the first milestone not reached yet, which the surplus is going to now
  const current = milestones.findIndex((m) => m.need === undefined || m.need > 0)

  // the date and months columns; a state without a date spans both
  function when(m: Milestone) {
    const both = (node: ReactNode) => <span className="col-span-2 text-right text-sm">{node}</span>
    if (m.need === undefined) return both(<Skeleton />)
    if (m.need <= 0) return both(<span className="font-medium text-emerald-600 dark:text-emerald-400">Done</span>)
    const net = netIn(m.currency)
    if (net === undefined) return both(<span className={muted}>Set spending and income</span>)
    if (net <= 0) return both(<span className="text-rose-600 dark:text-rose-400">Not reachable</span>)
    const months = m.need / net
    return (
      <>
        <strong className="text-right text-sm font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
          {dateIn(months, now)}
        </strong>
        <span className={`text-right tabular-nums ${muted}`}>in {months.toFixed(1)} months</span>
      </>
    )
  }

  return (
    <section className={card}>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Timeline</h2>
      <p className={muted}>Your savings and monthly surplus fill these in order, at today's spending.</p>
      {/* one grid for all rows, so labels, dates and months line up in columns */}
      <ol className="mt-4 grid grid-cols-[auto_1fr_auto_auto] gap-x-3 sm:gap-x-5">
        {milestones.map((m, i) => {
          const done = m.need !== undefined && m.need <= 0
          return (
            <li key={m.key} className="relative col-span-4 grid grid-cols-subgrid items-baseline pb-4 last:pb-0">
              {/* the line to the next milestone */}
              {i < milestones.length - 1 && (
                <span aria-hidden className="absolute top-4 bottom-0 left-[5px] w-0.5 bg-zinc-200 dark:bg-zinc-800" />
              )}
              <span
                aria-hidden
                className={`relative size-3 self-start mt-1.5 rounded-full ${
                  done
                    ? 'bg-emerald-500'
                    : i === current
                      ? 'bg-indigo-500 ring-4 ring-indigo-500/20'
                      : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              />
              <span className="min-w-0">
                <span
                  className={`block truncate ${i === current ? 'font-medium text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'}`}
                >
                  {m.label}
                  {i === current && <span className={`ml-2 ${muted}`}>· saving for now</span>}
                </span>
                <span className={`block tabular-nums ${muted}`}>
                  {/* progress only for one under way: done needs nothing more, and one not started needs all of it */}
                  {m.left !== undefined && m.left > 0 && m.left < m.amount
                    ? `${wholeMoney(m.amount - m.left, m.currency)} of ${wholeMoney(m.amount, m.currency)} saved · ${wholeMoney(m.left, m.currency)} to go`
                    : wholeMoney(m.amount, m.currency)}
                </span>
                {m.detail && (
                  <span className="block text-xs text-zinc-500 tabular-nums dark:text-zinc-400">{m.detail}</span>
                )}
              </span>
              {when(m)}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
