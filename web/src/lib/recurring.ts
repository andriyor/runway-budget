import { monthKey } from './periods'
import { median } from './stats'
import { parentsById } from './categories'
import type { Account, Category, Convert, Currency, Transaction } from './types'

// complete months looked at, besides the running one
export const MONTHS = 6
// charged in at least this many of those months
export const MIN_MONTHS = 3
// most charges within this share of their median amount
const SIMILAR = 0.25
// a payment not charged for this long has likely stopped
const ACTIVE_DAYS = 40

// amount: the latest charge; usual: the median charge, so a raised price shows as amount > usual
export type Payment = { latest: Transaction; emoji: string; amount: number; usual: number; next: Date }

// Payments that repeat monthly: a merchant charged in at least MIN_MONTHS of the last MONTHS complete
// months (or the running one), about once a month, mostly for a similar amount, and charged within
// ACTIVE_DAYS. The monthly amount is the latest charge, so a raised price counts. Spending categories only; cancelled pairs skipped.
// ponytail: monthly cycles only; yearly or weekly payments need their own period detection
export function recurring(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  convert: Convert,
  currency: Currency,
  now: Date,
) {
  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]))
  const parentOf = parentsById(categories)
  const since = new Date(now.getFullYear(), now.getMonth() - MONTHS, 1)
  // merchant key → its charges in the window, in the budget currency
  const charges = new Map<string, Array<{ t: Transaction; amount: number }>>()
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
    payments.push({
      latest,
      emoji,
      amount,
      usual,
      next: new Date(last.getFullYear(), last.getMonth() + 1, last.getDate()),
    })
  }
  return payments.sort((a, b) => b.amount - a.amount)
}
