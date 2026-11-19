import { useState } from 'react'
import { MerchantIcon } from '../../components/MerchantIcon'
import { format } from '../../lib/format'
import { card, muted } from '../../lib/styles'
import type { Account, Category, Convert, Currency, Transaction } from '../../lib/types'
import { MIN_MONTHS, MONTHS, recurring } from '../../lib/recurring'

const day = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' })

type RecurringProps = {
  transactions: Transaction[] | undefined
  accounts: Account[]
  categories: Category[]
  convert: Convert
  currency: Currency
}

export function Recurring({ transactions, accounts, categories, convert, currency }: RecurringProps) {
  const [now] = useState(() => new Date())
  // merchants unchecked to see the total without them; nothing is cancelled for real
  const [dropped, setDropped] = useState(new Set<string>())
  if (!transactions || !categories.length) return null
  const payments = recurring(transactions, accounts, categories, convert, currency, now)
  if (!payments?.length) return null
  const total = payments.reduce((sum, p) => sum + p.amount, 0)
  const saved = payments.reduce((sum, p) => sum + (dropped.has(p.latest.merchant) ? p.amount : 0), 0)
  const toggle = (merchant: string) =>
    setDropped((set) => {
      const next = new Set(set)
      if (!next.delete(merchant)) next.add(merchant)
      return next
    })

  return (
    <section className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Recurring payments</h2>
        <span className={`tabular-nums ${muted}`}>
          {payments.length} ·{' '}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{format(total, currency)}</span> per month
          committed
        </span>
      </div>
      <p className={`mt-1 ${muted}`}>
        Charged about once a month for a similar amount, in at least {MIN_MONTHS} of the last {MONTHS} months. Uncheck
        one to see the total without it.
      </p>
      {saved > 0 && (
        <p className="mt-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 tabular-nums dark:bg-emerald-950/40 dark:text-emerald-300">
          After cancelling {dropped.size}: <span className="font-semibold">{format(total - saved, currency)}</span> per
          month · {format(saved, currency)} saved per month, {format(saved * 12, currency)} a year
        </p>
      )}
      <ul className="mt-3 flex flex-col gap-2">
        {payments.map(({ latest, emoji, amount, next }) => (
          <li
            key={latest.merchant}
            className={`flex items-center gap-3 ${dropped.has(latest.merchant) ? 'opacity-50' : ''}`}
          >
            <input
              type="checkbox"
              checked={!dropped.has(latest.merchant)}
              onChange={() => toggle(latest.merchant)}
              aria-label={`Keep ${latest.description}`}
              className="size-4 shrink-0 accent-indigo-600"
            />
            <MerchantIcon domain={latest.merchantDomain} emoji={emoji} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-zinc-900 dark:text-zinc-100">{latest.description}</p>
              <p className={`tabular-nums ${muted}`}>
                last {day.format(new Date(latest.time))} · next ≈ {day.format(next)}
              </p>
            </div>
            <span className="shrink-0 text-sm font-medium text-zinc-900 tabular-nums dark:text-zinc-100">
              {format(amount, currency)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
