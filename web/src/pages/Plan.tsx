import { EmergencyFund } from '../components/EmergencyFund'
import { Goals } from '../components/Goals'
import { Runway } from '../components/Runway'
import { ErrorBanner, InfoTip } from '../components/controls'
import { useFinance } from '../lib/finance'
import { annualRate } from '../lib/inflation'
import type { Currency } from '../lib/types'

export function Plan() {
  const { budget, setBudget, inflation: cpi, error, convert, availableIn, reserveIn, incomeIn, keptIncomeIn, minimalIn, forGoalsIn, cushion, netIn } = useFinance({ withInflation: true })
  // spending in the estimates grows by the last 12 months' inflation
  const inflation = cpi && annualRate(cpi)
  const spendIn = (c: Currency) => (budget ? convert(budget.monthlySpend, budget.currency, c) : undefined)

  return (
    <>
      <header className="flex items-center gap-2">
        <h1 className="text-2xl font-bold sm:text-3xl tracking-tight text-zinc-900 dark:text-zinc-100">Plan</h1>
        <InfoTip label="About the plan">How long your savings last, and when you reach your goals, from your balances and the spending and incomes you set.</InfoTip>
      </header>

      <ErrorBanner>{error}</ErrorBanner>

      {budget !== undefined && (
        <Runway key={JSON.stringify(budget)} saved={budget} onSaved={setBudget} availableIn={availableIn} reserveIn={reserveIn} incomeIn={incomeIn} keptIncomeIn={keptIncomeIn} minimalIn={minimalIn} inflation={inflation} />
      )}

      {budget && availableIn(budget.currency) !== undefined && (
        <EmergencyFund
          available={availableIn(budget.currency)!}
          essential={minimalIn(budget.currency)}
          usual={budget.monthlySpend}
          kept={keptIncomeIn(budget.currency)}
          months={budget.targetMonths}
          currency={budget.currency}
        />
      )}

      <Goals forGoalsIn={forGoalsIn} cushion={cushion} netIn={netIn} spendIn={spendIn} inflation={inflation} />
    </>
  )
}
