import type { Convert, Currency, Goal } from './types'

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

// months from the current month to `month` ("2027-03"); 0 for this month or one already past
export const monthsUntil = (month: string, now: Date) =>
  Math.max(0, Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 - (now.getFullYear() * 12 + now.getMonth()))

// Goals come first, so a planned wish is paid from what savings hold above every goal and the planned wishes
// before it. `reserved` is that total, all in the wish's currency. left: what remains at its month after buying
// it, negative when short; earliest: months from now when it is first affordable, Infinity when never.
export function wishFit(reserved: number, saved: number, net: number, price: number, months: number) {
  const need = reserved + price - saved
  return {
    left: net * months - need,
    earliest: need <= 0 ? 0 : net > 0 ? Math.ceil(need / net) : Infinity,
  }
}
