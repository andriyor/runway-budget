import { useState } from 'react'
import { format, percentOf, wholeMoney } from '../lib/format'
import { usePhone } from '../lib/media'
import { dayKey, monthKey, quarterLabel, quarterMonths, quarterOf, weekDays, weekOfDay } from '../lib/periods'
import { median, quantile } from '../lib/stats'
import { card, muted } from '../lib/styles'
import type { Category, Currency, Transaction, Leaf } from '../lib/types'

// categories with their own color; the rest fold into one neutral segment
const SERIES = 7
const REST = 'rest'

type Segment = { id: string, label: string, color: string, value: number }
type Bar = { month: string, segments: Segment[], total: number }

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

const add = <K,>(map: Map<K, number>, key: K, value: number) => map.set(key, (map.get(key) ?? 0) + value)

const firstDay = (month: string) => new Date(`${month}-01T00:00:00`)
const shortMonth = new Intl.DateTimeFormat('uk-UA', { month: 'short', year: 'numeric' })
// month name alone, for the axis where the year sits on its own line
const monthOnly = new Intl.DateTimeFormat('uk-UA', { month: 'short' })
// a day of a week: weekday on the axis with the date below it
const date = (day: string) => new Date(`${day}T00:00:00`)
const weekday = new Intl.DateTimeFormat('uk-UA', { weekday: 'short' })
const dayMonth = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' })
const longDay = new Intl.DateTimeFormat('uk-UA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

// spending per month (or day, with bucket = dayKey) and top-level category; income, transfers and
// investments are left out
function spendingByMonth(list: Transaction[], leafById: Map<string, Leaf>, bucket = monthKey) {
  const months = new Map<string, Map<string, number>>()
  const totals = new Map<string, number>()
  for (const t of list) {
    const parent = leafById.get(t.category)?.parent
    if (!parent?.spending) continue
    const month = bucket(t.time)
    if (!months.has(month)) months.set(month, new Map())
    add(months.get(month)!, parent.id, -t.amount)
    add(totals, parent.id, -t.amount)
  }
  return { months, totals }
}

// one bar per month, oldest first, with a segment per series. Refunds can push a category below
// zero in a month; a stack only shows what was spent.
function stack(months: Map<string, Map<string, number>>, series: Omit<Segment, 'value'>[]): Bar[] {
  return [...months].sort(([a], [b]) => a.localeCompare(b)).map(([month, byCategory]) => {
    const values = new Map<string, number>()
    for (const [id, value] of byCategory) add(values, series.some((s) => s.id === id) ? id : REST, value)
    const segments = series.map((s) => ({ ...s, value: Math.max(0, values.get(s.id) ?? 0) })).filter((s) => s.value > 0)
    return { month, segments, total: sum(segments.map((s) => s.value)) }
  })
}

const inQuarter = (quarter: string, month: string) => quarterMonths(quarter).includes(month)

// the chart follows the period filter: a year or quarter shows its months, a month shows its year
// (so picking a bar keeps the bars around it), a week or day shows the week's 7 days; all time
// shows every month
function inScope(period: string, month: string) {
  if (period.startsWith('y:')) return month.startsWith(period.slice(2))
  if (period.startsWith('q:')) return inQuarter(period, month)
  if (period.startsWith('m:')) return month.startsWith(period.slice(2, 6))
  if (period.startsWith('w:')) return weekDays(period).includes(month)
  if (period.startsWith('d:')) return weekDays(weekOfDay(period.slice(2))).includes(month)
  return true
}

// phones show one quarter, since a year of bars is too thin to read: the picked quarter,
// the quarter of the picked month, or the latest one in scope. A week's 7 days always fit.
function phoneQuarter(period: string, latest: string | undefined) {
  if (period.startsWith('q:')) return period
  if (period.startsWith('m:')) return quarterOf(period.slice(2))
  return latest === undefined ? undefined : quarterOf(latest)
}

const Swatch = ({ color }: { color: string }) => (
  <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ background: color }} />
)

type MonthlySpendingProps = {
  list: Transaction[]
  currency: Currency
  leafById: Map<string, Leaf>
  // current period filter: which months are shown, and the picked one
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
  // store the median in Runway: monthly spending, or essential spending with essentialOnly
  onUseMedian?: (value: number) => void
}

// Spending per month split by category: the SERIES biggest categories over the whole range keep
// their own color in a fixed order, everything else folds into one neutral "Решта" segment.
// With a category or merchant selected, each bar holds only that, rescaled to show its trend.
export function MonthlySpending({ list, currency, leafById, period, onPick, selected, onSelect, merchant, onClearMerchant, essentialOnly, onUseMedian }: MonthlySpendingProps) {
  const [hover, setHover] = useState<{ month: string, series: string }>()
  const phone = usePhone()
  const [thisMonth] = useState(() => monthKey(new Date().toISOString()))

  // series: the biggest categories in a fixed color order, then "Решта"
  const parents = new Map<string, Category>([...leafById.values()].map((l) => [l.parent.id, l.parent]))
  // a picked week or day shows the week's 7 days, empty ones included; any other period shows months
  const week = period.startsWith('w:') ? period : period.startsWith('d:') ? weekOfDay(period.slice(2)) : undefined
  const days = week ? weekDays(week) : undefined
  const bucket = days ? dayKey : monthKey
  const { months, totals } = spendingByMonth(list, leafById, bucket)
  const top = [...totals].filter(([, x]) => x > 0).sort((a, b) => b[1] - a[1]).slice(0, SERIES)
  const series = [
    ...top.map(([id], i) => ({ id, label: parents.get(id)!.label, color: `var(--series-${i + 1})` })),
    { id: REST, label: 'Решта', color: 'var(--series-rest)' },
  ]
  const all = stack(months, series)
  const stacked = days ? days.map((d) => all.find((b) => b.month === d) ?? { month: d, segments: [], total: 0 }) : all

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
    color: series.find((s) => s.id === colorParent?.id)?.color ?? 'var(--series-rest)',
  }
  const inFocus = (t: Transaction) =>
    (!selectedParent || t.category === selected || leafById.get(t.category)?.parent.id === selected) &&
    (!merchant || t.merchant === merchant.key)
  const focusMonths = focus ? spendingByMonth(list.filter(inFocus), leafById, bucket).months : undefined
  const bars: Bar[] = focus
    ? stacked.map(({ month }) => {
        const value = Math.max(0, sum([...(focusMonths!.get(month)?.values() ?? [])]))
        return { month, segments: value > 0 ? [{ ...focus, value }] : [], total: value }
      })
    : stacked

  // the median covers the complete months in scope (the running one would pull it down);
  // bars, legend totals and the tooltip use the shown ones
  const scoped = bars.filter((b) => inScope(period, b.month))
  const complete = scoped.filter((b) => b.month !== thisMonth)
  // the median is a monthly figure, so a week of days has none
  const typical = !days && complete.length ? median(complete.map((b) => b.total)) : undefined
  // the usual range (middle half of the complete months), the lowest and the worst one; too few months make no range
  const spread = typical !== undefined && complete.length >= 4
    ? {
        low: quantile(complete.map((b) => b.total), 0.25),
        high: quantile(complete.map((b) => b.total), 0.75),
        lowest: complete.reduce((a, b) => (b.total < a.total ? b : a)),
        worst: complete.reduce((a, b) => (b.total > a.total ? b : a)),
      }
    : undefined
  const quarter = phone && !days ? phoneQuarter(period, scoped.at(-1)?.month) : undefined
  const isShown = (month: string) => inScope(period, month) && (!phone || days !== undefined || (quarter !== undefined && inQuarter(quarter, month)))
  const shown = bars.filter((b) => isShown(b.month))
  const shownStacked = stacked.filter((b) => isShown(b.month))
  if (!stacked.some((b) => b.total > 0)) return null

  // the scale includes the median so its line stays inside the plot; bars use 85% of the height at most
  const max = Math.max(...shown.map((b) => b.total), typical ?? 0)
  const height = (value: number) => `${(value / max) * 85}%`
  const seriesTotal = (id: string) => sum(shownStacked.map((b) => b.segments.find((s) => s.id === id)?.value ?? 0))
  const label = (month: string) => (days ? longDay.format(date(month)) : shortMonth.format(firstDay(month)))
  const active = hover && shown.find((b) => b.month === hover.month)
  const activeSegment = active?.segments.find((s) => s.id === hover!.series)
  // picking the month already selected goes back to all time, the day already selected to its week
  const pickMonth = (month: string) => {
    const key = days ? `d:${month}` : `m:${month}`
    onPick(period !== key ? key : days ? week! : '')
  }
  const toggle = (id: string) => onSelect(selected === id ? undefined : id)
  const legendButton = 'flex items-center gap-1.5 rounded-md px-1.5 py-0.5 hover:bg-zinc-100 aria-pressed:bg-indigo-50 aria-pressed:ring-1 aria-pressed:ring-indigo-200 dark:hover:bg-zinc-800 dark:aria-pressed:bg-indigo-950/40 dark:aria-pressed:ring-indigo-900'
  const legendContent = (color: string, text: string, amount: number) => (
    <>
      <Swatch color={color} />
      <span className="text-zinc-700 dark:text-zinc-300">{text}</span>
      <span className={`tabular-nums ${muted}`}>{format(amount, currency)}</span>
    </>
  )

  return (
    <section className={`${card} viz`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{`${essentialOnly ? 'Essential spending' : 'Spending'} per ${days ? 'day' : 'month'}`}</h2>
        {typical !== undefined && (
          <span className={`tabular-nums ${muted}`}>
            Медіана{focus ? ` · ${focus.label}` : ''}: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{format(typical, currency)}</span>
            {' '}за місяць · {complete.length} повних міс.{quarter && ` · показано ${quarterLabel(quarter)}`}
            {spread && (
              <span className="block sm:inline">
                {' '}· звично {wholeMoney(spread.low, currency)}–{wholeMoney(spread.high, currency)}
                {' '}· найменший {wholeMoney(spread.lowest.total, currency)} ({shortMonth.format(firstDay(spread.lowest.month))})
                {' '}· найгірший {wholeMoney(spread.worst.total, currency)} ({shortMonth.format(firstDay(spread.worst.month))})
              </span>
            )}
            {onUseMedian && (
              <button type="button" onClick={() => onUseMedian(typical)} className="ml-3 font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                {essentialOnly ? 'Use as essential spending in Runway' : 'Use as monthly spending in Runway'}
              </button>
            )}
          </span>
        )}
      </div>

      <ul className="-mx-1.5 mt-3 flex flex-wrap gap-x-2 gap-y-1 text-sm" aria-label="Legend">
        {/* categories with nothing in the shown months are left out, unless selected */}
        {series.filter((s) => seriesTotal(s.id) > 0 || s.id === selected).map((s) => (
          <li key={s.id} className={focus && focus.id !== s.id ? 'opacity-50' : undefined}>
            {/* "Решта" is several categories, so it cannot be selected */}
            {s.id === REST
              ? <span className="flex items-center gap-1.5 px-1.5 py-0.5">{legendContent(s.color, s.label, seriesTotal(s.id))}</span>
              : <button type="button" aria-pressed={selected === s.id} onClick={() => toggle(s.id)} className={legendButton}>{legendContent(s.color, s.label, seriesTotal(s.id))}</button>}
          </li>
        ))}
        {/* a focus without its own series entry (subcategory, merchant, small category) gets one to clear it */}
        {focus && !series.some((s) => s.id === focus.id) && (
          <li>
            <button type="button" aria-pressed onClick={() => (merchant ? onClearMerchant() : onSelect(undefined))} className={legendButton}>
              {legendContent(focus.color, focus.label, sum(shown.map((b) => b.total)))}
            </button>
          </li>
        )}
      </ul>

      <div className="relative mt-5" onMouseLeave={() => setHover(undefined)}>
        <div className="relative flex h-56 items-end gap-3 border-b border-zinc-200 dark:border-zinc-800">
          {/* the usual range: the middle half of the complete months */}
          {spread && spread.high > 0 && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bg-zinc-500/10 dark:bg-zinc-400/10"
              style={{ bottom: height(spread.low), height: `calc(${height(spread.high)} - ${height(spread.low)})` }}
            />
          )}
          {typical !== undefined && typical > 0 && (
            <div aria-hidden className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-zinc-500 dark:border-zinc-400" style={{ bottom: height(typical) }}>
              <span className="absolute -top-2.5 right-0 rounded bg-white px-1 text-[0.65rem] font-medium text-zinc-600 tabular-nums dark:bg-zinc-900 dark:text-zinc-300">
                медіана {wholeMoney(typical, currency)}
              </span>
            </div>
          )}
          {shown.map((b) => (
            <div key={b.month} className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              <button
                type="button"
                tabIndex={-1}
                onClick={() => pickMonth(b.month)}
                className="mb-1 cursor-pointer text-xs font-medium text-zinc-700 tabular-nums hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
              >
                {wholeMoney(b.total, currency)}
              </button>
              <div className="flex w-full max-w-16 flex-col-reverse gap-0.5" style={{ height: height(b.total) }}>
                {b.segments.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={`${label(b.month)}, ${s.label}: ${format(s.value, currency)}`}
                    onMouseEnter={() => setHover({ month: b.month, series: s.id })}
                    onFocus={() => setHover({ month: b.month, series: s.id })}
                    onBlur={() => setHover(undefined)}
                    onClick={() => (focus ? pickMonth(b.month) : s.id !== REST && toggle(s.id))}
                    className={`w-full min-h-px cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100 ${i === b.segments.length - 1 ? 'rounded-t-[4px]' : ''} ${hover && !(hover.month === b.month && hover.series === s.id) ? 'opacity-60' : ''}`}
                    style={{ flexGrow: s.value, flexBasis: 0, background: s.color }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-1.5 flex gap-3">
          {shown.map((b) => (
            <button
              key={b.month}
              type="button"
              aria-pressed={period === `m:${b.month}` || period === `d:${b.month}`}
              onClick={() => pickMonth(b.month)}
              className="min-w-0 flex-1 cursor-pointer truncate rounded-md py-0.5 text-center text-xs leading-tight text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 aria-pressed:bg-indigo-50 aria-pressed:font-semibold aria-pressed:text-indigo-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:aria-pressed:bg-indigo-950/40 dark:aria-pressed:text-indigo-300"
            >
              {days ? weekday.format(date(b.month)) : monthOnly.format(firstDay(b.month))}
              <span className="block text-[0.65rem] opacity-75">{days ? dayMonth.format(date(b.month)) : b.month.slice(0, 4)}</span>
            </button>
          ))}
        </div>

        {active && activeSegment && (
          <Tooltip
            month={label(active.month)}
            // the whole month's spending, also while a single category is shown
            monthTotal={stacked.find((b) => b.month === active.month)!.total}
            segment={activeSegment}
            left={(shown.indexOf(active) + 0.5) / shown.length}
            currency={currency}
          />
        )}
      </div>
    </section>
  )
}

function Tooltip({ month, monthTotal, segment, left, currency }: { month: string, monthTotal: number, segment: Segment, left: number, currency: Currency }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute top-0 z-10 w-max max-w-56 -translate-x-1/2 rounded-lg bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700"
      style={{ left: `clamp(7rem, ${left * 100}%, calc(100% - 7rem))` }}
    >
      <p className={muted}>{month} · {format(monthTotal, currency)}</p>
      <p className="mt-1 flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
        <Swatch color={segment.color} />
        <span className="truncate">{segment.label}</span>
      </p>
      <p className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
        {format(segment.value, currency)}
        <span className={`ml-1.5 font-normal ${muted}`}>{percentOf(segment.value / monthTotal)}%</span>
      </p>
    </div>
  )
}
