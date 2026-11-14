import { useEffect, useState } from 'react'
import { api } from './api'
import { dayKey, monthKey } from './periods'
import type { Account, Budget, Category, Convert, ConvertOn, Currency, Inflation, Rates, RateHistory, Transaction } from './types'

// Accounts, NBU rates, the Runway budget and categories, with conversions between currencies and
// the budget-derived amounts the pages share. withTransactions also loads every account's transactions
// and the NBU rates of every day since the first one. withInflation loads monthly CPI since the first
// transaction, or at least the last 13 months, enough for a yearly rate.
export function useFinance({ withTransactions = false, withInflation = false } = {}) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [rates, setRates] = useState<Rates>()
  const [error, setError] = useState('')
  // undefined while loading
  const [budget, setBudget] = useState<Budget | null>()
  const [fetched, setTransactions] = useState<Transaction[]>()
  const [categories, setCategories] = useState<Category[]>([])
  // undefined while loading; {} when it failed, so conversions fall back to today's rates
  const [history, setHistory] = useState<RateHistory>()
  const [inflation, setInflation] = useState<Inflation>()
  // refetch when an account is added, removed or changes balance (updatedAt), e.g. after an adjustment
  const ids = accounts.map((a) => `${a.id}@${a.updatedAt}`).join(',')
  // the last fetch would linger after every account is deleted
  const transactions = ids ? fetched : []

  useEffect(() => {
    if (!ids || !withTransactions) return
    Promise.all(ids.split(',').map((key) => api<Transaction[]>(`/accounts/${key.split('@')[0]}/transactions`)))
      .then((all) => {
        const list = all.flat()
        setTransactions(list)
        const first = list.reduce((min, t) => (t.time < min ? t.time : min), new Date().toISOString())
        return api<RateHistory>(`/rates/history?from=${dayKey(first)}`).then(setHistory).catch((e) => {
          setHistory({})
          setError(`Rate history: ${e.message}, so past amounts use today's rates`)
        })
      })
      .catch((e) => {
        setTransactions([])
        setError(`Transactions: ${e.message}`)
      })
  }, [ids, withTransactions])

  // waits for the transactions when they are loaded, so the CPI reaches back to the first one
  const [yearAgo] = useState(() => monthKey(new Date(new Date().getFullYear(), new Date().getMonth() - 13, 1).toISOString()))
  const inflationFrom = !withInflation ? undefined
    : !withTransactions ? yearAgo
    : fetched ? fetched.reduce((min, t) => (monthKey(t.time) < min ? monthKey(t.time) : min), yearAgo)
    : undefined
  useEffect(() => {
    if (!inflationFrom) return
    api<Inflation>(`/inflation?from=${inflationFrom}`).then(setInflation).catch((e) => setError(`Inflation: ${e.message}`))
  }, [inflationFrom])

  useEffect(() => {
    api<Budget | null>('/budget').then(setBudget).catch((e) => setError(e.message))
    api<Category[]>('/categories').then(setCategories).catch((e) => setError(e.message))
    api<Account[]>('/accounts').then(setAccounts).catch((e) => setError(e.message))
    api<Rates>('/rates').then(setRates).catch((e) => setError(`Rates: ${e.message}`))
  }, [])

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
  const fromBudget = (amount: number | null | undefined, from: Currency | null | undefined, to: Currency) =>
    amount != null && from ? convert(amount, from, to) : undefined
  const reserveIn = (c: Currency) => fromBudget(budget?.reserve, budget?.reserveCurrency, c) ?? 0
  // all incomes together; undefined when there are none or rates are missing
  const incomeIn = (c: Currency) =>
    budget?.incomes.length && rates ? budget.incomes.reduce((sum, i) => sum + convert(i.amount, i.currency, c)!, 0) : undefined
  // incomes that keep coming in the "without income" estimates, e.g. rent
  const keptIncomeIn = (c: Currency) =>
    rates ? (budget?.incomes ?? []).filter((i) => i.keeps).reduce((sum, i) => sum + convert(i.amount, i.currency, c)!, 0) : 0
  const minimalIn = (c: Currency) => fromBudget(budget?.minimalSpend, budget?.minimalSpendCurrency, c)
  const availableIn = (c: Currency) => {
    const total = totalIn(c)
    return total === undefined ? undefined : total - reserveIn(c)
  }
  // months without income, covering what the incomes that keep coming do not
  const cushionIn = (c: Currency) =>
    budget?.targetMonths ? budget.targetMonths * Math.max(0, fromBudget(budget.monthlySpend, budget.currency, c)! - keptIncomeIn(c)) : 0
  const forGoalsIn = (c: Currency) => {
    const available = availableIn(c)
    return available === undefined ? undefined : available - cushionIn(c)
  }
  const cushion = budget?.targetMonths && rates
    ? { months: budget.targetMonths, amount: cushionIn(budget.currency), available: availableIn(budget.currency)!, currency: budget.currency }
    : undefined
  const netIn = (c: Currency) =>
    budget && rates ? (incomeIn(c) ?? 0) - convert(budget.monthlySpend, budget.currency, c)! : undefined

  return {
    accounts, setAccounts, rates, budget, setBudget, categories, transactions, inflation, error, setError,
    // amounts in statistics are shown in Runway's currency
    currency: budget?.currency ?? 'UAH' as Currency,
    convert, convertOn, totalIn, reserveIn, incomeIn, keptIncomeIn, minimalIn, availableIn, forGoalsIn, cushion, netIn,
  }
}
