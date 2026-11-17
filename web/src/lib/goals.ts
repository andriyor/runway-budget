import type { Convert, Currency, Goal } from './types'

// Savings fill goals from the top, so a goal is reached once savings cover its target and every target above it.
// Per goal: that running total in the goal's own currency; undefined while rates load.
export const cumulativeTargets = (goals: Goal[], convert: Convert) =>
  goals.map((goal, i) => goals.slice(0, i + 1).reduce<number | undefined>((sum, above) => {
    const v = convert(above.target, above.currency, goal.currency)
    return sum === undefined || v === undefined ? undefined : sum + v
  }, 0))

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
