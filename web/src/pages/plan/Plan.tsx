import { EmergencyFund } from './EmergencyFund'
import { Goals } from './Goals'
import { PlannedExpenses } from './PlannedExpenses'
import { Runway } from './Runway'
import { Timeline } from './Timeline'
import { Wishlist } from './Wishlist'
import { ErrorBanner } from '../../components/ErrorBanner'
import { InfoTip } from '../../components/InfoTip'
import { useFinance } from '../../lib/finance'
import { annualRate } from '../../lib/inflation'
import { useState } from 'react'
import { api } from '../../lib/api'
import { currencies, type Budget, type Currency } from '../../lib/types'

export function Plan() {
  const {
    budget,
    setBudget,
    inflation: cpi,
    error,
    convert,
    availableIn,
    reserveIn,
    incomeIn,
    keptIncomeIn,
    minimalIn,
    forGoalsIn,
    cushion,
    netIn,
    salesIn,
    spendIn,
    plannedSpendIn,
    planned,
  } = useFinance({ withInflation: true })
  // spending in the estimates grows by the last 12 months' inflation
  const inflation = cpi && annualRate(cpi)

  // the currency the plan is shown in: picked here and remembered, else the spending's
  const [picked, setPicked] = useState<Currency | undefined>(readPicked)
  const currency = picked ?? budget?.currency ?? 'UAH'
  function pick(c: Currency) {
    setPicked(c)
    try {
      localStorage.setItem(PICKED_KEY, c)
    } catch {
      // private mode: the pick lasts until reload
    }
  }
  // saves a monthly spending in the shown currency as the budget's, in the budget's own currency
  async function saveBudgetSpend(amount: number) {
    if (!budget) return
    const monthlySpend = Math.round((convert(amount, currency, budget.currency) ?? amount) * 100) / 100
    // the API takes optional fields left out rather than null
    const body = Object.fromEntries(Object.entries({ ...budget, monthlySpend }).filter(([, v]) => v !== null))
    setBudget(await api<Budget>('/budget', { method: 'PUT', body: JSON.stringify(body) }))
  }
  // a what-if from the timeline includes the turned-on planned expenses, which stay on their own
  const saveSpending = (amount: number) => saveBudgetSpend(amount - plannedSpendIn(currency))
  // an ongoing planned expense that is now real: into the budget's spending, off the planned list
  async function startPaying(id: number, monthly: number) {
    const budgetSpend = (spendIn(currency) ?? 0) - plannedSpendIn(currency)
    await saveBudgetSpend(budgetSpend + monthly)
    await api(`/planned-expenses/${id}`, { method: 'DELETE' })
  }
  // the fund in the shown currency; finance computes it in the spending's
  const fund = cushion && {
    months: cushion.months,
    amount: convert(cushion.amount, cushion.currency, currency) ?? cushion.amount,
    available: availableIn(currency) ?? cushion.available,
    currency,
  }

  return (
    <>
      <header className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold sm:text-3xl tracking-tight text-zinc-900 dark:text-zinc-100">Plan</h1>
        <InfoTip label="About the plan">
          How long your savings last, and when you reach your goals, from your balances and the spending and incomes you
          set.
        </InfoTip>
        <div
          role="group"
          aria-label="Show the plan in"
          className="ml-auto inline-flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800"
        >
          {currencies.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === currency}
              onClick={() => pick(c)}
              className={`rounded-md px-2.5 py-1 text-sm font-medium ${
                c === currency
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </header>

      <ErrorBanner>{error}</ErrorBanner>

      <Timeline
        forGoalsIn={forGoalsIn}
        convert={convert}
        netIn={netIn}
        cushion={fund}
        usualSpend={spendIn(currency)}
        essentialSpend={minimalIn(currency)}
        keptIncome={keptIncomeIn(currency)}
        currency={currency}
        onUseSpending={saveSpending}
      />

      <PlannedExpenses
        planned={planned}
        convert={convert}
        availableIn={availableIn}
        spendIn={spendIn}
        keptIncomeIn={keptIncomeIn}
        netIn={netIn}
        currency={currency}
        onStartPaying={budget ? startPaying : undefined}
      />

      {budget !== undefined && (
        <Runway
          key={JSON.stringify(budget)}
          saved={budget}
          onSaved={setBudget}
          availableIn={availableIn}
          reserveIn={reserveIn}
          incomeIn={incomeIn}
          keptIncomeIn={keptIncomeIn}
          minimalIn={minimalIn}
          spendIn={spendIn}
          sales={salesIn(currency)}
          inflation={inflation}
          currency={currency}
        />
      )}

      {budget && availableIn(currency) !== undefined && spendIn(currency) !== undefined && (
        <EmergencyFund
          available={availableIn(currency)!}
          essential={minimalIn(currency)}
          usual={spendIn(currency)!}
          kept={keptIncomeIn(currency)}
          months={budget.targetMonths}
          net={netIn(currency)}
          inflation={inflation}
          currency={currency}
        />
      )}

      <Goals
        forGoalsIn={forGoalsIn}
        convert={convert}
        cushion={fund}
        netIn={netIn}
        spendIn={spendIn}
        inflation={inflation}
        currency={currency}
      />

      <Wishlist forGoalsIn={forGoalsIn} convert={convert} netIn={netIn} currency={currency} />
    </>
  )
}

const PICKED_KEY = 'plan-currency'

// the remembered pick, if storage is readable and holds a known currency
function readPicked(): Currency | undefined {
  try {
    const value = localStorage.getItem(PICKED_KEY)
    return currencies.find((c) => c === value)
  } catch {
    return undefined
  }
}
