import { useState } from 'react'
import { format, percentOf, wholeMoney } from '../lib/format'
import { monthKey } from '../lib/periods'
import { card, muted } from '../lib/styles'
import type { Currency, Transaction, Leaf } from '../lib/types'

const SERIES = 7

const shortMonth = new Intl.DateTimeFormat('uk-UA', { month: 'short', year: 'numeric' })

type MonthlySpendingProps = {
  list: Transaction[]
  currency: Currency
  leafById: Map<string, Leaf>
  // current period filter, to highlight the picked month
  period: string
  // month key ("m:2026-10") or "" for all time, and category id, or undefined for none / the folded rest
  onPick: (period: string, category?: string) => void
}

// Spending per month split by category: the SERIES biggest categories over the whole range keep
// their own color in a fixed order, everything else folds into one neutral "Решта" segment.
export function MonthlySpending({ list, currency, leafById, period, onPick }: MonthlySpendingProps) {
  const [hover, setHover] = useState<{ month: string, series: string }>()
  const months = new Map<string, Map<string, number>>()
  const totals = new Map<string, number>()
  for (const t of list) {
    const parent = leafById.get(t.category)?.parent
    if (!parent?.spending) continue
    const month = monthKey(t.time)
    const byCategory = months.get(month) ?? new Map<string, number>()
    byCategory.set(parent.id, (byCategory.get(parent.id) ?? 0) - t.amount)
    months.set(month, byCategory)
    totals.set(parent.id, (totals.get(parent.id) ?? 0) - t.amount)
  }
  const parents = new Map([...leafById.values()].map((l) => [l.parent.id, l.parent]))
  const top = [...totals].filter(([, x]) => x > 0).sort((a, b) => b[1] - a[1]).slice(0, SERIES).map(([id]) => id)
  const series = [
    ...top.map((id, i) => ({ id, label: parents.get(id)!.label, color: `var(--series-${i + 1})` })),
    { id: 'rest', label: 'Решта', color: 'var(--series-rest)' },
  ]
  // refunds can push a category below zero in a month; a stack only shows what was spent
  const columns = [...months].sort(([a], [b]) => a.localeCompare(b)).map(([month, byCategory]) => {
    const values = new Map(series.map((s) => [s.id, 0]))
    for (const [id, x] of byCategory) values.set(top.includes(id) ? id : 'rest', values.get(top.includes(id) ? id : 'rest')! + x)
    const segments = series.map((s) => ({ ...s, value: Math.max(0, values.get(s.id)!) })).filter((s) => s.value > 0)
    return { month, segments, total: segments.reduce((sum, s) => sum + s.value, 0) }
  })
  const max = Math.max(...columns.map((c) => c.total))
  if (!(max > 0)) return null
  const seriesTotal = (id: string) => columns.reduce((sum, c) => sum + (c.segments.find((s) => s.id === id)?.value ?? 0), 0)
  const label = (month: string) => shortMonth.format(new Date(`${month}-01T00:00:00`))
  const active = hover && columns.find((c) => c.month === hover.month)
  const activeSegment = active?.segments.find((s) => s.id === hover!.series)
  // picking the month already selected goes back to all time
  const pickMonth = (month: string) => onPick(period === `m:${month}` ? '' : `m:${month}`)

  return (
    <section className={`${card} viz`}>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Spending per month</h2>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm" aria-label="Legend">
        {series.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-sm" style={{ background: s.color }} />
            <span className="text-zinc-700 dark:text-zinc-300">{s.label}</span>
            <span className={`tabular-nums ${muted}`}>{format(seriesTotal(s.id), currency)}</span>
          </li>
        ))}
      </ul>

      <div className="relative mt-5" onMouseLeave={() => setHover(undefined)}>
        <div className="flex h-56 items-end gap-3 border-b border-zinc-200 dark:border-zinc-800">
          {columns.map((c) => (
            <div key={c.month} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              <button
                type="button"
                tabIndex={-1}
                onClick={() => pickMonth(c.month)}
                className="mb-1 cursor-pointer text-xs font-medium text-zinc-700 tabular-nums hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
              >
                {wholeMoney(c.total, currency)}
              </button>
              <div className="flex w-full max-w-16 flex-col-reverse gap-0.5" style={{ height: `${(c.total / max) * 85}%` }}>
                {c.segments.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={`${label(c.month)}, ${s.label}: ${format(s.value, currency)}`}
                    onMouseEnter={() => setHover({ month: c.month, series: s.id })}
                    onFocus={() => setHover({ month: c.month, series: s.id })}
                    onBlur={() => setHover(undefined)}
                    onClick={() => onPick(`m:${c.month}`, s.id === 'rest' ? undefined : s.id)}
                    className={`w-full min-h-px cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100 ${i === c.segments.length - 1 ? 'rounded-t-[4px]' : ''} ${hover && !(hover.month === c.month && hover.series === s.id) ? 'opacity-60' : ''}`}
                    style={{ flexGrow: s.value, flexBasis: 0, background: s.color }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex gap-3">
          {columns.map((c) => (
            <button
              key={c.month}
              type="button"
              aria-pressed={period === `m:${c.month}`}
              onClick={() => pickMonth(c.month)}
              className="min-w-0 flex-1 cursor-pointer truncate rounded-md py-0.5 text-center text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 aria-pressed:bg-indigo-50 aria-pressed:font-semibold aria-pressed:text-indigo-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:aria-pressed:bg-indigo-950/40 dark:aria-pressed:text-indigo-300"
            >
              {label(c.month)}
            </button>
          ))}
        </div>

        {active && activeSegment && (
          <div
            role="tooltip"
            className="pointer-events-none absolute top-0 z-10 w-max max-w-56 -translate-x-1/2 rounded-lg bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700"
            style={{ left: `clamp(7rem, ${((columns.indexOf(active) + 0.5) / columns.length) * 100}%, calc(100% - 7rem))` }}
          >
            <p className={muted}>{label(active.month)} · {format(active.total, currency)}</p>
            <p className="mt-1 flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
              <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ background: activeSegment.color }} />
              <span className="truncate">{activeSegment.label}</span>
            </p>
            <p className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
              {format(activeSegment.value, currency)}
              <span className={`ml-1.5 font-normal ${muted}`}>{percentOf(activeSegment.value / active.total)}%</span>
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
