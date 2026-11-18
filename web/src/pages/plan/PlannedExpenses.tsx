import { useState, type FormEvent } from 'react'
import { ConfirmButton } from '../../components/ConfirmButton'
import { ErrorText } from '../../components/ErrorText'
import { MoneyInput } from '../../components/MoneyInput'
import { Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { format, wholeMoney } from '../../lib/format'
import { button, card, inputBox, linkButton, muted } from '../../lib/styles'
import type { Convert, Currency, PlannedExpense } from '../../lib/types'

type Props = {
  planned: PlannedExpense[]
  convert: Convert
  // these already count the turned-on planned expenses; undefined while loading or without a budget
  availableIn: (c: Currency) => number | undefined
  spendIn: (c: Currency) => number | undefined
  keptIncomeIn: (c: Currency) => number
  netIn: (c: Currency) => number | undefined
  currency: Currency
  // moves an ongoing one into the budget's spending; undefined without a budget
  onStartPaying?: (id: number, monthly: number) => Promise<unknown>
}

// months the savings last without job income; Infinity when nothing is drawn from them
const runway = (available: number, spend: number, kept: number) =>
  spend - kept > 0 ? Math.max(0, available) / (spend - kept) : Infinity
const months = (m: number) => (m === Infinity ? 'no end' : `${m.toFixed(1)} months`)

// Costs being considered, like rent or a course. Turned on, every card below counts them: an ongoing one as
// monthly spending, one with months as its whole cost spent now. Each shows what it does to the runway either way.
export function PlannedExpenses({
  planned,
  convert,
  availableIn,
  spendIn,
  keptIncomeIn,
  netIn,
  currency: c,
  onStartPaying,
}: Props) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [amountCurrency, setAmountCurrency] = useState<Currency>('UAH')
  const [length, setLength] = useState('')
  const [error, setError] = useState('')

  async function act(action: () => Promise<unknown>) {
    try {
      await action()
      setError('')
    } catch (err) {
      setError((err as Error).message)
    }
  }
  const put = (p: PlannedExpense, changes: Partial<PlannedExpense>) => {
    const { id, ...rest } = { ...p, ...changes }
    return api(`/planned-expenses/${id}`, { method: 'PUT', body: JSON.stringify(rest) })
  }
  function add(e: FormEvent) {
    e.preventDefault()
    act(async () => {
      await api('/planned-expenses', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          amount: Number(amount),
          currency: amountCurrency,
          months: length === '' ? null : Number(length),
          active: false,
        }),
      })
      setName('')
      setAmount('')
      setLength('')
    })
  }

  // the runway and surplus without this expense and with it, whether it is on now or not
  function effect(p: PlannedExpense) {
    const available = availableIn(c)
    const spend = spendIn(c)
    const net = netIn(c)
    const monthly = convert(p.amount, p.currency, c)
    if (available === undefined || spend === undefined || net === undefined || monthly === undefined) return undefined
    const kept = keptIncomeIn(c)
    const ongoing = p.months === null
    const total = monthly * (p.months ?? 1)
    const on = p.active ? 1 : 0
    const without = {
      available: available + (ongoing ? 0 : total * on),
      spend: spend - (ongoing ? monthly * on : 0),
      net: net + (ongoing ? monthly * on : 0),
    }
    const withIt = {
      available: without.available - (ongoing ? 0 : total),
      spend: without.spend + (ongoing ? monthly : 0),
      net: without.net - (ongoing ? monthly : 0),
    }
    const runwayLine = `Runway without income ${months(runway(without.available, without.spend, kept))} → ${months(runway(withIt.available, withIt.spend, kept))}`
    const money = (n: number) => `${n >= 0 ? '+' : '−'}${wholeMoney(Math.abs(n), c)}`
    return ongoing
      ? `${runwayLine} · surplus ${money(without.net)} → ${money(withIt.net)} a month`
      : `${wholeMoney(total, c)} in all · ${runwayLine}${without.net > 0 ? ` · ${(total / without.net).toFixed(1)} months of your surplus` : ''}`
  }

  return (
    <section className={card}>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Planned expenses</h2>
      <p className={muted}>
        Costs you are considering, like rent or a course. Turned on, the timeline and every card below count them: an
        ongoing one as monthly spending, one with months as its whole cost spent now.
      </p>

      <ul className="mt-4 flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
        {planned.map((p) => (
          <li key={p.id} className="py-3 first:pt-0">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={p.active}
                onChange={(e) => act(() => put(p, { active: e.target.checked }))}
                aria-label={`Count ${p.name} in the plan`}
                className="size-4 accent-indigo-600"
              />
              <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-3">
                <span className="block break-words font-medium text-zinc-900 sm:truncate dark:text-zinc-100">
                  {p.name}
                </span>
                <span className="flex shrink-0 flex-wrap items-center gap-x-3">
                  <span className={`tabular-nums ${muted}`}>
                    {format(p.amount, p.currency)} a month{p.months !== null && ` × ${p.months}`}
                  </span>
                  {p.months === null && onStartPaying && (
                    <button
                      type="button"
                      onClick={() => act(() => onStartPaying(p.id, convert(p.amount, p.currency, c) ?? p.amount))}
                      title="Add it to your monthly spending in Runway and take it off this list"
                      className={`text-sm ${linkButton}`}
                    >
                      Start paying
                    </button>
                  )}
                </span>
              </div>
              <ConfirmButton
                label={`Remove ${p.name}`}
                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600 dark:hover:bg-zinc-800"
                title={`Remove “${p.name}”?`}
                confirmLabel="Remove"
                onConfirm={() => act(() => api(`/planned-expenses/${p.id}`, { method: 'DELETE' }))}
              >
                <Trash2 />
              </ConfirmButton>
            </div>
            <p className={`mt-1 pl-7 tabular-nums ${muted}`}>
              {effect(p) ?? 'Set your monthly spending to see the effect.'}
            </p>
          </li>
        ))}
      </ul>
      {planned.length === 0 && <p className={`py-4 text-center ${muted}`}>Nothing planned yet.</p>}
      <ErrorText>{error}</ErrorText>

      <form
        className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50"
        onSubmit={add}
      >
        <input
          placeholder="Rent, English course…"
          required
          maxLength={100}
          pattern=".*\S.*"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Expense name"
          className={`min-w-40 flex-1 px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 ${inputBox}`}
        />
        <div className="w-56">
          <MoneyInput
            label="Amount per month"
            required
            min="0.01"
            placeholder="per month"
            value={amount}
            onChange={setAmount}
            currency={amountCurrency}
            onCurrency={setAmountCurrency}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          for
          <input
            type="number"
            step="1"
            min="1"
            max="120"
            placeholder="no end"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            className={`w-20 px-2 py-2 text-right text-sm text-zinc-900 tabular-nums outline-none placeholder:text-zinc-400 dark:text-zinc-100 ${inputBox}`}
          />
          months
        </label>
        <button className={button}>Add</button>
      </form>
    </section>
  )
}
