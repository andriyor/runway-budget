import { CashFlow } from '../components/CashFlow'
import { Recurring } from '../components/Recurring'
import { ThisMonth } from '../components/ThisMonth'
import { YearOverYear } from '../components/YearOverYear'
import { ErrorBanner, InfoTip } from '../components/controls'
import { api } from '../lib/api'
import { budgetWith } from '../lib/budget'
import { useFinance } from '../lib/finance'
import type { Budget, Currency } from '../lib/types'

export function Spending() {
  const { accounts, rates, budget, setBudget, categories, transactions, error, setError, currency, convert, convertOn } = useFinance({ withTransactions: true })

  // the cash flow's median income becomes one of Runway's incomes, keeping the rest of the budget
  async function incomeFromCashFlow(amount: number, c: Currency) {
    try {
      setBudget(await api<Budget>('/budget', { method: 'PUT', body: JSON.stringify(budgetWith(budget!, 'income', Math.round(amount), c)) }))
    } catch (err) {
      setError(`Runway: ${(err as Error).message}`)
    }
  }

  const shared = { transactions, accounts, categories, convert, currency }

  return (
    <>
      <header className="flex items-center gap-2">
        <h1 className="text-2xl font-bold sm:text-3xl tracking-tight text-zinc-900 dark:text-zinc-100">Spending</h1>
        <InfoTip label="About spending">All accounts together, in Runway's currency: Cash flow at each day's NBU rate, the other cards at today's. Net of refunds, without own-account moves and investments.</InfoTip>
      </header>

      <ErrorBanner>{error}</ErrorBanner>

      {rates && (
        <>
          <ThisMonth {...shared} planned={budget?.monthlySpend} />
          <CashFlow transactions={transactions} accounts={accounts} categories={categories} convertOn={convertOn} currency={currency} onUseIncome={budget ? incomeFromCashFlow : undefined} />
          <Recurring {...shared} />
          <YearOverYear {...shared} />
        </>
      )}
    </>
  )
}
