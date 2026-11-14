import { useState } from 'react'
import { ChevronIcon } from './icons'
import { percentOf, wholeMoney } from '../lib/format'
import { monthKey } from '../lib/periods'
import { median } from '../lib/stats'
import { card, muted } from '../lib/styles'
import type { Account, Category, Convert, Currency, Transaction } from '../lib/types'

// how far back "usual" looks, in complete months
const MONTHS = 12
// key of all spending categories together
const ALL = '*'
const dayMonth = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long' })

// lastYear: the same days of this month a year ago; undefined before the transactions start
type Row = { id: string, label: string, emoji?: string, now: number, usual: number, lastYear: number | undefined, subs: Row[] }

// biggest change in money first; rows with nothing now and nothing usual are dropped
const ranked = (rows: Row[]) =>
  rows.filter((r) => r.now > 0 || r.usual > 0).sort((a, b) => Math.abs(b.now - b.usual) - Math.abs(a.now - a.usual))

// Spending per category, and per subcategory, from the 1st to today, against the median of the same
// days in each of up to MONTHS complete months before (from the first month with a transaction; a month
// without spending in a category counts as 0). Same days rather than whole months, so a half-gone month
// is not «−50%». Net of refunds; cancelled pairs, income, own-account moves and investments are left out.
// The pace projects the month: spent so far plus the median of what the past months spent after this day,
// so rent paid on the 2nd is not stretched over the month the way spent ÷ days × 30 would.
function thisMonth(transactions: Transaction[], accounts: Account[], categories: Category[], convert: Convert, currency: Currency, now: Date) {
  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]))
  const parentOf = new Map(categories.flatMap((c) => [[c.id, c] as const, ...c.subcategories.map((s) => [s.id, c] as const)]))
  const current = monthKey(now.toISOString())
  const past = Array.from({ length: MONTHS }, (_, i) => monthKey(new Date(now.getFullYear(), now.getMonth() - MONTHS + i, 1).toISOString()))
  // category or subcategory id → month key → spent by this day of that month
  const spent = new Map<string, Map<string, number>>()
  const add = (id: string, month: string, amount: number) => {
    if (!spent.has(id)) spent.set(id, new Map())
    spent.get(id)!.set(month, (spent.get(id)!.get(month) ?? 0) - amount)
  }
  // month key → whole past month's spending
  const wholeMonth = new Map<string, number>()
  let first: string | undefined
  for (const t of transactions) {
    if (t.cancelled) continue
    const month = monthKey(t.time)
    if (!first || month < first) first = month
    const parent = parentOf.get(t.category)
    if (!parent?.spending || (month !== current && !past.includes(month))) continue
    const amount = convert(t.amount, currencyOf.get(t.accountId)!, currency)
    if (amount === undefined) return undefined
    if (month !== current) wholeMonth.set(month, (wholeMonth.get(month) ?? 0) - amount)
    if (new Date(t.time).getDate() > now.getDate()) continue
    add(ALL, month, amount)
    add(parent.id, month, amount)
    if (t.category !== parent.id) add(t.category, month, amount)
  }
  const months = past.filter((m) => first !== undefined && m >= first)
  if (!months.length) return { rows: [], months: 0, pace: undefined }
  // the window starts at this month a year ago
  const [lastYear] = past
  const row = (id: string, label: string, emoji?: string, subs: Row[] = []): Row => {
    const byMonth = spent.get(id)
    const ago = months.includes(lastYear) ? byMonth?.get(lastYear) ?? 0 : undefined
    return { id, label, emoji, now: byMonth?.get(current) ?? 0, usual: median(months.map((m) => byMonth?.get(m) ?? 0)), lastYear: ago, subs }
  }
  const rows = categories.map((c) => row(c.id, c.label, c.emoji, ranked(c.subcategories.map((s) => row(s.id, s.label)))))
  const byDay = spent.get(ALL)
  const sofar = byDay?.get(current) ?? 0
  const pace = {
    sofar,
    projected: sofar + median(months.map((m) => (wholeMonth.get(m) ?? 0) - (byDay?.get(m) ?? 0))),
    usualMonth: median(months.map((m) => wholeMonth.get(m) ?? 0)),
  }
  return { rows: ranked(rows), months: months.length, pace }
}

type ThisMonthProps = {
  transactions: Transaction[] | undefined
  accounts: Account[]
  categories: Category[]
  convert: Convert
  currency: Currency
  // Runway's monthly spending, in currency; undefined without a budget
  planned: number | undefined
}

export function ThisMonth({ transactions, accounts, categories, convert, currency, planned }: ThisMonthProps) {
  const [now] = useState(() => new Date())
  const [open, setOpen] = useState<string>()
  if (!transactions || !categories.length) return null
  const result = thisMonth(transactions, accounts, categories, convert, currency, now)
  if (!result?.rows.length) return null
  const { rows, months, pace } = result
  // the projection is measured against Runway's plan, or the usual month without one
  const target = planned ?? pace?.usualMonth
  const first = new Date(now.getFullYear(), now.getMonth(), 1)

  const line = ({ id, label, emoji, now: spent, usual, lastYear, subs }: Row, sub = false) => {
    const over = spent > usual
    const change = spent === usual ? '0%' : usual > 0 ? `${over ? '+' : '−'}${percentOf(Math.abs(spent - usual) / usual)}%` : 'new'
    return (
      <tr key={id} className={`text-right [&>td]:py-1.5 ${sub ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-900 dark:text-zinc-100'}`}>
        <td className={`text-left ${sub ? 'pl-7' : ''}`}>
          <span className="flex items-center gap-1">
            {/* this month's transactions in the category, on the Transactions page */}
            <a href={`#/transactions?category=${id}&period=m:${monthKey(now.toISOString())}`} className="hover:text-indigo-600 hover:underline dark:hover:text-indigo-400">
              {emoji && <span aria-hidden className="mr-2">{emoji}</span>}
              {label}
            </a>
            {subs.length > 0 && (
              <button
                type="button"
                aria-expanded={open === id}
                aria-label={`${open === id ? 'Hide' : 'Show'} ${label} subcategories`}
                onClick={() => setOpen(open === id ? undefined : id)}
                className="rounded-md p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <ChevronIcon up={open === id} />
              </button>
            )}
          </span>
        </td>
        <td>{wholeMoney(spent, currency)}</td>
        <td className="text-zinc-500 dark:text-zinc-400">{wholeMoney(usual, currency)}</td>
        <td className="text-zinc-500 dark:text-zinc-400">{lastYear === undefined ? '—' : wholeMoney(lastYear, currency)}</td>
        <td className={spent === usual ? muted : over ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}>{change}</td>
      </tr>
    )
  }

  return (
    <section className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">This month against the usual</h2>
        <span className={muted}>
          {dayMonth.format(first)} – {dayMonth.format(now)} vs the same days, median of {months} {months === 1 ? 'month' : 'months'}
        </span>
      </div>

      {pace && (
        <p className="mt-3 text-sm text-zinc-700 tabular-nums dark:text-zinc-300">
          Spent <span className="font-semibold text-zinc-900 dark:text-zinc-100">{wholeMoney(pace.sofar, currency)}</span> by {dayMonth.format(now)},
          on track for{' '}
          <span className={`font-semibold ${target !== undefined && pace.projected > target ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
            {wholeMoney(pace.projected, currency)}
          </span>
          <span className={muted}>
            {' '}· usual month {wholeMoney(pace.usualMonth, currency)}
            {planned !== undefined && ` · Runway plans ${wholeMoney(planned, currency)}`}
          </span>
        </p>
      )}

      <table className="mt-4 w-full text-sm tabular-nums">
        <thead className={muted}>
          <tr className="text-right [&>th]:pb-1 [&>th]:font-normal">
            <th className="text-left">Category</th>
            <th>This month</th>
            <th>Usual</th>
            <th>Last year</th>
            <th className="w-20">Change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.flatMap((r) => [line(r), ...(open === r.id ? r.subs.map((s) => line(s, true)) : [])])}
        </tbody>
      </table>
    </section>
  )
}
