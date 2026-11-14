import { useState } from 'react'
import { percentOf, wholeMoney } from '../lib/format'
import { monthKey } from '../lib/periods'
import { median } from '../lib/stats'
import { card, muted } from '../lib/styles'
import type { Account, Category, Convert, Currency, Transaction } from '../lib/types'

// how far back "usual" looks, in complete months
const MONTHS = 12
const dayMonth = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long' })

type Row = { category: Category, now: number, usual: number }

// Spending per category from the 1st to today, against the median of the same days in each of up to
// MONTHS complete months before (from the first month with a transaction; a month without spending in
// a category counts as 0). Same days rather than whole months, so a half-gone month is not «−50%».
// Net of refunds; cancelled pairs, income, own-account moves and investments are left out.
function thisMonth(transactions: Transaction[], accounts: Account[], categories: Category[], convert: Convert, currency: Currency, now: Date) {
  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]))
  const parentOf = new Map(categories.flatMap((c) => [[c.id, c] as const, ...c.subcategories.map((s) => [s.id, c] as const)]))
  const current = monthKey(now.toISOString())
  const past = Array.from({ length: MONTHS }, (_, i) => monthKey(new Date(now.getFullYear(), now.getMonth() - MONTHS + i, 1).toISOString()))
  // category id → month key → spent by this day of that month
  const spent = new Map<string, Map<string, number>>()
  let first: string | undefined
  for (const t of transactions) {
    if (t.cancelled) continue
    const month = monthKey(t.time)
    if (!first || month < first) first = month
    const parent = parentOf.get(t.category)
    if (!parent?.spending || new Date(t.time).getDate() > now.getDate() || (month !== current && !past.includes(month))) continue
    const amount = convert(t.amount, currencyOf.get(t.accountId)!, currency)
    if (amount === undefined) return undefined
    if (!spent.has(parent.id)) spent.set(parent.id, new Map())
    const byMonth = spent.get(parent.id)!
    byMonth.set(month, (byMonth.get(month) ?? 0) - amount)
  }
  const months = past.filter((m) => first !== undefined && m >= first)
  if (!months.length) return { rows: [], months: 0 }
  const rows: Row[] = categories.flatMap((category) => {
    const byMonth = spent.get(category.id)
    const row = { category, now: byMonth?.get(current) ?? 0, usual: median(months.map((m) => byMonth?.get(m) ?? 0)) }
    return row.now > 0 || row.usual > 0 ? [row] : []
  })
  // biggest change in money first
  return { rows: rows.sort((a, b) => Math.abs(b.now - b.usual) - Math.abs(a.now - a.usual)), months: months.length }
}

type ThisMonthProps = {
  transactions: Transaction[] | undefined
  accounts: Account[]
  categories: Category[]
  convert: Convert
  currency: Currency
}

export function ThisMonth({ transactions, accounts, categories, convert, currency }: ThisMonthProps) {
  const [now] = useState(() => new Date())
  if (!transactions || !categories.length) return null
  const result = thisMonth(transactions, accounts, categories, convert, currency, now)
  if (!result?.rows.length) return null
  const { rows, months } = result
  const first = new Date(now.getFullYear(), now.getMonth(), 1)

  return (
    <section className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">This month against the usual</h2>
        <span className={muted}>
          {dayMonth.format(first)} – {dayMonth.format(now)} vs the same days, median of {months} {months === 1 ? 'month' : 'months'}
        </span>
      </div>

      <table className="mt-4 w-full text-sm tabular-nums">
        <thead className={muted}>
          <tr className="text-right [&>th]:pb-1 [&>th]:font-normal">
            <th className="text-left">Category</th>
            <th>This month</th>
            <th>Usual</th>
            <th className="w-20">Change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map(({ category, now: spent, usual }) => {
            const over = spent > usual
            const change = usual > 0 ? `${over ? '+' : '−'}${percentOf(Math.abs(spent - usual) / usual)}%` : 'new'
            return (
              <tr key={category.id} className="text-right text-zinc-900 dark:text-zinc-100 [&>td]:py-1.5">
                <td className="text-left">
                  <span aria-hidden className="mr-2">{category.emoji}</span>
                  {category.label}
                </td>
                <td>{wholeMoney(spent, currency)}</td>
                <td className="text-zinc-500 dark:text-zinc-400">{wholeMoney(usual, currency)}</td>
                <td className={spent === usual ? muted : over ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}>
                  {spent === usual ? '0%' : change}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
