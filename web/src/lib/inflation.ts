import type { Inflation } from './types'

// longest horizon simulated; beyond it savings count as lasting forever
const MAX_MONTHS = 100 * 12

const sorted = (cpi: Inflation) => Object.keys(cpi).sort()

// Yearly inflation over the last 12 published months, e.g. 0.11; undefined with fewer months.
export function annualRate(cpi: Inflation) {
  const months = sorted(cpi).slice(-12)
  return months.length < 12 ? undefined : months.reduce((p, m) => p * (1 + cpi[m] / 100), 1) - 1
}

// The latest published month ('YYYY-MM') and, for any month, what multiplies an amount from it into that
// month's prices. Months after the latest one count as already in its prices, months before the data as
// in the first month's.
export function inLatestPrices(cpi: Inflation) {
  const months = sorted(cpi)
  // price level of each month, relative to the month before the first
  const level = new Map<string, number>()
  let p = 1
  for (const m of months) level.set(m, (p *= 1 + cpi[m] / 100))
  const latest = months.at(-1)
  const factor = (month: string) => {
    if (!latest || month >= latest) return 1
    return p / (level.get(month) ?? level.get(months[0])!)
  }
  return { latest, factor }
}

// Months savings `total` last when `spend` grows by `yearly` inflation and `income` stays flat, which is
// the cautious case: a salary is not indexed every month. Infinity when they outlast MAX_MONTHS.
export function monthsLasting(total: number, spend: number, income: number, yearly: number) {
  const growth = (1 + yearly) ** (1 / 12)
  let left = Math.max(0, total)
  let cost = spend
  for (let month = 0; month < MAX_MONTHS; month++, cost *= growth) {
    const burn = cost - income
    if (burn > left) return month + left / burn
    left -= burn
  }
  return Infinity
}

// Months to save `need` from income minus spending, with spending growing by `yearly` inflation and income
// flat; undefined when spending catches up with income first.
export function monthsToSave(need: number, spend: number, income: number, yearly: number) {
  const growth = (1 + yearly) ** (1 / 12)
  let saved = 0
  let cost = spend
  for (let month = 0; month < MAX_MONTHS; month++, cost *= growth) {
    const surplus = income - cost
    if (surplus <= 0) return undefined
    if (saved + surplus >= need) return month + (need - saved) / surplus
    saved += surplus
  }
  return undefined
}
