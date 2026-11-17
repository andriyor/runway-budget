import { useState } from 'react'
import { useApi } from '../../lib/api'
import { wholeMoney } from '../../lib/format'
import { goalProgress } from '../../lib/goals'
import { card } from '../../lib/styles'
import type { Convert, Currency, Goal } from '../../lib/types'

type SummaryProps = {
  // all in `currency`, and counting the turned-on planned expenses; undefined while loading or without a budget
  available: number | undefined
  spend: number | undefined
  // incomes that keep coming without a job
  kept: number
  // income minus spending per month
  net: number | undefined
  // available savings minus the emergency fund; negative while the fund is not covered
  forGoalsIn: (c: Currency) => number | undefined
  netIn: (c: Currency) => number | undefined
  convert: Convert
  currency: Currency
}

const AVG_MONTH_MS = 30.44 * 864e5
const monthYear = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' })
// "about 10 months", "about 2.5 years"
const duration = (months: number) =>
  months >= 24
    ? `about ${(months / 12).toFixed(1).replace(/\.0$/, '')} years`
    : `about ${Math.max(1, Math.round(months))} months`

// The plan in two or three plain sentences, before any card: how long savings last, what a month adds or takes,
// and what is being saved for next. No alarms: the cards below hold the detail.
export function Summary({ available, spend, kept, net, forGoalsIn, netIn, convert, currency: c }: SummaryProps) {
  const [now] = useState(Date.now)
  const goals = (useApi<Goal[]>('/goals').data ?? []).filter((g) => !g.wish)
  if (available === undefined || spend === undefined || net === undefined) return null
  const when = (months: number) => monthYear.format(new Date(now + months * AVG_MONTH_MS))

  const burn = spend - kept
  const runway =
    burn <= 0 ? (
      <>Even without your job, the income that continues covers your spending.</>
    ) : (
      <>
        Without income, your savings last <strong>{duration(Math.max(0, available) / burn)}</strong>, until{' '}
        {when(Math.max(0, available) / burn)}.
      </>
    )

  const month =
    net > 0 ? (
      <>Each month you put aside about {wholeMoney(net, c)}.</>
    ) : net < 0 ? (
      <>For now each month takes about {wholeMoney(-net, c)} from savings.</>
    ) : null

  // the first thing not reached yet: the emergency fund, then goals in order
  const next = (() => {
    const forGoals = forGoalsIn(c)
    if (forGoals !== undefined && forGoals < 0) {
      return net > 0 ? `Next: a full emergency fund, around ${when(-forGoals / net)}.` : undefined
    }
    const progress = goalProgress(goals, convert, forGoalsIn)
    const i = progress.findIndex((p) => p !== undefined && p.need > 0)
    if (i === -1) return goals.length > 0 && progress.every(Boolean) ? 'Every goal is covered.' : undefined
    const goalNet = netIn(goals[i].currency)
    return goalNet !== undefined && goalNet > 0
      ? `Next: ${goals[i].name}, around ${when(progress[i]!.need / goalNet)}.`
      : undefined
  })()

  return (
    <section className={`${card} text-base leading-relaxed text-zinc-700 dark:text-zinc-300`}>
      <p className="text-lg text-zinc-900 dark:text-zinc-100">{runway}</p>
      {(month || next) && (
        <p className="mt-1">
          {month} {next}
        </p>
      )}
    </section>
  )
}
