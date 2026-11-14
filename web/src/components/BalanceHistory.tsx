import { useEffect, useState, type KeyboardEvent } from 'react'
import { api } from '../lib/api'
import { format, wholeMoney } from '../lib/format'
import { card, muted } from '../lib/styles'
import type { Account, Convert, Currency, Transaction } from '../lib/types'

const dayLabel = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })

// local calendar day, so a late-evening purchase lands on the day it was made
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Total balance at the end of each day, rebuilt backwards from today's balances by undoing
// every later transaction: bank-synced ones and manual ± adjustments. Accounts without any stay flat.
// ponytail: today's NBU rate for every day, so currency moves don't show; needs historical rates if they matter
export function BalanceHistory({ accounts, convert, currency }: { accounts: Account[], convert: Convert, currency: Currency }) {
  const [list, setList] = useState<Transaction[]>()
  const [hover, setHover] = useState<number>()
  const [today] = useState(() => new Date())
  // refetch when an account is added, removed or changes balance (updatedAt), e.g. after an adjustment
  const ids = accounts.map((a) => `${a.id}@${a.updatedAt}`).join(',')

  useEffect(() => {
    if (!ids) return
    Promise.all(ids.split(',').map((key) => api<Transaction[]>(`/accounts/${key.split('@')[0]}/transactions`)))
      .then((all) => setList(all.flat()))
      .catch(() => setList([]))
  }, [ids])

  const total = accounts.reduce((sum, a) => sum + (convert(a.balance, a.currency, currency) ?? NaN), 0)
  if (!list?.length || Number.isNaN(total)) return null

  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]))
  const byDay = new Map<string, number>()
  let first = today
  for (const t of list) {
    const time = new Date(t.time)
    if (time < first) first = time
    byDay.set(dayKey(time), (byDay.get(dayKey(time)) ?? 0) + convert(t.amount, currencyOf.get(t.accountId)!, currency)!)
  }
  const points: Array<{ day: Date, value: number }> = []
  let running = total
  for (let d = today; dayKey(d) >= dayKey(first); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)) {
    points.push({ day: d, value: running })
    running -= byDay.get(dayKey(d)) ?? 0
  }
  points.reverse()
  if (points.length < 2) return null

  const values = points.map((p) => p.value)
  const low = Math.min(...values)
  const high = Math.max(...values)
  const pad = (high - low) * 0.1 || Math.abs(high) * 0.1 || 1
  const [min, max] = [low - pad, high + pad]
  const x = (i: number) => (i / (points.length - 1)) * 100
  const y = (v: number) => (1 - (v - min) / (max - min)) * 100
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join('')
  const active = hover === undefined ? undefined : points[hover]
  const change = total - points[0].value

  const step = (e: KeyboardEvent) => {
    const by = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
    if (!by) return
    e.preventDefault()
    setHover((h) => Math.min(points.length - 1, Math.max(0, (h ?? points.length - 1) + by)))
  }

  return (
    <section className={`${card} viz`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Balance over time</h2>
        <span className={`tabular-nums ${muted}`}>
          {change >= 0 ? '+' : '−'}{format(Math.abs(change), currency)} since {dayLabel.format(points[0].day)}
        </span>
      </div>

      <div className="mt-4 flex gap-2">
        <div className={`flex w-16 shrink-0 flex-col justify-between text-right text-xs tabular-nums ${muted}`} aria-hidden>
          <span>{wholeMoney(high, currency)}</span>
          <span>{wholeMoney(low, currency)}</span>
        </div>
        <div
          className="relative h-48 min-w-0 flex-1 cursor-crosshair rounded border-b border-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-800"
          tabIndex={0}
          role="img"
          aria-label={`Balance from ${format(points[0].value, currency)} on ${dayLabel.format(points[0].day)} to ${format(total, currency)} today. Arrow keys step through days.`}
          onMouseMove={(e) => {
            const box = e.currentTarget.getBoundingClientRect()
            setHover(Math.round(((e.clientX - box.left) / box.width) * (points.length - 1)))
          }}
          onMouseLeave={() => setHover(undefined)}
          onKeyDown={step}
          onBlur={() => setHover(undefined)}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
            <path d={`${line}L100,100L0,100Z`} fill="var(--series-1)" opacity={0.12} />
            <path d={line} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          {active && (
            <>
              <div aria-hidden className="pointer-events-none absolute inset-y-0 border-l border-zinc-400 dark:border-zinc-500" style={{ left: `${x(hover!)}%` }} />
              <div
                aria-hidden
                className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white dark:ring-zinc-900"
                style={{ left: `${x(hover!)}%`, top: `${y(active.value)}%`, background: 'var(--series-1)' }}
              />
              <div
                role="tooltip"
                className="pointer-events-none absolute top-0 z-10 w-max -translate-x-1/2 rounded-lg bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700"
                style={{ left: `clamp(5rem, ${x(hover!)}%, calc(100% - 5rem))` }}
              >
                <p className={muted}>{dayLabel.format(active.day)}</p>
                <p className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">{format(active.value, currency)}</p>
              </div>
            </>
          )}
        </div>
      </div>
      <div className={`mt-1.5 ml-18 flex justify-between text-xs ${muted}`} aria-hidden>
        <span>{dayLabel.format(points[0].day)}</span>
        <span>Today</span>
      </div>
    </section>
  )
}
