import type { Budget, Currency } from './types'

// PUT /budget body that sets one amount and keeps every other field (PUT clears what it is not given).
// monthlySpend can also create the budget; the others return undefined when there is no budget yet.
export function budgetWith(saved: Budget | null, field: 'monthlySpend' | 'minimalSpend' | 'salary', amount: number, currency: Currency) {
  if (!saved && field !== 'monthlySpend') return undefined
  const pair = (x: number | null | undefined, c: Currency | null | undefined) => x != null && c != null
  const set = {
    monthlySpend: { monthlySpend: amount, currency },
    minimalSpend: { minimalSpend: amount, minimalSpendCurrency: currency },
    salary: { salary: amount, salaryCurrency: currency },
  }[field]
  return {
    monthlySpend: saved?.monthlySpend,
    currency: saved?.currency,
    ...(pair(saved?.salary, saved?.salaryCurrency) && { salary: saved!.salary, salaryCurrency: saved!.salaryCurrency }),
    ...(pair(saved?.reserve, saved?.reserveCurrency) && { reserve: saved!.reserve, reserveCurrency: saved!.reserveCurrency }),
    ...(pair(saved?.minimalSpend, saved?.minimalSpendCurrency) && { minimalSpend: saved!.minimalSpend, minimalSpendCurrency: saved!.minimalSpendCurrency }),
    ...(saved?.targetMonths != null && { targetMonths: saved.targetMonths }),
    ...set,
  }
}
