import { merchantKey } from './categories'

type Row = {
  id: number
  time: Date
  description: string
  amountCents: number
  operationAmount: number | null
  operationCurrency: number | null
}

const CANCELLATION = /^скасування\.\s*/i
const DAY_MS = 864e5

// Refunds that come as a transfer instead of a «Скасування.»: the sender's merchant key → the purchase's
const REFUNDED_BY: Record<string, string> = { 'від: olx_dostavka uapay': 'olx' }
// a sender Monobank hides (OLX refunds sometimes come this way): pairs with any merchant, only within 3 days
const MASKED = 'від: #traceable #traceable'

// Monobank sends nothing linking a cancellation to the purchase it reverses, so they are paired here:
// a «Скасування. X» pairs with the closest earlier unpaired purchase from merchant X for the exact
// opposite amount in the currency it was paid in. The account-currency amount is no use for foreign
// purchases, since each side is converted at its own day's rate; rows without the operation columns
// fall back to it. A partial refund pairs with nothing and stays an ordinary refund. Refunds sent as a transfer
// pair the same way: from a known refund sender (REFUNDED_BY) with that merchant's purchase, from a hidden sender
// with any purchase of the exact amount up to 3 days earlier.
// Returns the ids of both rows of every pair.
export function cancelledIds(rows: Row[]) {
  const sorted = rows.toSorted((a, b) => a.time.getTime() - b.time.getTime() || a.id - b.id)
  const paired = new Set<number>()
  for (const [i, c] of sorted.entries()) {
    if (c.amountCents <= 0) continue
    const sender = merchantKey(c.description)
    const key = CANCELLATION.test(c.description) ? sender : REFUNDED_BY[sender]
    const masked = sender === MASKED
    if (!key && !masked) continue
    for (let j = i - 1; j >= 0; j--) {
      const p = sorted[j]
      if (masked && c.time.getTime() - p.time.getTime() > 3 * DAY_MS) break
      if (p.amountCents < 0 && !paired.has(p.id) && (masked || merchantKey(p.description) === key) && opposite(p, c)) {
        paired.add(p.id).add(c.id)
        break
      }
    }
  }
  return paired
}

const opposite = (p: Row, c: Row) =>
  p.operationAmount != null && c.operationAmount != null
    ? p.operationCurrency === c.operationCurrency && p.operationAmount === -c.operationAmount
    : p.amountCents === -c.amountCents
