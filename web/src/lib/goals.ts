import type { Convert, Currency, Goal, Transaction } from './types'

// Savings fill goals from the top, so a goal is reached once savings cover its target and every target above it.
// Per goal: that running total in the goal's own currency; undefined while rates load.
export const cumulativeTargets = (goals: Goal[], convert: Convert) =>
  goals.map((goal, i) =>
    goals.slice(0, i + 1).reduce<number | undefined>((sum, above) => {
      const v = convert(above.target, above.currency, goal.currency)
      return sum === undefined || v === undefined ? undefined : sum + v
    }, 0),
  )

// Per goal: how much of it savings cover now, and what is still to save for it and every goal above it, in its
// currency. forGoals is negative while the cushion is not covered, so that shortfall counts first.
// undefined while rates or balances load.
export function goalProgress(goals: Goal[], convert: Convert, forGoalsIn: (c: Currency) => number | undefined) {
  const cumulative = cumulativeTargets(goals, convert)
  return goals.map((g, i) => {
    const forGoals = forGoalsIn(g.currency)
    if (cumulative[i] === undefined || forGoals === undefined) return undefined
    const ahead = cumulative[i]! - g.target
    return { have: Math.min(g.target, Math.max(0, forGoals - ahead)), need: cumulative[i]! - forGoals }
  })
}

// Months a goal's reach date moves back if `price` leaves savings today, saving `net` per month.
// All amounts are in the goal's currency; `cumulative` is from cumulativeTargets, and `saved` is negative while
// the cushion is not covered.
export const delayMonths = (cumulative: number, saved: number, price: number, net: number) =>
  (Math.max(0, cumulative - saved + price) - Math.max(0, cumulative - saved)) / net

// "2026-12" plus 2 → "2027-02"
export const addMonths = (month: string, n: number) => {
  const total = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + n
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

// Months for unplanned wishes, in their order: each goes to the first month from `from` whose wishes, with it,
// stay within `budget` a month; one dearer than the budget gets a month of its own. Prices are in one currency;
// `taken` is what each month already has planned.
export function spreadWishes(prices: number[], taken: Map<string, number>, budget: number, from: string) {
  const totals = new Map(taken)
  return prices.map((price) => {
    let month = from
    for (let m = 0; ; m++) {
      month = addMonths(from, m)
      const total = totals.get(month) ?? 0
      if (total + price <= budget || total === 0) break
    }
    totals.set(month, (totals.get(month) ?? 0) + price)
    return month
  })
}

// A wish's likely purchase: spending in its category after it was added and after matchAfter, not cancelled,
// costing within 20% of its price; the closest in amount, the newest of equals. `parentOf` maps a leaf
// category to its top-level one; `spent` is what a transaction took, in the wish's currency.
export function findPurchase(
  wish: Goal,
  transactions: Transaction[],
  parentOf: (category: string) => string | undefined,
  spent: (t: Transaction) => number | undefined,
) {
  if (!wish.category) return undefined
  const from = Math.max(Date.parse(wish.addedAt), wish.matchAfter ? Date.parse(wish.matchAfter) : 0)
  let best: { t: Transaction; off: number } | undefined
  for (const t of transactions) {
    if (t.cancelled || t.amount >= 0 || parentOf(t.category) !== wish.category || Date.parse(t.time) <= from) continue
    const amount = spent(t)
    if (amount === undefined) continue
    const off = Math.abs(amount - wish.target) / wish.target
    if (off > 0.2) continue
    if (!best || off < best.off || (off === best.off && t.time > best.t.time)) best = { t, off }
  }
  return best?.t
}
