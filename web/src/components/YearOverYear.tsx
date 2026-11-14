import { useState } from 'react'
import { percentOf, wholeMoney } from '../lib/format'
import { card, muted } from '../lib/styles'
import type { Account, Category, Convert, Currency, Transaction } from '../lib/types'

// most recent years shown, the running one included
const YEARS = 3
const dayMonth = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' })

type Row = { category: Category, byYear: Map<number, number>, lastYearToDate: number }
// a table column: a past year, last year to date (when comparable) or this year so far, the last one;
// from marks the column of the year the data starts in
type Column = { key: string, label: string, value: (r: Row) => number, current?: boolean, from?: boolean }

// Spending per category and calendar year, and last year's spending from 1 January to today's date,
// so the running year can be compared with the same part of the last one. Net of refunds; cancelled
// pairs, income, own-account moves and investments are left out.
function perYear(transactions: Transaction[], accounts: Account[], categories: Category[], convert: Convert, currency: Currency, now: Date) {
  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]))
  const parentOf = new Map(categories.flatMap((c) => [[c.id, c] as const, ...c.subcategories.map((s) => [s.id, c] as const)]))
  const year = now.getFullYear()
  // the same moment a year ago: last year's spending up to it compares with this year's so far
  const yearAgo = new Date(year - 1, now.getMonth(), now.getDate() + 1)
  const rows = new Map<string, Row>()
  let first: Date | undefined
  for (const t of transactions) {
    if (t.cancelled) continue
    const time = new Date(t.time)
    if (!first || time < first) first = time
    const parent = parentOf.get(t.category)
    if (!parent?.spending || time.getFullYear() <= year - YEARS) continue
    const amount = convert(t.amount, currencyOf.get(t.accountId)!, currency)
    if (amount === undefined) return undefined
    const row = rows.get(parent.id) ?? { category: parent, byYear: new Map(), lastYearToDate: 0 }
    row.byYear.set(time.getFullYear(), (row.byYear.get(time.getFullYear()) ?? 0) - amount)
    if (time.getFullYear() === year - 1 && time < yearAgo) row.lastYearToDate -= amount
    rows.set(parent.id, row)
  }
  if (!first) return undefined
  const since = first
  // the first year counts only with at least its December, else a few days of data look like a cheap year
  const years = Array.from({ length: YEARS }, (_, i) => year - YEARS + 1 + i)
    .filter((y) => y > since.getFullYear() || (y === since.getFullYear() && since < new Date(y, 11, 1)))
  const list = [...rows.values()]
    .sort((a, b) => (b.byYear.get(year) ?? 0) - (a.byYear.get(year) ?? 0) || (b.byYear.get(year - 1) ?? 0) - (a.byYear.get(year - 1) ?? 0))
  return { rows: list, years, first: since }
}

type YearOverYearProps = {
  transactions: Transaction[] | undefined
  accounts: Account[]
  categories: Category[]
  convert: Convert
  currency: Currency
}

export function YearOverYear({ transactions, accounts, categories, convert, currency }: YearOverYearProps) {
  const [now] = useState(() => new Date())
  if (!transactions || !categories.length) return null
  const result = perYear(transactions, accounts, categories, convert, currency, now)
  if (!result) return null
  const { years, first } = result
  const year = now.getFullYear()
  // a change needs last year's data from 1 January; last year then shows only to date, the part it is taken against
  const comparable = years.includes(year - 1) && first <= new Date(year - 1, 0, 1, 23, 59)
  const columns: Column[] = [
    ...years.filter((y) => y < (comparable ? year - 1 : year))
      .map((y) => ({ key: String(y), label: String(y), value: (r: Row) => r.byYear.get(y) ?? 0, from: y === first.getFullYear() })),
    ...(comparable ? [{ key: 'before', label: `${year - 1} to date`, value: (r: Row) => r.lastYearToDate }] : []),
    { key: 'now', label: `${year} to date`, value: (r: Row) => r.byYear.get(year) ?? 0, current: true, from: year === first.getFullYear() },
  ]
  const rows = result.rows.filter((r) => columns.some((c) => c.value(r) > 0))
  if (!rows.length) return null
  const total = (c: Column) => rows.reduce((sum, r) => sum + c.value(r), 0)
  const [before, current] = columns.slice(-2)

  const change = (spent: number, base: number) => {
    if (base <= 0) return <td className={muted}>{spent > 0 ? 'new' : '—'}</td>
    const over = spent > base
    return (
      <td className={spent === base ? muted : over ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}>
        {spent === base ? '0%' : `${over ? '+' : '−'}${percentOf(Math.abs(spent - base) / base)}%`}
      </td>
    )
  }

  return (
    <section className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Spending per year</h2>
        {comparable && (
          <span className={muted}>Change: {dayMonth.format(new Date(year, 0, 1))} – {dayMonth.format(now)} against the same days of {year - 1}</span>
        )}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead className={muted}>
            <tr className="text-right [&>th]:pb-1 [&>th]:font-normal">
              <th className="text-left">Category</th>
              {columns.map((c) => (
                <th key={c.key}>
                  {c.label}
                  {c.from && (first.getMonth() > 0 || first.getDate() > 1) && (
                    <span className="block text-xs">from {dayMonth.format(first)}</span>
                  )}
                </th>
              ))}
              {comparable && <th className="w-20">Change</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((r) => (
              <tr key={r.category.id} className="text-right text-zinc-900 dark:text-zinc-100 [&>td]:py-1.5">
                <td className="text-left">
                  {/* this year's transactions in the category, on the Transactions page */}
                  <a href={`#/transactions?category=${r.category.id}&period=y:${year}`} className="hover:text-indigo-600 hover:underline dark:hover:text-indigo-400">
                    <span aria-hidden className="mr-2">{r.category.emoji}</span>
                    {r.category.label}
                  </a>
                </td>
                {columns.map((c) => (
                  <td key={c.key} className={c.current ? undefined : 'text-zinc-500 dark:text-zinc-400'}>{wholeMoney(c.value(r), currency)}</td>
                ))}
                {comparable && change(current.value(r), before.value(r))}
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-zinc-200 font-semibold dark:border-zinc-700">
            <tr className="text-right text-zinc-900 dark:text-zinc-100 [&>td]:pt-2">
              <td className="text-left">Total</td>
              {columns.map((c) => <td key={c.key}>{wholeMoney(total(c), currency)}</td>)}
              {comparable && change(total(current), total(before))}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
