import { useState } from 'react'
import { MerchantIcon } from './MerchantIcon'
import { format } from '../lib/format'
import { monthKey } from '../lib/periods'
import { median } from '../lib/stats'
import { card, muted } from '../lib/styles'
import type { Account, Category, Convert, Currency, Transaction } from '../lib/types'

// complete months looked at, besides the running one
const MONTHS = 6
// charged in at least this many of those months
const MIN_MONTHS = 3
// most charges within this share of their median amount
const SIMILAR = 0.25
// a payment not charged for this long has likely stopped
const ACTIVE_DAYS = 40

const day = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' })

type Payment = { latest: Transaction, emoji: string, amount: number, next: Date }

// Payments that repeat monthly: a merchant charged in at least MIN_MONTHS of the last MONTHS complete
// months (or the running one), about once a month, mostly for a similar amount, and charged within
// ACTIVE_DAYS. The monthly amount is the latest charge, so a raised price counts. Spending categories only; cancelled pairs skipped.
// ponytail: monthly cycles only; yearly or weekly payments need their own period detection
function recurring(transactions: Transaction[], accounts: Account[], categories: Category[], convert: Convert, currency: Currency, now: Date) {
  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]))
  const parentOf = new Map(categories.flatMap((c) => [[c.id, c] as const, ...c.subcategories.map((s) => [s.id, c] as const)]))
  const since = new Date(now.getFullYear(), now.getMonth() - MONTHS, 1)
  // merchant key → its charges in the window, in the budget currency
  const charges = new Map<string, Array<{ t: Transaction, amount: number }>>()
  for (const t of transactions) {
    if (t.cancelled || t.amount >= 0 || new Date(t.time) < since || !parentOf.get(t.category)?.spending) continue
    const amount = convert(-t.amount, currencyOf.get(t.accountId)!, currency)
    if (amount === undefined) return undefined
    charges.set(t.merchant, [...(charges.get(t.merchant) ?? []), { t, amount }])
  }
  const payments: Payment[] = []
  for (const list of charges.values()) {
    const months = new Set(list.map((c) => monthKey(c.t.time)))
    if (months.size < MIN_MONTHS || list.length > months.size * 1.5) continue
    const usual = median(list.map((c) => c.amount))
    if (list.filter((c) => Math.abs(c.amount - usual) <= usual * SIMILAR).length < list.length * 0.75) continue
    const { t: latest, amount } = list.reduce((a, b) => (a.t.time > b.t.time ? a : b))
    const last = new Date(latest.time)
    if (now.getTime() - last.getTime() > ACTIVE_DAYS * 864e5) continue
    const emoji = parentOf.get(latest.category)!.emoji
    payments.push({ latest, emoji, amount, next: new Date(last.getFullYear(), last.getMonth() + 1, last.getDate()) })
  }
  return payments.sort((a, b) => b.amount - a.amount)
}

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
  const toggle = (merchant: string) => setDropped((set) => {
    const next = new Set(set)
    if (!next.delete(merchant)) next.add(merchant)
    return next
  })

  return (
    <section className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Recurring payments</h2>
        <span className={`tabular-nums ${muted}`}>
          {payments.length} · <span className="font-medium text-zinc-900 dark:text-zinc-100">{format(total, currency)}</span> per month committed
        </span>
      </div>
      <p className={`mt-1 ${muted}`}>
        Charged about once a month for a similar amount, in at least {MIN_MONTHS} of the last {MONTHS} months. Uncheck one to see the total without it.
      </p>
      {saved > 0 && (
        <p className="mt-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 tabular-nums dark:bg-emerald-950/40 dark:text-emerald-300">
          After cancelling {dropped.size}: <span className="font-semibold">{format(total - saved, currency)}</span> per month
          · {format(saved, currency)} saved per month, {format(saved * 12, currency)} a year
        </p>
      )}
      <ul className="mt-3 flex flex-col gap-2">
        {payments.map(({ latest, emoji, amount, next }) => (
          <li key={latest.merchant} className={`flex items-center gap-3 ${dropped.has(latest.merchant) ? 'opacity-50' : ''}`}>
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
            <span className="shrink-0 text-sm font-medium text-zinc-900 tabular-nums dark:text-zinc-100">{format(amount, currency)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
