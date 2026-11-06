export const currencies = ['USD', 'EUR', 'UAH'] as const

export type Currency = typeof currencies[number]

export const accountKinds = ['bank', 'cash'] as const

export type AccountKind = typeof accountKinds[number]

export type Account = { id: number, name: string, currency: Currency, kind: AccountKind, balance: number, updatedAt: string, monoAccountId: string | null }

export type Transaction = { id: number, accountId: number, externalId: string, time: string, description: string, mcc: number, amount: number, merchant: string, category: string, categorySource: 'transaction' | 'merchant' | 'auto', mccDescription: string | null, merchantDomain: string | null, note: string | null }

export type Category = { id: string, label: string, emoji: string, spending: boolean, subcategories: Array<{ id: string, label: string }> }

// what a transaction's category id points at: a subcategory, or a category without subcategories
export type Leaf = { id: string, label: string, parent: Category }

export type Rates = { date: string, rates: Record<Currency, number> }

export type Budget = {
  monthlySpend: number
  currency: Currency
  salary: number | null
  salaryCurrency: Currency | null
  reserve: number | null
  reserveCurrency: Currency | null
  minimalSpend: number | null
  minimalSpendCurrency: Currency | null
  targetMonths: number | null
}

export type Convert = (amount: number, from: Currency, to: Currency) => number | undefined

export type Goal = { id: number, name: string, target: number, currency: Currency }
