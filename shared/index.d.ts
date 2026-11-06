// Shapes of the API's JSON responses, shared by api (which returns them) and web (which reads them).
// Declarations only: imports are type-only and vanish from the built code.

export type Currency = 'USD' | 'EUR' | 'UAH'
export type AccountKind = 'bank' | 'cash'

// A list that names every member of T: an unknown member fails the constraint, a missing one makes it never.
// For the runtime lists each app keeps, e.g. `const currencies: AllOf<Currency, typeof list> = list`.
export type AllOf<T, L extends readonly T[]> = [T] extends [L[number]] ? L : never

export type Account = {
  id: number
  name: string
  currency: Currency
  kind: AccountKind
  balance: number
  // ISO 8601
  updatedAt: string
  monoAccountId: string | null
}

export type Transaction = {
  id: number
  accountId: number
  externalId: string
  // ISO 8601
  time: string
  description: string
  mcc: number
  amount: number
  // normalized description; groups a merchant's purchases and refunds
  merchant: string
  // leaf category id: a subcategory, or a category without subcategories
  category: string
  // which level decided the category
  categorySource: 'transaction' | 'merchant' | 'auto'
  // needed to live, as opposed to spending that could be cut in a lean month
  essential: boolean
  // which level decided essential: the transaction, its merchant, or the category default
  essentialSource: 'transaction' | 'merchant' | 'auto'
  mccDescription: string | null
  merchantDomain: string | null
  note: string | null
}

export type Category = {
  id: string
  label: string
  emoji: string
  // false for income, own-account moves and investments
  spending: boolean
  // essential: the default for transactions in that subcategory
  subcategories: Array<{ id: string, label: string, essential: boolean }>
}

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

export type Goal = { id: number, name: string, target: number, currency: Currency }
