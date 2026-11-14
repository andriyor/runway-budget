import type { Budget, Currency, Income } from './types'

// the name Cash flow's median income is saved under; using it again replaces that income, not the others
export const CASH_FLOW_INCOME = 'Average income'

// PUT /budget body that sets one amount and keeps every other field (PUT clears what it is not given).
// monthlySpend can also create the budget; the others return undefined when there is no budget yet.
// An income replaces the saved income of the same name, or is added after the others.
export function budgetWith(saved: Budget | null, field: 'monthlySpend' | 'minimalSpend' | 'income', amount: number, currency: Currency, name = CASH_FLOW_INCOME) {
  if (!saved && field !== 'monthlySpend') return undefined
  const pair = (x: number | null | undefined, c: Currency | null | undefined) => x != null && c != null
  const incomes: Income[] = saved?.incomes ?? []
  const income = { name, amount, currency }
  const set = {
    monthlySpend: { monthlySpend: amount, currency },
    minimalSpend: { minimalSpend: amount, minimalSpendCurrency: currency },
    income: {
      incomes: incomes.some((i) => i.name === name) ? incomes.map((i) => (i.name === name ? income : i)) : [...incomes, income],
    },
  }[field]
  return {
    monthlySpend: saved?.monthlySpend,
    currency: saved?.currency,
    incomes,
    ...(pair(saved?.reserve, saved?.reserveCurrency) && { reserve: saved!.reserve, reserveCurrency: saved!.reserveCurrency }),
    ...(pair(saved?.minimalSpend, saved?.minimalSpendCurrency) && { minimalSpend: saved!.minimalSpend, minimalSpendCurrency: saved!.minimalSpendCurrency }),
    ...(saved?.targetMonths != null && { targetMonths: saved.targetMonths }),
    ...set,
  }
}
