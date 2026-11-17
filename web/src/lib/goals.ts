import type { Convert, Goal } from './types'

// Savings fill goals from the top, so a goal is reached once savings cover its target and every target above it.
// Per goal: that running total in the goal's own currency; undefined while rates load.
export const cumulativeTargets = (goals: Goal[], convert: Convert) =>
  goals.map((goal, i) => goals.slice(0, i + 1).reduce<number | undefined>((sum, above) => {
    const v = convert(above.target, above.currency, goal.currency)
    return sum === undefined || v === undefined ? undefined : sum + v
  }, 0))

// Months a goal's reach date moves back if `price` leaves savings today, saving `net` per month.
// All amounts are in the goal's currency; `cumulative` is from cumulativeTargets.
export const delayMonths = (cumulative: number, saved: number, price: number, net: number) =>
  (Math.max(0, cumulative - saved + price) - Math.max(0, cumulative - saved)) / net
