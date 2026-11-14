import { useState } from 'react'
import { Bar, BarChart, LabelList, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, type LabelListEntry, type XAxisTickContentProps } from 'recharts'
import { format, percentOf, wholeMoney } from '../../lib/format'
import { usePhone } from '../../lib/media'
import { dayKey, monthKey, quarterLabel, quarterMonths, quarterOf, weekDays, weekOfDay } from '../../lib/periods'
import { median, quantile } from '../../lib/stats'
import { card, muted } from '../../lib/styles'
import type { Category, Currency, Transaction, Leaf } from '../../lib/types'

// categories with their own color; the rest fold into one neutral segment
const SERIES = 7
const REST = 'rest'

type Segment = { id: string, label: string, color: string, value: number }
type MonthBar = { month: string, segments: Segment[], total: number }
// one chart row per bar: segment values by series id, and the whole month's spending for the tooltip
type Row = { month: string, values: Record<string, number>, total: number, monthTotal: number }

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
function stack(months: Map<string, Map<string, number>>, series: Omit<Segment, 'value'>[]): MonthBar[] {
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
  // month key ("m:2026-10"), or a day ("d:…") or its week ("w:…") in the week view
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
  const bars: MonthBar[] = focus
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

  const max = Math.max(...shown.map((b) => b.total), typical ?? 0)
  const rows: Row[] = shown.map((b) => ({
    month: b.month,
    values: Object.fromEntries(b.segments.map((s) => [s.id, s.value])),
    total: b.total,
    monthTotal: stacked.find((m) => m.month === b.month)!.total,
  }))
  const barSeries = focus ? [focus] : series
  const segmentsOf = new Map(barSeries.map((s) => [s.id, s]))
  const topSeries = (row: Row) => barSeries.findLast((s) => row.values[s.id] > 0)?.id
  const seriesTotal = (id: string) => sum(shownStacked.map((b) => b.segments.find((s) => s.id === id)?.value ?? 0))
  const label = (month: string) => (days ? longDay.format(date(month)) : shortMonth.format(firstDay(month)))
  // picking the month already selected keeps it; the day already selected goes back to its week
  const pickMonth = (month: string) => {
    const key = days ? `d:${month}` : `m:${month}`
    onPick(period === key && days ? week! : key)
  }
  const isPicked = (month: string) => period === `m:${month}` || period === `d:${month}`
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

      <div className="mt-5 h-64" onMouseDown={(e) => e.preventDefault()}>
        <ResponsiveContainer>
          <BarChart data={rows} margin={{ top: 20, right: 0, bottom: 0, left: 0 }} barCategoryGap="15%">
            <XAxis dataKey="month" interval={0} height={36} tickLine={false} tick={(props: XAxisTickContentProps) => (
              <g transform={`translate(${props.x},${props.y})`} className="cursor-pointer" onClick={() => pickMonth(String(props.payload.value))}>
                <text textAnchor="middle" dy={12} fontSize={12} fontWeight={isPicked(String(props.payload.value)) ? 700 : 400} fill="currentColor">
                  {days ? weekday.format(date(String(props.payload.value))) : monthOnly.format(firstDay(String(props.payload.value)))}
                </text>
                <text textAnchor="middle" dy={26} fontSize={10} fill="currentColor" opacity={0.7}>
                  {days ? dayMonth.format(date(String(props.payload.value))) : String(props.payload.value).slice(0, 4)}
                </text>
              </g>
            )} />
            {/* bars use 85% of the height at most; the scale includes the median so its line stays inside */}
            <YAxis hide domain={[0, max / 0.85]} />
            {/* the usual range: the middle half of the complete months */}
            {spread && spread.high > 0 && <ReferenceArea y1={spread.low} y2={spread.high} fillOpacity={0.1} />}
            {typical !== undefined && typical > 0 && (
              <ReferenceLine y={typical} strokeDasharray="4 4" label={{ value: `медіана ${wholeMoney(typical, currency)}`, position: 'insideTopRight', fontSize: 11 }} />
            )}
            <Tooltip shared={false} cursor={false} content={({ active, payload }) => {
              const item = payload?.[0]
              const segment = item && segmentsOf.get(String(item.name))
              if (!active || !segment) return null
              const row = item.payload as Row
              return <SegmentTooltip month={label(row.month)} monthTotal={row.monthTotal} segment={{ ...segment, value: Number(item.value) }} currency={currency} />
            }} />
            {barSeries.map((s) => (
              <Bar
                key={s.id}
                name={s.id}
                stackId="month"
                dataKey={(r: Row) => r.values[s.id] ?? 0}
                fill={s.color}
                className="cursor-pointer"
                onClick={(item) => {
                  const month = (item.payload as Row).month
                  if (focus) pickMonth(month)
                  else if (s.id !== REST) toggle(s.id)
                }}
              >
                {/* the month's total rides on the topmost segment of its stack */}
                <LabelList position="top" fontSize={12} fill="currentColor"
                  valueAccessor={(entry: LabelListEntry) => {
                    const row = entry.payload as Row | undefined
                    return row && topSeries(row) === s.id ? wholeMoney(row.total, currency) : undefined
                  }} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

function SegmentTooltip({ month, monthTotal, segment, currency }: { month: string, monthTotal: number, segment: Segment, currency: Currency }) {
  return (
    <div className="w-max max-w-56 rounded-lg bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700">
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
