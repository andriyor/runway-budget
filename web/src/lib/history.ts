import { dayKey } from './periods'
import type { Account, ConvertOn, Currency, Transaction } from './types'

export type DayValue = { day: string, value: number, gain: number }

// Every day from the first transaction to today: what all accounts were worth in `currency` at the end of
// the day, each account's own-currency balance (rebuilt backwards from today's by undoing later
// transactions) valued at that day's NBU rate. gain is what rate moves added that day: the change in value
// minus the day's transactions at the same rate, i.e. yesterday's foreign balances times the rate change.
// undefined until every rate needed is known.
export function dailyValues(accounts: Account[], transactions: Transaction[], convertOn: ConvertOn, currency: Currency, today: Date) {
  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]))
  // day → account → that day's transactions, in the account's currency
  const byDay = new Map<string, Map<number, number>>()
  let first = dayKey(today.toISOString())
  for (const t of transactions) {
    const day = dayKey(t.time)
    if (day < first) first = day
    if (!byDay.has(day)) byDay.set(day, new Map())
    const accounts = byDay.get(day)!
    accounts.set(t.accountId, (accounts.get(t.accountId) ?? 0) + t.amount)
  }
  const balance = new Map(accounts.map((a) => [a.id, a.balance]))
  const values: DayValue[] = []
  for (let d = today; dayKey(d.toISOString()) >= first; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)) {
    const day = dayKey(d.toISOString())
    let value = 0
    let flow = 0
    for (const [id, amount] of balance) {
      const converted = convertOn(amount, currencyOf.get(id)!, currency, day)
      if (converted === undefined) return undefined
      value += converted
    }
    for (const [id, amount] of byDay.get(day) ?? []) {
      flow += convertOn(amount, currencyOf.get(id)!, currency, day)!
      balance.set(id, balance.get(id)! - amount)
    }
    values.push({ day, value, gain: flow })
  }
  values.reverse()
  // gain held the day's flow until the previous day's value was known
  return values.map((v, i) => ({ ...v, gain: i ? v.value - values[i - 1].value - v.gain : 0 }))
}
