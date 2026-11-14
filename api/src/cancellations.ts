import { merchantKey } from './categories'

type Row = { id: number, time: Date, description: string, amountCents: number, operationAmount: number | null, operationCurrency: number | null }

const CANCELLATION = /^скасування\.\s*/i

// Monobank sends nothing linking a cancellation to the purchase it reverses, so they are paired here:
// a «Скасування. X» pairs with the closest earlier unpaired purchase from merchant X for the exact
// opposite amount in the currency it was paid in. The account-currency amount is no use for foreign
// purchases, since each side is converted at its own day's rate; rows without the operation columns
// fall back to it. A partial refund pairs with nothing and stays an ordinary refund.
// Returns the ids of both rows of every pair.
export function cancelledIds(rows: Row[]) {
  const sorted = rows.toSorted((a, b) => a.time.getTime() - b.time.getTime() || a.id - b.id)
  const paired = new Set<number>()
  for (const [i, c] of sorted.entries()) {
    if (c.amountCents <= 0 || !CANCELLATION.test(c.description)) continue
    const key = merchantKey(c.description)
    for (let j = i - 1; j >= 0; j--) {
      const p = sorted[j]
      if (p.amountCents < 0 && !paired.has(p.id) && merchantKey(p.description) === key && opposite(p, c)) {
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
