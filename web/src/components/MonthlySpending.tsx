import { useState } from 'react'
import { format, percentOf, wholeMoney } from '../lib/format'
import { usePhone } from '../lib/media'
import { monthKey, quarterLabel, quarterMonths, quarterOf } from '../lib/periods'
import { card, muted } from '../lib/styles'
import type { Currency, Transaction, Leaf } from '../lib/types'

const SERIES = 7

const median = (values: number[]) => {
  const sorted = values.toSorted((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const shortMonth = new Intl.DateTimeFormat('uk-UA', { month: 'short', year: 'numeric' })
// month name alone, for the axis where the year sits on its own line
const monthOnly = new Intl.DateTimeFormat('uk-UA', { month: 'short' })

type MonthlySpendingProps = {
  list: Transaction[]
  currency: Currency
  leafById: Map<string, Leaf>
  // current period filter, to highlight the picked month
  period: string
  // month key ("m:2026-10"), or "" for all time
  onPick: (period: string) => void
  // selected category or subcategory: the bars show only it
  selected?: string
  onSelect: (category?: string) => void
  // selected merchant: the bars show only its spending (within the selected category, if any)
  merchant?: { key: string, name: string }
  onClearMerchant: () => void
  // list holds only essential spending; the median is then the minimal month
  essentialOnly?: boolean
  // store the median in Runway: monthly spending, or the extreme-saving amount with essentialOnly
  onUseMedian?: (value: number) => void
}

// Spending per month split by category: the SERIES biggest categories over the whole range keep
// their own color in a fixed order, everything else folds into one neutral "Решта" segment.
// With a category or merchant selected, each bar holds only that, rescaled to show its trend.
export function MonthlySpending({ list, currency, leafById, period, onPick, selected, onSelect, merchant, onClearMerchant, essentialOnly, onUseMedian }: MonthlySpendingProps) {
  const [hover, setHover] = useState<{ month: string, series: string }>()
  const phone = usePhone()
  const [thisMonth] = useState(() => monthKey(new Date().toISOString()))
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
  const breakdown = [...months].sort(([a], [b]) => a.localeCompare(b)).map(([month, byCategory]) => {
    const values = new Map(series.map((s) => [s.id, 0]))
    for (const [id, x] of byCategory) values.set(top.includes(id) ? id : 'rest', values.get(top.includes(id) ? id : 'rest')! + x)
    const segments = series.map((s) => ({ ...s, value: Math.max(0, values.get(s.id)!) })).filter((s) => s.value > 0)
    return { month, segments, total: segments.reduce((sum, s) => sum + s.value, 0) }
  })

  // focus: the selected category (or subcategory) and/or merchant alone, on the same months,
  // colored like the category it belongs to in the legend
  const selectedLeaf = selected ? leafById.get(selected) : undefined
  const selectedParent = selectedLeaf?.parent ?? (selected ? parents.get(selected) : undefined)
  const merchantPurchase = merchant && list.find((t) => t.merchant === merchant.key && t.amount < 0)
  const colorParent = selectedParent ?? (merchantPurchase ? leafById.get(merchantPurchase.category)?.parent : undefined)
  const categoryLabel = selectedParent &&
    (selectedLeaf && selectedLeaf.id !== selectedParent.id ? `${selectedParent.label} › ${selectedLeaf.label}` : selectedParent.label)
  const focus = (selectedParent || merchant) && {
    id: merchant ? `merchant:${merchant.key}` : selected!,
    label: [merchant?.name, categoryLabel].filter(Boolean).join(' · '),
    color: series.find((x) => x.id === colorParent?.id)?.color ?? 'var(--series-rest)',
  }
  const focusByMonth = new Map<string, number>()
  if (focus) {
    for (const t of list) {
      const parent = leafById.get(t.category)?.parent
      if (!parent?.spending) continue
      if (selectedParent && t.category !== selected && parent.id !== selected) continue
      if (merchant && t.merchant !== merchant.key) continue
      focusByMonth.set(monthKey(t.time), (focusByMonth.get(monthKey(t.time)) ?? 0) - t.amount)
    }
  }
  const columns = focus
    ? breakdown.map(({ month }) => {
        const value = Math.max(0, focusByMonth.get(month) ?? 0)
        return { month, segments: value > 0 ? [{ ...focus, value }] : [], total: value }
      })
    : breakdown
  const inQuarter = (q: string | undefined, month: string) => q !== undefined && quarterMonths(q).includes(month)
  // the chart follows the period filter: a year or quarter shows its months, a month shows its year
  // (so picking a bar keeps the bars around it); all time and a week show every month
  const inScope = (month: string) =>
    period.startsWith('y:') ? month.startsWith(period.slice(2))
      : period.startsWith('q:') ? inQuarter(period, month)
        : period.startsWith('m:') ? month.startsWith(period.slice(2, 6))
          : true
  const scoped = columns.filter((c) => inScope(c.month))
  // the current month is still running, so it would pull the median down
  const complete = scoped.filter((c) => c.month !== thisMonth)
  const typical = complete.length ? median(complete.map((c) => c.total)) : undefined
  // the median covers every complete month in scope; bars, legend totals and tooltip use the shown ones
  // the selected quarter, or the quarter of the selected month; none for all time, a year or a week
  const quarter = period.startsWith('q:') ? period : period.startsWith('m:') ? quarterOf(period.slice(2)) : undefined
  // phones show one quarter, since a year of bars is too thin to read: that one, or the latest in scope
  const latest = scoped.at(-1)?.month
  const phoneQuarter = quarter ?? (latest ? quarterOf(latest) : undefined)
  const pick = <T extends { month: string }>(all: T[]) =>
    all.filter((c) => inScope(c.month) && (!phone || inQuarter(phoneQuarter, c.month)))
  const shown = pick(columns)
  const shownBreakdown = pick(breakdown)
  // the scale includes the median so its line stays inside the plot
  const max = Math.max(...shown.map((c) => c.total), typical ?? 0)
  if (!(Math.max(...breakdown.map((c) => c.total)) > 0)) return null
  const seriesTotal = (id: string) => shownBreakdown.reduce((sum, c) => sum + (c.segments.find((s) => s.id === id)?.value ?? 0), 0)
  const label = (month: string) => shortMonth.format(new Date(`${month}-01T00:00:00`))
  const active = hover && shown.find((c) => c.month === hover.month)
  const activeSegment = active?.segments.find((s) => s.id === hover!.series)
  // the whole month's spending, also while a single category is shown
  const monthTotal = active && breakdown.find((c) => c.month === active.month)!.total
  // picking the month already selected goes back to all time
  const pickMonth = (month: string) => onPick(period === `m:${month}` ? '' : `m:${month}`)
  const toggle = (id: string) => onSelect(selected === id ? undefined : id)
  const legendButton = 'flex items-center gap-1.5 rounded-md px-1.5 py-0.5 hover:bg-zinc-100 aria-pressed:bg-indigo-50 aria-pressed:ring-1 aria-pressed:ring-indigo-200 dark:hover:bg-zinc-800 dark:aria-pressed:bg-indigo-950/40 dark:aria-pressed:ring-indigo-900'

  return (
    <section className={`${card} viz`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{essentialOnly ? 'Essential spending per month' : 'Spending per month'}</h2>
        {typical !== undefined && (
          <span className={`tabular-nums ${muted}`}>
            Медіана{focus ? ` · ${focus.label}` : ''}: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{format(typical, currency)}</span>
            {' '}за місяць · {complete.length} повних міс.{phone && phoneQuarter && ` · показано ${quarterLabel(phoneQuarter)}`}
            {onUseMedian && (
              <button type="button" onClick={() => onUseMedian(typical)} className="ml-3 font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                {essentialOnly ? 'Use as extreme saving in Runway' : 'Use as monthly spending in Runway'}
              </button>
            )}
          </span>
        )}
      </div>
      <ul className="-mx-1.5 mt-3 flex flex-wrap gap-x-2 gap-y-1 text-sm" aria-label="Legend">
        {/* categories with nothing in the shown months are left out, unless selected */}
        {series.filter((s) => seriesTotal(s.id) > 0 || s.id === selected).map((s) => {
          const content = (
            <>
              <span aria-hidden className="size-2.5 rounded-sm" style={{ background: s.color }} />
              <span className="text-zinc-700 dark:text-zinc-300">{s.label}</span>
              <span className={`tabular-nums ${muted}`}>{format(seriesTotal(s.id), currency)}</span>
            </>
          )
          // "Решта" is several categories, so it cannot be selected
          return (
            <li key={s.id} className={focus && focus.id !== s.id ? 'opacity-50' : undefined}>
              {s.id === 'rest'
                ? <span className="flex items-center gap-1.5 px-1.5 py-0.5">{content}</span>
                : <button type="button" aria-pressed={selected === s.id} onClick={() => toggle(s.id)} className={legendButton}>{content}</button>}
            </li>
          )
        })}
        {focus && !series.some((s) => s.id === focus.id) && (
          <li>
            <button type="button" aria-pressed onClick={() => (merchant ? onClearMerchant() : onSelect(undefined))} className={legendButton}>
              <span aria-hidden className="size-2.5 rounded-sm" style={{ background: focus.color }} />
              <span className="text-zinc-700 dark:text-zinc-300">{focus.label}</span>
              <span className={`tabular-nums ${muted}`}>{format(shown.reduce((sum, c) => sum + c.total, 0), currency)}</span>
            </button>
          </li>
        )}
      </ul>

      <div className="relative mt-5" onMouseLeave={() => setHover(undefined)}>
        <div className="relative flex h-56 items-end gap-3 border-b border-zinc-200 dark:border-zinc-800">
          {typical !== undefined && typical > 0 && (
            // bars use 85% of the plot height at most, so the line sits on the same scale
            <div aria-hidden className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-zinc-500 dark:border-zinc-400" style={{ bottom: `${(typical / max) * 85}%` }}>
              <span className="absolute -top-2.5 right-0 rounded bg-white px-1 text-[0.65rem] font-medium text-zinc-600 tabular-nums dark:bg-zinc-900 dark:text-zinc-300">
                медіана {wholeMoney(typical, currency)}
              </span>
            </div>
          )}
          {shown.map((c) => (
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
                    onClick={() => (focus ? pickMonth(c.month) : s.id !== 'rest' && toggle(s.id))}
                    className={`w-full min-h-px cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100 ${i === c.segments.length - 1 ? 'rounded-t-[4px]' : ''} ${hover && !(hover.month === c.month && hover.series === s.id) ? 'opacity-60' : ''}`}
                    style={{ flexGrow: s.value, flexBasis: 0, background: s.color }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex gap-3">
          {shown.map((c) => (
            <button
              key={c.month}
              type="button"
              // a picked month, or every month of a picked quarter or year
              aria-pressed={period === `m:${c.month}` || (period.startsWith('q:') && inQuarter(period, c.month)) || period === `y:${c.month.slice(0, 4)}`}
              onClick={() => pickMonth(c.month)}
              className="min-w-0 flex-1 cursor-pointer truncate rounded-md py-0.5 text-center text-xs leading-tight text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 aria-pressed:bg-indigo-50 aria-pressed:font-semibold aria-pressed:text-indigo-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:aria-pressed:bg-indigo-950/40 dark:aria-pressed:text-indigo-300"
            >
              {monthOnly.format(new Date(`${c.month}-01T00:00:00`))}
              <span className="block text-[0.65rem] opacity-75">{c.month.slice(0, 4)}</span>
            </button>
          ))}
        </div>

        {active && activeSegment && (
          <div
            role="tooltip"
            className="pointer-events-none absolute top-0 z-10 w-max max-w-56 -translate-x-1/2 rounded-lg bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700"
            style={{ left: `clamp(7rem, ${((shown.indexOf(active) + 0.5) / shown.length) * 100}%, calc(100% - 7rem))` }}
          >
            <p className={muted}>{label(active.month)} · {format(monthTotal!, currency)}</p>
            <p className="mt-1 flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
              <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ background: activeSegment.color }} />
              <span className="truncate">{activeSegment.label}</span>
            </p>
            <p className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
              {format(activeSegment.value, currency)}
              <span className={`ml-1.5 font-normal ${muted}`}>{percentOf(activeSegment.value / monthTotal!)}%</span>
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
