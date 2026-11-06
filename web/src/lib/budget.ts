import type { Budget, Currency } from './types'

// PUT /budget body that sets one amount from a spending median and keeps every other field.
// essential: the median is the minimal month (extreme saving); otherwise it is the monthly spending,
// which can also create the budget. Returns undefined when there is no budget to add the minimum to.
export function budgetWithMedian(saved: Budget | null, amount: number, currency: Currency, essential: boolean) {
  if (!saved && essential) return undefined
  const pair = (x: number | null | undefined, c: Currency | null | undefined) => x != null && c != null
  return {
    monthlySpend: essential ? saved!.monthlySpend : amount,
    currency: essential ? saved!.currency : currency,
    ...(pair(saved?.salary, saved?.salaryCurrency) && { salary: saved!.salary, salaryCurrency: saved!.salaryCurrency }),
    ...(pair(saved?.reserve, saved?.reserveCurrency) && { reserve: saved!.reserve, reserveCurrency: saved!.reserveCurrency }),
    ...(essential
      ? { minimalSpend: amount, minimalSpendCurrency: currency }
      : pair(saved?.minimalSpend, saved?.minimalSpendCurrency) && { minimalSpend: saved!.minimalSpend, minimalSpendCurrency: saved!.minimalSpendCurrency }),
    ...(saved?.targetMonths != null && { targetMonths: saved.targetMonths }),
  }
}
