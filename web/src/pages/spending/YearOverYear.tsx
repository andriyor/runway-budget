import { ErrorText } from '../../components/ErrorText'
import { useApi } from '../../lib/api'
import { percentOf, wholeMoney } from '../../lib/format'
import { card, muted } from '../../lib/styles'
import type { Category, Currency, SpendingPerYear, Transaction } from '../../lib/types'

const dayMonth = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' })
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

type Row = SpendingPerYear['rows'][number] & { info: Category }
// a table column: a past year, last year to date (when comparable) or this year so far, the last one;
// from marks the column of the year the data starts in
type Column = { key: string; label: string; value: (r: Row) => number; current?: boolean; from?: boolean }

type YearOverYearProps = {
  // only to wait for them; the API does the summing
  transactions: Transaction[] | undefined
  categories: Category[]
  currency: Currency
}

export function YearOverYear({ transactions, categories, currency }: YearOverYearProps) {
  const path = `/stats/spending-per-year?currency=${currency}&tz=${encodeURIComponent(timeZone)}`
  // waits for the transactions to load; a write that changes them refetches it too (see api)
  const { data: result, error } = useApi<SpendingPerYear>(path, transactions !== undefined)
  if (error)
    return (
      <section className={card}>
        <ErrorText>{`Spending per year: ${error.message}`}</ErrorText>
      </section>
    )
  if (!result?.first || !categories.length) return null
  const { years, comparable } = result
  const now = new Date(`${result.today}T00:00`)
  const first = new Date(`${result.first}T00:00`)
  const year = now.getFullYear()
  const columns: Column[] = [
    ...years
      .filter((y) => y < (comparable ? year - 1 : year))
      .map((y) => ({
        key: String(y),
        label: String(y),
        value: (r: Row) => r.byYear[y] ?? 0,
        from: y === first.getFullYear(),
      })),
    ...(comparable ? [{ key: 'before', label: `${year - 1} to date`, value: (r: Row) => r.lastYearToDate }] : []),
    {
      key: 'now',
      label: `${year} to date`,
      value: (r: Row) => r.byYear[year] ?? 0,
      current: true,
      from: year === first.getFullYear(),
    },
  ]
  const byId = new Map(categories.map((c) => [c.id, c]))
  const rows = result.rows
    .flatMap((r) => {
      const info = byId.get(r.category)
      return info ? [{ ...r, info }] : []
    })
    .filter((r) => columns.some((c) => c.value(r) > 0))
  if (!rows.length) return null
  const total = (c: Column) => rows.reduce((sum, r) => sum + c.value(r), 0)
  const [before, current] = columns.slice(-2)

  const change = (spent: number, base: number) => {
    if (base <= 0) return <td className={muted}>{spent > 0 ? 'new' : '—'}</td>
    const over = spent > base
    return (
      <td
        className={
          spent === base ? muted : over ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'
        }
      >
        {spent === base ? '0%' : `${over ? '+' : '−'}${percentOf(Math.abs(spent - base) / base)}%`}
      </td>
    )
  }

  return (
    <section className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Spending per year</h2>
        {comparable && (
          <span className={muted}>
            Change: {dayMonth.format(new Date(year, 0, 1))} – {dayMonth.format(now)} against the same days of {year - 1}
          </span>
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
              <tr key={r.info.id} className="text-right text-zinc-900 dark:text-zinc-100 [&>td]:py-1.5">
                <td className="text-left">
                  {/* this year's transactions in the category, on the Transactions page */}
                  <a
                    href={`#/transactions?category=${r.info.id}&period=y:${year}`}
                    className="hover:text-indigo-600 hover:underline dark:hover:text-indigo-400"
                  >
                    <span aria-hidden className="mr-2">
                      {r.info.emoji}
                    </span>
                    {r.info.label}
                  </a>
                </td>
                {columns.map((c) => (
                  <td key={c.key} className={c.current ? undefined : 'text-zinc-500 dark:text-zinc-400'}>
                    {wholeMoney(c.value(r), currency)}
                  </td>
                ))}
                {comparable && change(current.value(r), before.value(r))}
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-zinc-200 font-semibold dark:border-zinc-700">
            <tr className="text-right text-zinc-900 dark:text-zinc-100 [&>td]:pt-2">
              <td className="text-left">Total</td>
              {columns.map((c) => (
                <td key={c.key}>{wholeMoney(total(c), currency)}</td>
              ))}
              {comparable && change(total(current), total(before))}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
