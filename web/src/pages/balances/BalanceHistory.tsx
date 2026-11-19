import { useState } from 'react'
import { Area, AreaChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { format, wholeMoney } from '../../lib/format'
import { card, muted } from '../../lib/styles'
import { dailyValues } from '../../lib/history'
import { dayKey } from '../../lib/periods'
import { Switch } from '../../components/Switch'
import type { Account, ConvertOn, Currency, Transaction } from '../../lib/types'

const dayLabel = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })

// Total balance at the end of each day (see dailyValues): bank-synced transactions and manual ± adjustments
// are undone backwards from today, and each day is valued at its own NBU rate, so currency moves show.
// Accounts without any transactions have no history, so they are left out unless asked for; then they are
// drawn flat at today's balance, which can invent past money and exchange-rate gains.
type BalanceHistoryProps = {
  accounts: Account[]
  transactions: Transaction[] | undefined
  convertOn: ConvertOn
  currency: Currency
}

export function BalanceHistory({ accounts, transactions, convertOn, currency }: BalanceHistoryProps) {
  const [today] = useState(() => new Date())
  const [withUntracked, setWithUntracked] = useState(false)

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

  return (
    <section className={`${card} viz`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Balance over time</h2>
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
      </div>
      {untracked.length > 0 && (
        <div className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm ${muted}`}>
          <span>
            {withUntracked
              ? `${untracked.length} ${untracked.length === 1 ? 'account' : 'accounts'} without history drawn flat at today's balance`
              : `${untracked.length} ${untracked.length === 1 ? 'account' : 'accounts'} without history left out, ≈ ${wholeMoney(untrackedTotal, currency)}`}
          </span>
          <Switch checked={withUntracked} onChange={setWithUntracked} title={untracked.map((a) => a.name).join(', ')}>
            Include them
          </Switch>
        </div>
      )}

      <div
        className="mt-3 h-48"
        onMouseDown={(e) => e.preventDefault()}
        aria-label={`Balance from ${format(points[0].value, currency)} on ${dayLabel.format(points[0].day)} to ${format(total, currency)} today. Arrow keys step through days.`}
      >
        <ResponsiveContainer>
          <AreaChart data={points} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
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
    </section>
  )
}
