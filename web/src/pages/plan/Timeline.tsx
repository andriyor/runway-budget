import { useState, type ReactNode } from 'react'
import { ErrorText } from '../../components/ErrorText'
import { Skeleton } from '../../components/Skeleton'
import { useApi } from '../../lib/api'
import { dateIn, wholeMoney } from '../../lib/format'
import { goalProgress } from '../../lib/goals'
import { card, linkButton, muted } from '../../lib/styles'
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
  // usual and essential monthly spending and the incomes that keep coming without the others, in the
  // cushion's currency: the cushion's line shows how its amount is made up, and the what-if slider spans them
  usualSpend: number | undefined
  essentialSpend: number | undefined
  keptIncome: number
  // the currency amounts are shown in; a goal's own amounts are converted to it
  currency: Currency
  // saves a monthly spending in `currency` as the plan's
  onUseSpending: (amount: number) => Promise<unknown>
}

// amount: what it takes in all; left: what is still missing for it alone; need: what is still missing for it
// and everything before it; net: the monthly surplus that saves it; all in currency and undefined while loading.
// detail: a smaller line saying how amount is made up
type Milestone = {
  key: string
  label: string
  amount: number
  left: number | undefined
  detail?: string
  need: number | undefined
  net: number | undefined
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

type Plan = {
  goals: Goal[]
  convert: Convert
  forGoalsIn: (c: Currency) => number | undefined
  netIn: (c: Currency) => number | undefined
  cushion: Cushion | undefined
  usual: number | undefined
  kept: number
}

// the cushion, then each goal in the order savings fill them
function milestonesOf({ goals, convert, forGoalsIn, netIn, cushion, usual, kept }: Plan): Milestone[] {
  const progress = goalProgress(goals, convert, forGoalsIn)
  return [
    ...(cushion
      ? [
          {
            key: 'cushion',
            label: `Emergency fund · ${cushion.months} months`,
            // what savings must hold: the usual spending for the months, less the incomes that keep coming
            amount: cushion.amount,
            detail: cushionDetail(cushion, usual, kept),
            left: Math.max(0, cushion.amount - Math.max(0, cushion.available)),
            need: (() => {
              const f = forGoalsIn(cushion.currency)
              return f === undefined ? undefined : -f
            })(),
            net: netIn(cushion.currency),
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
      net: netIn(g.currency),
      currency: g.currency,
    })),
  ]
}

// months until a milestone is reached; 0 once done, undefined when it cannot be dated
function monthsTo(m: Milestone) {
  if (m.need === undefined || m.net === undefined) return undefined
  if (m.need <= 0) return 0
  return m.net > 0 ? m.need / m.net : undefined
}

// The plan in one list: the cushion, then each goal in the order savings fill them, with the date each is reached
// at today's spending. A slider tries another monthly spending without saving it. Inflation-adjusted dates stay
// with each goal below.
export function Timeline({
  forGoalsIn,
  convert,
  netIn,
  cushion,
  usualSpend,
  essentialSpend,
  keptIncome,
  currency,
  onUseSpending,
}: TimelineProps) {
  const [now] = useState(Date.now)
  // the what-if spending as a share of the usual one, so it survives a currency switch; undefined is the plan
  const [ratio, setRatio] = useState<number>()
  const [error, setError] = useState('')
  // in the shown currency; as it is while rates load
  const money = (amount: number, from: Currency) => {
    const converted = convert(amount, from, currency)
    return converted === undefined ? wholeMoney(amount, from) : wholeMoney(converted, currency)
  }
  const goals = (useApi<Goal[]>('/goals').data ?? []).filter((g) => !g.wish)

  const base = { goals, convert, forGoalsIn, netIn, cushion, usual: usualSpend, kept: keptIncome }
  const planned = milestonesOf(base)
  // spending less makes the fund smaller and the monthly surplus larger, so both move
  const spend = usualSpend !== undefined && ratio !== undefined ? usualSpend * ratio : undefined
  const tried =
    spend === undefined || usualSpend === undefined
      ? undefined
      : (() => {
          const fund = cushion && { ...cushion, amount: cushion.months * Math.max(0, spend - keptIncome) }
          const freed = (cushion?.amount ?? 0) - (fund?.amount ?? 0)
          const add = (value: number | undefined, extra: number, c: Currency) => {
            const converted = convert(extra, currency, c)
            return value === undefined || converted === undefined ? undefined : value + converted
          }
          return milestonesOf({
            ...base,
            cushion: fund,
            usual: spend,
            forGoalsIn: (c) => add(forGoalsIn(c), freed, c),
            netIn: (c) => add(netIn(c), usualSpend - spend, c),
          })
        })()
  const milestones = tried ?? planned
  // the monthly surplus filling the milestones, at the what-if spending while one is tried
  const net = netIn(currency)
  const surplus = net === undefined ? undefined : net + (spend === undefined ? 0 : usualSpend! - spend)
  if (milestones.length === 0) return null

  // the first milestone not reached yet, which the surplus is going to now
  const current = milestones.findIndex((m) => m.need === undefined || m.need > 0)

  // the date and months columns; a state without a date spans both. With a what-if, how much sooner or later
  // than the plan. On phones the two stack in one column, leaving the label room
  function when(m: Milestone, plannedMonths: number | undefined) {
    return <span className="flex flex-col items-end sm:contents">{whenColumns(m, plannedMonths)}</span>
  }
  function whenColumns(m: Milestone, plannedMonths: number | undefined) {
    const both = (node: ReactNode) => <span className="col-span-2 text-right text-sm">{node}</span>
    if (m.need === undefined) return both(<Skeleton />)
    if (m.need <= 0) return both(<span className="font-medium text-emerald-600 dark:text-emerald-400">Done</span>)
    if (m.net === undefined) return both(<span className={muted}>Set spending and income</span>)
    if (m.net <= 0) return both(<span className="text-rose-600 dark:text-rose-400">Not reachable</span>)
    const months = m.need / m.net
    const shift = tried && plannedMonths !== undefined ? months - plannedMonths : undefined
    return (
      <>
        <strong className="text-right text-sm font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
          {dateIn(months, now)}
        </strong>
        <span className={`text-right tabular-nums ${muted}`}>
          in {months.toFixed(1)} months
          {shift !== undefined && Math.abs(shift) >= 0.05 && (
            <span
              className={`ml-1.5 font-medium ${shift < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}
            >
              {shift < 0 ? '−' : '+'}
              {Math.abs(shift).toFixed(1)}
            </span>
          )}
        </span>
      </>
    )
  }

  async function use() {
    if (spend === undefined) return
    try {
      await onUseSpending(spend)
      setRatio(undefined)
      setError('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  // from essential spending, the realistic floor, to half again the usual; steps of about 1% of it, rounded
  const slider =
    usualSpend !== undefined && usualSpend > 0
      ? (() => {
          const step = 10 ** Math.max(0, Math.floor(Math.log10(usualSpend)) - 2)
          const floor = essentialSpend !== undefined && essentialSpend < usualSpend ? essentialSpend : usualSpend / 2
          return {
            min: Math.floor(floor / step) * step,
            max: Math.ceil((usualSpend * 1.5) / step) * step,
            step,
          }
        })()
      : undefined

  return (
    <section className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Timeline</h2>
        {surplus !== undefined && (
          <p
            className={`text-lg font-semibold tabular-nums ${surplus > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
          >
            {surplus > 0 ? '+' : '−'}
            {wholeMoney(Math.abs(surplus), currency)}{' '}
            <span className="text-sm font-normal">{surplus > 0 ? 'saved' : 'short'} per month</span>
          </p>
        )}
      </div>
      <p className={muted}>
        Your savings and monthly surplus fill these in order,{' '}
        {tried ? 'at the spending you are trying' : "at today's spending"}.
      </p>
      {/* one grid for all rows, so labels, dates and months line up in columns */}
      <ol className="mt-4 grid grid-cols-[auto_1fr_auto] gap-x-3 sm:grid-cols-[auto_1fr_auto_auto] sm:gap-x-5">
        {milestones.map((m, i) => {
          const done = m.need !== undefined && m.need <= 0
          return (
            <li
              key={m.key}
              className="relative col-span-3 grid grid-cols-subgrid sm:col-span-4 items-baseline pb-4 last:pb-0"
            >
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
                  className={`block sm:truncate ${i === current ? 'font-medium text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'}`}
                >
                  {m.label}
                  {i === current && <span className={`ml-2 ${muted}`}>· saving for now</span>}
                </span>
                <span className={`block tabular-nums ${muted}`}>
                  {/* progress only for one under way: done needs nothing more, and one not started needs all of it */}
                  {m.left !== undefined && m.left > 0 && m.left < m.amount
                    ? `${money(m.amount - m.left, m.currency)} of ${money(m.amount, m.currency)} saved · ${money(m.left, m.currency)} to go`
                    : money(m.amount, m.currency)}
                </span>
                {m.detail && (
                  <span className="block text-xs text-zinc-500 tabular-nums dark:text-zinc-400">{m.detail}</span>
                )}
              </span>
              {when(m, monthsTo(planned[i]))}
            </li>
          )
        })}
      </ol>

      {slider && usualSpend !== undefined && (
        <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <label htmlFor="what-if-spend" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              What if I spend per month
            </label>
            <span className="text-sm tabular-nums">
              <strong className="text-zinc-900 dark:text-zinc-100">{wholeMoney(spend ?? usualSpend, currency)}</strong>
              {spend !== undefined && Math.round(spend) !== Math.round(usualSpend) && (
                <span
                  className={`ml-2 ${spend < usualSpend ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}
                >
                  {spend < usualSpend ? '−' : '+'}
                  {wholeMoney(Math.abs(spend - usualSpend), currency)} a month
                </span>
              )}
            </span>
          </div>
          <input
            id="what-if-spend"
            type="range"
            min={slider.min}
            max={slider.max}
            step={slider.step}
            value={spend ?? usualSpend}
            onChange={(e) => setRatio(Number(e.target.value) / usualSpend)}
            className="mt-2 w-full accent-indigo-600"
          />
          {/* the ends, and "now" under its place on the track */}
          <div className={`relative h-4 text-xs tabular-nums ${muted}`}>
            <span className="absolute left-0">
              {essentialSpend !== undefined && essentialSpend < usualSpend ? 'essential ' : ''}
              {wholeMoney(slider.min, currency)}
            </span>
            <span
              className="absolute -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${((usualSpend - slider.min) / (slider.max - slider.min)) * 100}%` }}
            >
              now {wholeMoney(usualSpend, currency)}
            </span>
            <span className="absolute right-0">{wholeMoney(slider.max, currency)}</span>
          </div>
          {tried && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className={muted}>Not saved: Runway and the cards below still use your spending.</span>
              <button type="button" onClick={() => setRatio(undefined)} className={linkButton}>
                Reset
              </button>
              <button type="button" onClick={use} className={linkButton}>
                Use as my spending
              </button>
            </div>
          )}
          <ErrorText>{error}</ErrorText>
        </div>
      )}
    </section>
  )
}
