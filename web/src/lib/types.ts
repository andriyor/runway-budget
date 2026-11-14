import type { AccountKind, AllOf, Category, Currency } from '@runway-budget/shared'

// API response shapes live in the shared package
export type { Account, AccountKind, Budget, Category, CategoryBudget, Currency, Goal, Income, Inflation, Rates, RateHistory, Transaction } from '@runway-budget/shared'

// runtime lists for pickers; AllOf keeps them equal to the shared unions
const currencyList = ['USD', 'EUR', 'UAH'] as const
export const currencies: AllOf<Currency, typeof currencyList> = currencyList
const accountKindList = ['bank', 'cash'] as const
export const accountKinds: AllOf<AccountKind, typeof accountKindList> = accountKindList

// what a transaction's category id points at: a subcategory, or a category without subcategories
export type Leaf = { id: string, label: string, parent: Category }

export type Convert = (amount: number, from: Currency, to: Currency) => number | undefined

// at the NBU rate of a local day 'YYYY-MM-DD'
export type ConvertOn = (amount: number, from: Currency, to: Currency, day: string) => number | undefined
