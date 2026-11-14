import { Goals } from '../components/Goals'
import { Runway } from '../components/Runway'
import { ErrorBanner, InfoTip } from '../components/controls'
import { useFinance } from '../lib/finance'

export function Plan() {
  const { budget, setBudget, error, availableIn, reserveIn, incomeIn, keptIncomeIn, minimalIn, forGoalsIn, cushion, netIn } = useFinance()

  return (
    <>
      <header className="flex items-center gap-2">
        <h1 className="text-2xl font-bold sm:text-3xl tracking-tight text-zinc-900 dark:text-zinc-100">Plan</h1>
        <InfoTip label="About the plan">How long your savings last, and when you reach your goals, from your balances and the spending and incomes you set.</InfoTip>
      </header>

      <ErrorBanner>{error}</ErrorBanner>

      {budget !== undefined && (
        <Runway key={JSON.stringify(budget)} saved={budget} onSaved={setBudget} availableIn={availableIn} reserveIn={reserveIn} incomeIn={incomeIn} keptIncomeIn={keptIncomeIn} minimalIn={minimalIn} />
      )}

      <Goals forGoalsIn={forGoalsIn} cushion={cushion} netIn={netIn} />
    </>
  )
}
