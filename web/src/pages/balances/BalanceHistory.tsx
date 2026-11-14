import { useRef, useState, type KeyboardEvent } from 'react'
import uPlot from 'uplot'
import { UPlotChart } from '../../components/UPlotChart'
import { cssVar, textColor } from '../../lib/canvas'
import { format, wholeMoney } from '../../lib/format'
import { card, muted } from '../../lib/styles'
import { dailyValues } from '../../lib/history'
import type { Account, ConvertOn, Currency, Transaction } from '../../lib/types'

const dayLabel = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })

// Total balance at the end of each day (see dailyValues): bank-synced transactions and manual ± adjustments
// are undone backwards from today, and each day is valued at its own NBU rate, so currency moves show.
// Accounts without any transactions stay flat in their own currency.
type BalanceHistoryProps = { accounts: Account[], transactions: Transaction[] | undefined, convertOn: ConvertOn, currency: Currency }

export function BalanceHistory({ accounts, transactions, convertOn, currency }: BalanceHistoryProps) {
  // the day under the cursor and its x position, for the tooltip
  const [hover, setHover] = useState<{ i: number, left: number }>()
  const [today] = useState(() => new Date())
  const chart = useRef<uPlot>(undefined)

  const days = transactions?.length ? dailyValues(accounts, transactions, convertOn, currency, today) : undefined
  if (!days || days.length < 2) return null
  const points = days.map((d) => ({ day: new Date(`${d.day}T00:00:00`), value: d.value }))
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
  const active = hover && points[hover.i]
  const change = total - points[0].value

  // guides, labels and dots for the extremes, drawn on the canvas over the line
  const drawExtremes = (u: uPlot) => {
    const { ctx, bbox } = u
    const px = uPlot.pxRatio
    ctx.save()
    ctx.font = `${12 * px}px system-ui, sans-serif`
    levels.forEach((v, i) => {
      const y = u.valToPos(v, 'y', true)
      ctx.strokeStyle = textColor(u)
      ctx.globalAlpha = 0.35
      ctx.setLineDash([3 * px, 3 * px])
      ctx.beginPath()
      ctx.moveTo(bbox.left, y)
      ctx.lineTo(bbox.left + bbox.width, y)
      ctx.stroke()
      ctx.globalAlpha = 0.7
      ctx.fillStyle = textColor(u)
      ctx.textBaseline = i ? 'top' : 'bottom'
      ctx.fillText(wholeMoney(v, currency), bbox.left + 4 * px, y + (i ? 3 : -3) * px)
      ctx.globalAlpha = 1
      ctx.fillStyle = cssVar(u, '--series-1')
      ctx.beginPath()
      ctx.arc(u.valToPos(values.lastIndexOf(v), 'x', true), y, 4 * px, 0, 2 * Math.PI)
      ctx.fill()
    })
    ctx.restore()
  }

  // arrow keys move the cursor a day at a time, starting from today
  const step = (e: KeyboardEvent) => {
    const by = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
    const u = chart.current
    if (!by || !u) return
    e.preventDefault()
    const i = Math.min(points.length - 1, Math.max(0, (hover?.i ?? points.length - 1) + by))
    u.setCursor({ left: u.valToPos(i, 'x'), top: u.valToPos(values[i], 'y') })
  }

  return (
    <section className={`${card} viz`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Balance over time</h2>
        <span className={`tabular-nums ${muted}`}>
          {change >= 0 ? '+' : '−'}{format(Math.abs(change), currency)} since {dayLabel.format(points[0].day)}
          {Math.round(fromRates) !== 0 && (
            <span title="What exchange rate moves added to or took from your USD and EUR balances">
              {' '}· {fromRates >= 0 ? '+' : '−'}{format(Math.abs(fromRates), currency)} from exchange rates
            </span>
          )}
        </span>
      </div>

      <div
        className="relative mt-3 rounded outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        tabIndex={0}
        role="img"
        aria-label={`Balance from ${format(points[0].value, currency)} on ${dayLabel.format(points[0].day)} to ${format(total, currency)} today. Arrow keys step through days.`}
        onKeyDown={step}
        onBlur={() => chart.current?.setCursor({ left: -10, top: -10 })}
      >
        <UPlotChart
          className="h-40"
          chartRef={chart}
          deps={`${currency}:${values.join(',')}`}
          data={[points.map((_, i) => i), values]}
          options={{
            padding: [12, 0, 0, 0],
            legend: { show: false },
            axes: [{ show: false }, { show: false }],
            scales: { x: { time: false }, y: { range: [low - pad, high + pad] } },
            cursor: { y: false, points: { size: 10, fill: (u) => cssVar(u, '--series-1') } },
            series: [
              {},
              {
                stroke: (u) => cssVar(u, '--series-1'),
                fill: (u) => `${cssVar(u, '--series-1')}1f`,
                width: 2,
                points: { show: false },
              },
            ],
            hooks: {
              draw: [drawExtremes],
              setCursor: [(u) => { const i = u.cursor.idx; setHover(i == null ? undefined : { i, left: u.valToPos(i, 'x') }) }],
            },
          }}
        />
        {active && (
          <div
            role="tooltip"
            className="pointer-events-none absolute top-0 z-10 w-max -translate-x-1/2 rounded-lg bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700"
            style={{ left: `clamp(5rem, ${hover!.left}px, calc(100% - 5rem))` }}
          >
            <p className={muted}>{dayLabel.format(active.day)}</p>
            <p className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">{format(active.value, currency)}</p>
          </div>
        )}
      </div>
      <div className={`mt-1.5 flex justify-between text-xs ${muted}`} aria-hidden>
        <span>{dayLabel.format(points[0].day)}</span>
        <span>Today</span>
      </div>
    </section>
  )
}
