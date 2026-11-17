import { useState } from 'react'
import { useQueries, type UseQueryResult } from '@tanstack/react-query'
import { api, setCached, useApi } from './api'
import { dayKey, monthKey } from './periods'
import type {
  Account,
  Asset,
  Budget,
  Category,
  Convert,
  ConvertOn,
  Currency,
  Inflation,
  Rates,
  RateHistory,
  Transaction,
} from './types'

// the earliest transaction's time, or now without any
const firstTime = (list: Transaction[]) =>
  list.reduce((min, t) => (t.time < min ? t.time : min), new Date().toISOString())

// every account's transactions as one list once all are in; module-level so useQueries keeps its result stable
const allTransactions = (results: UseQueryResult<Transaction[]>[]) => ({
  list: results.every((r) => r.data) ? results.flatMap((r) => r.data!) : undefined,
  error: results.find((r) => r.error)?.error,
})

// Accounts, NBU rates, the Runway budget and categories, with conversions between currencies and
// the budget-derived amounts the pages share. withTransactions also loads every account's transactions
// and the NBU rates of every day since the first one. withInflation loads monthly CPI since the first
// transaction, or at least the last 13 months, enough for a yearly rate.
export function useFinance({ withTransactions = false, withInflation = false } = {}) {
  const accountsQuery = useApi<Account[]>('/accounts')
  const ratesQuery = useApi<Rates>('/rates')
  // null when there is none; undefined while loading
  const budgetQuery = useApi<Budget | null>('/budget')
  const categoriesQuery = useApi<Category[]>('/categories')
  const assetsQuery = useApi<Asset[]>('/assets')
  const accounts = accountsQuery.data ?? []
  const rates = ratesQuery.data
  const budget = budgetQuery.data
  const categories = categoriesQuery.data ?? []
  const assets = assetsQuery.data ?? []
  // errors of the page itself, e.g. a failed save; load errors come from the queries
  const [error, setError] = useState('')

  const fetched = useQueries({
    queries:
      withTransactions && accountsQuery.data
        ? accountsQuery.data.map((a) => ({
            queryKey: [`/accounts/${a.id}/transactions`],
            queryFn: () => api<Transaction[]>(`/accounts/${a.id}/transactions`),
          }))
        : [],
    combine: allTransactions,
  })
  // undefined while loading; [] when it failed, as before
  const transactions = !withTransactions ? undefined : fetched.error ? [] : accountsQuery.data && fetched.list
  // undefined while loading; {} when it failed, so conversions fall back to today's rates
  const historyQuery = useApi<RateHistory>(
    `/rates/history?from=${dayKey(firstTime(transactions ?? []))}`,
    transactions !== undefined && !fetched.error,
  )
  const history = historyQuery.error ? {} : historyQuery.data

  // waits for the transactions when they are loaded, so the CPI reaches back to the first one
  const [yearAgo] = useState(() =>
    monthKey(new Date(new Date().getFullYear(), new Date().getMonth() - 13, 1).toISOString()),
  )
  const inflationFrom = !withInflation
    ? undefined
    : !withTransactions
      ? yearAgo
      : transactions
        ? transactions.reduce((min, t) => (monthKey(t.time) < min ? monthKey(t.time) : min), yearAgo)
        : undefined
  const inflationQuery = useApi<Inflation>(`/inflation?from=${inflationFrom}`, inflationFrom !== undefined)
  const inflation = inflationQuery.data

  const loadError =
    (budgetQuery.error ?? categoriesQuery.error ?? accountsQuery.error ?? assetsQuery.error)?.message ??
    (ratesQuery.error && `Rates: ${ratesQuery.error.message}`) ??
    (fetched.error && `Transactions: ${fetched.error.message}`) ??
    (historyQuery.error && `Rate history: ${historyQuery.error.message}, so past amounts use today's rates`) ??
    (inflationQuery.error && `Inflation: ${inflationQuery.error.message}`)
  // edits show at once; the write then refetches everything (see api)
  const setAccounts = (next: Account[] | ((old: Account[]) => Account[])) => setCached('/accounts', next)
  const setBudget = (next: Budget | null) => setCached('/budget', next)

  // rates are UAH per unit, so convert via UAH
  const convert: Convert = (amount, from, to) => rates && (amount * rates.rates[from]) / rates.rates[to]
  // a day's rate; today and a day the NBU has not published yet use the latest rates
  const convertOn: ConvertOn = (amount, from, to, day) => {
    if (!history || !rates) return undefined
    const r = history[day] ?? rates.rates
    return (amount * r[from]) / r[to]
  }
  const totalIn = (target: Currency) =>
    rates && accounts.reduce((sum, a) => sum + convert(a.balance, a.currency, target)!, 0)
  // what the things owned are worth together, at their estimated value
  const ownedIn = (target: Currency) =>
    rates && assets.reduce((sum, a) => sum + convert(a.value, a.currency, target)!, 0)
  // what each sellable thing brings in a quick sale, after its discount; [] while rates load
  const salesIn = (c: Currency) =>
    rates
      ? assets
          .filter((a) => a.sellable)
          .map((a) => ({ name: a.name, amount: convert(a.value * (1 - a.discount / 100), a.currency, c)! }))
      : []
  const fromBudget = (amount: number | null | undefined, from: Currency | null | undefined, to: Currency) =>
    amount != null && from ? convert(amount, from, to) : undefined
  const reserveIn = (c: Currency) => fromBudget(budget?.reserve, budget?.reserveCurrency, c) ?? 0
  // all incomes together; undefined when there are none or rates are missing
  const incomeIn = (c: Currency) =>
    budget?.incomes.length && rates
      ? budget.incomes.reduce((sum, i) => sum + convert(i.amount, i.currency, c)!, 0)
      : undefined
  // incomes that keep coming in the "without income" estimates, e.g. rent
  const keptIncomeIn = (c: Currency) =>
    rates
      ? (budget?.incomes ?? []).filter((i) => i.keeps).reduce((sum, i) => sum + convert(i.amount, i.currency, c)!, 0)
      : 0
  const minimalIn = (c: Currency) => fromBudget(budget?.minimalSpend, budget?.minimalSpendCurrency, c)
  const availableIn = (c: Currency) => {
    const total = totalIn(c)
    return total === undefined ? undefined : total - reserveIn(c)
  }
  // months without income, covering what the incomes that keep coming do not
  const cushionIn = (c: Currency) =>
    budget?.targetMonths
      ? budget.targetMonths * Math.max(0, fromBudget(budget.monthlySpend, budget.currency, c)! - keptIncomeIn(c))
      : 0
  const forGoalsIn = (c: Currency) => {
    const available = availableIn(c)
    return available === undefined ? undefined : available - cushionIn(c)
  }
  const cushion =
    budget?.targetMonths && rates
      ? {
          months: budget.targetMonths,
          amount: cushionIn(budget.currency),
          available: availableIn(budget.currency)!,
          currency: budget.currency,
        }
      : undefined
  const netIn = (c: Currency) =>
    budget && rates ? (incomeIn(c) ?? 0) - convert(budget.monthlySpend, budget.currency, c)! : undefined

  return {
    accounts,
    setAccounts,
    rates,
    budget,
    setBudget,
    assets,
    categories,
    transactions,
    inflation,
    error: error || loadError || '',
    setError,
    // amounts in statistics are shown in Runway's currency
    currency: budget?.currency ?? ('UAH' as Currency),
    convert,
    convertOn,
    totalIn,
    ownedIn,
    salesIn,
    reserveIn,
    incomeIn,
    keptIncomeIn,
    minimalIn,
    availableIn,
    forGoalsIn,
    cushion,
    netIn,
  }
}
