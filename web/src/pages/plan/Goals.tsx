import { useState, type FormEvent } from 'react'
import { ReachDate } from './ReachDate'
import { Skeleton, ErrorText, MoneyInput } from '../../components/controls'
import { Calendar, Pencil, Trash2 } from 'lucide-react'
import { CurrencyIcon } from '../../components/icons'
import { api, useApi } from '../../lib/api'
import { format } from '../../lib/format'
import { card, muted, inputBox, button } from '../../lib/styles'
import type { Currency, Goal } from '../../lib/types'

type Cushion = { months: number, amount: number, available: number, currency: Currency }

type GoalsProps = {
  // available savings minus the months-without-income cushion
  forGoalsIn: (c: Currency) => number | undefined
  cushion: Cushion | undefined
  // income minus spending per month; undefined when spending is not set
  netIn: (c: Currency) => number | undefined
  // monthly spending, which grows with inflation while income stays flat
  spendIn: (c: Currency) => number | undefined
  // yearly inflation, e.g. 0.11; undefined while unknown
  inflation: number | undefined
}

export function Goals({ forGoalsIn, cushion, netIn, spendIn, inflation }: GoalsProps) {
  const query = useApi<Goal[]>('/goals')
  const goals = query.data ?? []
  // the goal shown as a form instead of its progress
  const [editing, setEditing] = useState<number>()
  // a failed delete, else a failed load; the forms show their own save errors
  const [saveError, setError] = useState('')
  const error = saveError || query.error?.message || ''

  const add = (values: GoalValues) => api<Goal>('/goals', { method: 'POST', body: JSON.stringify(values) })
  async function update(goal: Goal, values: GoalValues) {
    await api<Goal>(`/goals/${goal.id}`, { method: 'PUT', body: JSON.stringify(values) })
    setEditing(undefined)
  }

  async function remove(goal: Goal) {
    if (!confirm(`Delete goal "${goal.name}"?`)) return
    try {
      await api(`/goals/${goal.id}`, { method: 'DELETE' })
    } catch (err) {
      setError((err as Error).message)
    }
  }

  function status(goal: Goal, have: number) {
    if (have >= goal.target) return <span className="font-medium text-emerald-600 dark:text-emerald-400">Reached</span>
    return <ReachDate need={goal.target - have} net={netIn(goal.currency)} spend={spendIn(goal.currency)} inflation={inflation} currency={goal.currency} />
  }

  return (
    <section className={card}>
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Goals</h2>
        <p className={muted}>Measured against your available savings. Each goal assumes your whole monthly surplus goes to it.</p>
        {cushion && (
          <p className={`mt-1 flex flex-wrap items-center gap-x-2 tabular-nums ${muted}`}>
            <Calendar />
            <span>{format(cushion.amount, cushion.currency)} kept as a {cushion.months}-month cushion</span>
            {cushion.available < cushion.amount && (
              <span className="text-amber-700 dark:text-amber-400">· {format(cushion.amount - Math.max(0, cushion.available), cushion.currency)} short of covering it</span>
            )}
          </p>
        )}
      </div>

      <ul className="mt-4 flex flex-col gap-5">
        {goals.map((g) => {
          const forGoals = forGoalsIn(g.currency)
          const have = Math.max(0, forGoals ?? 0)
          const progress = Math.min(1, have / g.target)
          if (editing === g.id) {
            return (
              <li key={g.id}>
                <GoalForm initial={g} submitLabel="Save" onSave={(values) => update(g, values)} onCancel={() => setEditing(undefined)} />
              </li>
            )
          }
          return (
            <li key={g.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <CurrencyIcon currency={g.currency} />
                  <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{g.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`tabular-nums ${muted}`}>
                    {format(Math.min(have, g.target), g.currency)} / {format(g.target, g.currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditing(g.id)}
                    aria-label={`Edit goal ${g.name}`}
                    className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-indigo-600 dark:hover:bg-zinc-800"
                  >
                    <Pencil />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(g)}
                    aria-label={`Delete goal ${g.name}`}
                    className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600 dark:hover:bg-zinc-800"
                  >
                    <Trash2 />
                  </button>
                </div>
              </div>
              <div
                role="progressbar"
                aria-label={`${g.name} progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
                className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
              >
                <div
                  className={`h-full rounded-full transition-[width] ${progress >= 1 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-sm">{forGoals === undefined ? <Skeleton /> : status(g, have)}</p>
            </li>
          )
        })}
      </ul>
      {goals.length === 0 && <p className={`py-6 text-center ${muted}`}>No goals yet. Add one below.</p>}
      <ErrorText>{error}</ErrorText>

      <div className="mt-4">
        <GoalForm submitLabel="Add goal" onSave={add} />
      </div>
    </section>
  )
}

type GoalValues = { name: string, target: number, currency: Currency }

type GoalFormProps = {
  // the goal being edited; without it the form adds one and clears itself after
  initial?: GoalValues
  submitLabel: string
  onSave: (values: GoalValues) => Promise<unknown>
  onCancel?: () => void
}

// name, amount and currency of a goal, to add one or edit it in place
function GoalForm({ initial, submitLabel, onSave, onCancel }: GoalFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [target, setTarget] = useState(initial ? String(initial.target) : '')
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? 'USD')
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    try {
      await onSave({ name, target: Number(target), currency })
      setError('')
      if (!initial) {
        setName('')
        setTarget('')
      }
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <form className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50" onSubmit={submit}>
      <div className="flex flex-wrap items-center gap-3">
        <input
          placeholder="Goal, e.g. Car"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Goal name"
          className={`min-w-40 flex-1 px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 ${inputBox}`}
        />
        <div className="w-56">
          <MoneyInput label="Goal amount" required min="0.01" placeholder="Amount" value={target} onChange={setTarget} currency={currency} onCurrency={setCurrency} />
        </div>
        <button type="submit" className={button}>{submitLabel}</button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700">
            Cancel
          </button>
        )}
      </div>
      <ErrorText>{error}</ErrorText>
    </form>
  )
}
