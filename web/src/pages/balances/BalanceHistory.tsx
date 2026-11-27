import { useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { format, wholeMoney } from '../../lib/format'
import { card, muted } from '../../lib/styles'
import { dailyValues } from '../../lib/history'
import { dayInPeriod, dayKey } from '../../lib/periods'
import { Switch } from '../../components/Switch'
import type { Account, ConvertOn, Currency, Transaction } from '../../lib/types'

const dayLabel = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })

// Total balance at the end of each day (see dailyValues): bank-synced transactions and manual ± adjustments
// are undone backwards from today, and each day is valued at its own NBU rate, so currency moves show.
// the "include accounts without history" switch, kept across visits on both pages that show the chart
const WITH_UNTRACKED_KEY = 'balanceWithUntracked'
function readWithUntracked() {
  try {
    return localStorage.getItem(WITH_UNTRACKED_KEY) === 'true'
  } catch {
    return false
  }
}

// Accounts without any transactions have no history, so they are left out unless asked for; then they are
// drawn flat at today's balance, which can invent past money and exchange-rate gains.
// With onPick (Transactions), the chart shades the picked period and shows its change; dragging across it
// picks a range, and clicking picks a day (a second click extends it to a range, the same day again goes
// back to its month).
type BalanceHistoryProps = {
  accounts: Account[]
  transactions: Transaction[] | undefined
  convertOn: ConvertOn
  currency: Currency
  // the picked period key ('' is all time), and how to pick another
  period?: string
  onPick?: (period: string) => void
}

export function BalanceHistory({ accounts, transactions, convertOn, currency, period, onPick }: BalanceHistoryProps) {
  const [today] = useState(() => new Date())
  const [withUntracked, setWithUntracked] = useState(readWithUntracked)
  function pickWithUntracked(on: boolean) {
    setWithUntracked(on)
    try {
      localStorage.setItem(WITH_UNTRACKED_KEY, String(on))
    } catch {
      // private mode: lasts until reload
    }
  }
  // indexes while dragging
  const [drag, setDrag] = useState<[number, number]>()
  // the same, read by the handlers: a quick click's mouseup can arrive before the mousedown's render
  const dragRef = useRef<[number, number]>(undefined)
  const chartBox = useRef<HTMLDivElement>(null)
  const setDragging = (d: [number, number] | undefined) => {
    dragRef.current = d
    setDrag(d)
  }

  const untracked = accounts.filter((a) => a.transactionCount === 0)
  const shown = withUntracked ? accounts : accounts.filter((a) => a.transactionCount > 0)
  const todayKey = dayKey(today.toISOString())
  const untrackedTotal = untracked.reduce(
    (sum, a) => sum + (convertOn(a.balance, a.currency, currency, todayKey) ?? 0),
    0,
  )
  const days = transactions?.length ? dailyValues(shown, transactions, convertOn, currency, today) : undefined
  if (!days || days.length < 2) return null
  const points = days.map((d, i) => ({ i, day: new Date(`${d.day}T00:00:00`), value: d.value }))
  const total = points.at(-1)!.value
  // what rate moves added to or took from the foreign-currency balances over the whole range
  const fromRates = days.reduce((sum, d) => sum + d.gain, 0)

  const values = points.map((p) => p.value)
  const low = Math.min(...values)
  const high = Math.max(...values)
  // the extremes get a dot on the line and a guide with its label; the last one wins a tie
  // a flat line has one extreme, not two on top of each other
  const levels = high === low ? [high] : [high, low]
  const pad = (high - low) * 0.1 || Math.abs(high) * 0.1 || 1
  const change = total - points[0].value
  const last = points.length - 1

  // the day under the pointer, from its x: the plot spans the whole width (no side margins). Recharts' own
  // active index lags a frame behind the pointer, so a quick click or a tap would miss
  const at = (_: unknown, e: React.MouseEvent) => {
    const box = chartBox.current?.getBoundingClientRect()
    if (!box?.width) return undefined
    return Math.min(last, Math.max(0, Math.round(((e.clientX - box.left) / box.width) * last)))
  }
  const pick = (a: number, b: number) => {
    const [from, to] = [days[Math.min(a, b)].day, days[Math.max(a, b)].day]
    onPick?.(from === to ? `d:${from}` : `r:${from}..${to}`)
  }
  // the picked period's first and last day on the chart; none for all time
  const inside = period ? days.flatMap((d, i) => (dayInPeriod(d.day, period) ? [i] : [])) : []
  const range = inside.length ? { from: inside[0], to: inside.at(-1)! } : undefined
  // a range's change counts from the end of the day before it
  const rangeChange = range && days[range.to].value - days[Math.max(0, range.from - 1)].value
  const rangeRates = range && days.slice(range.from, range.to + 1).reduce((sum, d) => sum + d.gain, 0)
  const shade = drag ?? (range && [range.from, range.to])

  // a press without moving: picks that day, extends a picked day to a range, or goes back to its month
  const clickDay = (i: number) => {
    if (period?.startsWith('d:') && range) {
      if (i === range.from) onPick?.(`m:${days[i].day.slice(0, 7)}`)
      else pick(range.from, i)
    } else pick(i, i)
  }

  return (
    <section className={`${card} viz`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Balance over time</h2>
        {range && rangeChange !== undefined ? (
          <span className={`flex flex-wrap items-baseline gap-x-3 tabular-nums ${muted}`}>
            <span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {rangeChange >= 0 ? '+' : '−'}
                {format(Math.abs(rangeChange), currency)}
              </span>{' '}
              {range.from === range.to
                ? `on ${dayLabel.format(points[range.from].day)}`
                : `from ${dayLabel.format(points[range.from].day)} to ${dayLabel.format(points[range.to].day)}`}
              {Math.round(rangeRates!) !== 0 &&
                ` · ${rangeRates! >= 0 ? '+' : '−'}${format(Math.abs(rangeRates!), currency)} from exchange rates`}
            </span>
          </span>
        ) : (
          <span className={`tabular-nums ${muted}`}>
            {change >= 0 ? '+' : '−'}
            {format(Math.abs(change), currency)} since {dayLabel.format(points[0].day)}
            {Math.round(fromRates) !== 0 && (
              <span title="What exchange rate moves added to or took from your USD and EUR balances">
                {' '}
                · {fromRates >= 0 ? '+' : '−'}
                {format(Math.abs(fromRates), currency)} from exchange rates
              </span>
            )}
          </span>
        )}
      </div>
      {untracked.length > 0 && (
        <div className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm ${muted}`}>
          <span>
            {withUntracked
              ? `${untracked.length} ${untracked.length === 1 ? 'account' : 'accounts'} without history drawn flat at today's balance`
              : `${untracked.length} ${untracked.length === 1 ? 'account' : 'accounts'} without history left out, ≈ ${wholeMoney(untrackedTotal, currency)}`}
          </span>
          <Switch checked={withUntracked} onChange={pickWithUntracked} title={untracked.map((a) => a.name).join(', ')}>
            Include them
          </Switch>
        </div>
      )}

      <div
        ref={chartBox}
        className="mt-3 h-48"
        onMouseDown={(e) => e.preventDefault()}
        aria-label={`Balance from ${format(points[0].value, currency)} on ${dayLabel.format(points[0].day)} to ${format(total, currency)} today. Arrow keys step through days.`}
      >
        <ResponsiveContainer>
          <AreaChart
            data={points}
            margin={{ top: 10, right: 0, bottom: 0, left: 0 }}
            className={onPick ? 'cursor-crosshair' : undefined}
            onMouseDown={(s, e) => {
              const i = onPick && at(s, e)
              if (i !== undefined) setDragging([i, i])
            }}
            onMouseMove={(s, e) => {
              const i = at(s, e)
              const d = dragRef.current
              if (d && i !== undefined && i !== d[1]) setDragging([d[0], i])
            }}
            onMouseUp={() => {
              const d = dragRef.current
              if (d) {
                if (d[0] !== d[1]) pick(d[0], d[1])
                else clickDay(d[0])
              }
              setDragging(undefined)
            }}
            onMouseLeave={() => setDragging(undefined)}
          >
            <XAxis
              dataKey="i"
              type="number"
              domain={[0, last]}
              ticks={[0, last]}
              tickLine={false}
              fontSize={12}
              tickFormatter={(i: number) => (i === last ? 'Today' : dayLabel.format(points[0].day))}
            />
            <YAxis hide domain={[low - pad, high + pad]} />
            {levels.map((v, n) => (
              <ReferenceLine
                key={v}
                y={v}
                strokeDasharray="3 3"
                label={{
                  value: wholeMoney(v, currency),
                  position: n ? 'insideBottomLeft' : 'insideTopLeft',
                  fontSize: 12,
                }}
              />
            ))}
            <Tooltip
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as (typeof points)[number] | undefined
                if (!active || !p) return null
                return (
                  <div className="w-max rounded-lg bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700">
                    <p className={muted}>{dayLabel.format(p.day)}</p>
                    <p className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
                      {format(p.value, currency)}
                    </p>
                  </div>
                )
              }}
            />
            {shade &&
              (shade[0] === shade[1] ? (
                <ReferenceLine x={shade[0]} stroke="var(--series-1)" strokeOpacity={0.6} />
              ) : (
                <ReferenceArea
                  x1={Math.min(...shade)}
                  x2={Math.max(...shade)}
                  fill="var(--series-1)"
                  fillOpacity={0.15}
                  strokeOpacity={0}
                />
              ))}
            <Area
              dataKey="value"
              type="linear"
              stroke="var(--series-1)"
              strokeWidth={2}
              fill="var(--series-1)"
              fillOpacity={0.12}
              baseValue="dataMin"
            />
            {levels.map((v) => (
              <ReferenceDot key={v} x={values.lastIndexOf(v)} y={v} r={4} fill="var(--series-1)" stroke="white" />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {onPick && <p className={`mt-1 text-xs ${muted}`}>Drag across the chart to pick a range, or click a day.</p>}
    </section>
  )
}
