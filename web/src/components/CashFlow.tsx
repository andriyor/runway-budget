import { useState } from 'react'
import { format, percentOf, wholeMoney } from '../lib/format'
import { dailyValues } from '../lib/history'
import { dayKey, monthKey } from '../lib/periods'
import { median, quantile } from '../lib/stats'
import { card, muted, linkButton } from '../lib/styles'
import type { Account, Category, ConvertOn, Currency, Transaction } from '../lib/types'

// how far back the figures look, in complete months
const MONTHS = 12
const monthLabel = new Intl.DateTimeFormat('uk-UA', { month: 'short', year: 'numeric' })

const SPENDING_NOTE = 'Net of refunds: a refund lowers spending in the month it arrives (which can go below zero) and never counts as income. '
  + 'Cancelled purchases count as nothing. Own-account moves and investments are left out.'
const RATES_NOTE = 'What exchange rate moves added to or took from your USD and EUR balances that month: not income or spending, '
  + 'but it changes what your savings are worth in this currency.'

// fromRates: what rate moves added to the foreign-currency balances that month
type Month = { month: string, income: number, spent: number, fromRates: number }

// Income and net spending per complete month, oldest first: up to MONTHS months before the running
// one, starting at the first month with a transaction. Income is the «Надходження» category; spending
// is every spending category, net of refunds. Own-account moves, investments and cancelled pairs are neither.
// Each transaction is converted at the NBU rate of its day.
function cashFlow(transactions: Transaction[], accounts: Account[], categories: Category[], convertOn: ConvertOn, currency: Currency, now: Date) {
  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]))
  const parentOf = new Map(categories.flatMap((c) => [[c.id, c] as const, ...c.subcategories.map((s) => [s.id, c] as const)]))
  const months = new Map<string, Month>()
  for (let i = MONTHS; i >= 1; i--) {
    const key = monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString())
    months.set(key, { month: key, income: 0, spent: 0, fromRates: 0 })
  }
  let first: string | undefined
  for (const t of transactions) {
    if (t.cancelled) continue
    const key = monthKey(t.time)
    if (!first || key < first) first = key
    const row = months.get(key)
    const parent = parentOf.get(t.category)
    if (!row || !parent) continue
    const amount = convertOn(t.amount, currencyOf.get(t.accountId)!, currency, dayKey(t.time))
    if (amount === undefined) return undefined
    if (parent.id === 'income') row.income += amount
    else if (parent.spending) row.spent -= amount
  }
  const days = dailyValues(accounts, transactions, convertOn, currency, now)
  if (!days) return undefined
  for (const d of days) {
    const row = months.get(d.day.slice(0, 7))
    if (row) row.fromRates += d.gain
  }
  return [...months.values()].filter((m) => first !== undefined && m.month >= first)
}

type CashFlowProps = {
  transactions: Transaction[] | undefined
  accounts: Account[]
  categories: Category[]
  convertOn: ConvertOn
  currency: Currency
  // undefined until a budget exists to hold the income
  onUseIncome: ((amount: number, currency: Currency) => void) | undefined
}

export function CashFlow({ transactions, accounts, categories, convertOn, currency, onUseIncome }: CashFlowProps) {
  const [now] = useState(() => new Date())
  if (!transactions || !categories.length) return null
  const months = cashFlow(transactions, accounts, categories, convertOn, currency, now)
  if (!months?.length) return null

  const income = months.reduce((s, m) => s + m.income, 0)
  const spent = months.reduce((s, m) => s + m.spent, 0)
  const fromRates = months.reduce((s, m) => s + m.fromRates, 0)
  // from totals rather than a median of monthly rates, which a month of tiny income would blow up
  const rate = income > 0 ? (income - spent) / income : undefined
  const typicalIncome = median(months.map((m) => m.income))
  const typicalSpent = median(months.map((m) => m.spent))
  // Runway assumes every month costs the median; the middle half of months, the lowest and the worst one show how far off that can be
  const spread = months.length >= 4
    ? { low: quantile(months.map((m) => m.spent), 0.25), high: quantile(months.map((m) => m.spent), 0.75), lowest: months.reduce((a, b) => (b.spent < a.spent ? b : a)), worst: months.reduce((a, b) => (b.spent > a.spent ? b : a)) }
    : undefined
  const tone = (x: number) => (x >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')
  const tile = 'rounded-xl bg-zinc-50 p-3 sm:p-4 dark:bg-zinc-800/50'
  const big = 'mt-1 text-xl font-semibold tabular-nums sm:text-2xl'

  return (
    <section className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Cash flow</h2>
        <span className={muted}>{months.length} complete {months.length === 1 ? 'month' : 'months'}, all accounts</span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className={tile}>
          <p className={muted}>Income per month</p>
          <p className={`${big} text-zinc-900 dark:text-zinc-100`}>{format(typicalIncome, currency)}</p>
          <p className={`mt-1 text-sm ${muted}`}>median</p>
          {onUseIncome && typicalIncome > 0 && (
            <button type="button" className={`mt-1 text-sm ${linkButton}`} onClick={() => onUseIncome(typicalIncome, currency)}>
              Use as income in Runway
            </button>
          )}
        </div>
        <div className={tile}>
          <p className={muted}>
            <span className="cursor-help underline decoration-dotted underline-offset-2" title={SPENDING_NOTE}>Spending per month</span>
          </p>
          <p className={`${big} text-zinc-900 dark:text-zinc-100`}>{format(typicalSpent, currency)}</p>
          <p className={`mt-1 text-sm ${muted}`}>median</p>
          {spread && (
            <p className={`mt-1 text-sm tabular-nums ${muted}`}>
              usually {wholeMoney(spread.low, currency)}–{wholeMoney(spread.high, currency)}
              <br />
              lowest {wholeMoney(spread.lowest.spent, currency)} in {monthLabel.format(new Date(`${spread.lowest.month}-01T00:00:00`))}
              <br />
              worst {wholeMoney(spread.worst.spent, currency)} in {monthLabel.format(new Date(`${spread.worst.month}-01T00:00:00`))}
            </p>
          )}
        </div>
        <div className={tile}>
          <p className={muted}>Savings rate</p>
          <p className={`${big} ${rate === undefined ? 'text-zinc-400' : tone(rate)}`}>{rate === undefined ? '—' : `${percentOf(rate)}%`}</p>
          <p className={`mt-1 text-sm tabular-nums ${rate === undefined ? muted : tone(rate)}`}>
            {rate === undefined
              ? 'no income recorded'
              : `${income >= spent ? '+' : '−'}${format(Math.abs(income - spent) / months.length, currency)} kept per month on average`}
          </p>
          {Math.round(fromRates) !== 0 && (
            <p className={`mt-1 text-sm tabular-nums ${muted}`} title={RATES_NOTE}>
              {fromRates >= 0 ? '+' : '−'}{format(Math.abs(fromRates), currency)} from exchange rates
            </p>
          )}
        </div>
      </div>

      <table className="mt-4 w-full text-sm tabular-nums">
        <thead className={muted}>
          <tr className="text-right [&>th]:pb-1 [&>th]:font-normal">
            <th className="text-left">Month</th>
            <th>Income</th>
            <th className="cursor-help" title={SPENDING_NOTE}>Spent</th>
            <th>Saved</th>
            <th className="cursor-help" title={RATES_NOTE}>Rates</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {months.toReversed().map((m) => {
            const net = m.income - m.spent
            return (
              <tr key={m.month} className="text-right text-zinc-900 dark:text-zinc-100 [&>td]:py-1.5">
                <td className="text-left text-zinc-500 dark:text-zinc-400">{monthLabel.format(new Date(`${m.month}-01T00:00:00`))}</td>
                <td>{wholeMoney(m.income, currency)}</td>
                <td>{wholeMoney(m.spent, currency)}</td>
                <td className={tone(net)}>{m.income > 0 ? `${percentOf(net / m.income)}%` : wholeMoney(net, currency)}</td>
                <td className={Math.round(m.fromRates) === 0 ? muted : tone(m.fromRates)}>
                  {Math.round(m.fromRates) === 0 ? '—' : `${m.fromRates > 0 ? '+' : '−'}${wholeMoney(Math.abs(m.fromRates), currency)}`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
