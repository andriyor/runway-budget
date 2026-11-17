import { useState, type FormEvent } from 'react'
import { ReachDate } from './ReachDate'
import { Skeleton, ErrorText, MoneyInput } from '../../components/controls'
import { Calendar, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import { CurrencyIcon } from '../../components/icons'
import { api, setCached, useApi } from '../../lib/api'
import { format } from '../../lib/format'
import { card, muted, inputBox, button } from '../../lib/styles'
import { goalProgress } from '../../lib/goals'
import { monthsToSave } from '../../lib/inflation'
import type { Convert, Currency, Goal } from '../../lib/types'

type Cushion = { months: number, amount: number, available: number, currency: Currency }

type GoalsProps = {
  // available savings minus the months-without-income cushion
  forGoalsIn: (c: Currency) => number | undefined
  convert: Convert
  cushion: Cushion | undefined
  // income minus spending per month; undefined when spending is not set
  netIn: (c: Currency) => number | undefined
  // monthly spending, which grows with inflation while income stays flat
  spendIn: (c: Currency) => number | undefined
  // yearly inflation, e.g. 0.11; undefined while unknown
  inflation: number | undefined
}

export function Goals({ forGoalsIn, convert, cushion, netIn, spendIn, inflation }: GoalsProps) {
  const query = useApi<Goal[]>('/goals')
  const all = query.data ?? []
  // wishes share the list and the order, but get no savings; the wishlist shows them
  const goals = all.filter((g) => !g.wish)
  const wishes = all.filter((g) => g.wish)
  const progressOf = goalProgress(goals, convert, forGoalsIn)
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

  async function move(index: number, by: -1 | 1) {
    const next = [...goals]
    ;[next[index], next[index + by]] = [next[index + by], next[index]]
    const list = [...next, ...wishes]
    setCached('/goals', list)
    try {
      await api('/goals/order', { method: 'PUT', body: JSON.stringify({ ids: list.map((g) => g.id) }) })
    } catch (err) {
      setCached('/goals', all)
      setError(`Reorder: ${(err as Error).message}`)
    }
  }

  async function remove(goal: Goal) {
    if (!confirm(`Delete goal "${goal.name}"?`)) return
    try {
      await api(`/goals/${goal.id}`, { method: 'DELETE' })
    } catch (err) {
      setError((err as Error).message)
    }
  }

  // need: what is still to save for this goal and every goal above it
  function status(goal: Goal, have: number, need: number) {
    if (have >= goal.target) return <span className="font-medium text-emerald-600 dark:text-emerald-400">Reached</span>
    return <ReachDate need={need} net={netIn(goal.currency)} spend={spendIn(goal.currency)} inflation={inflation} currency={goal.currency} hideUnreachable />
  }

  // goals that spending, growing with inflation, catches up with income before; said once for the list
  const unreachable = inflation !== undefined && inflation > 0
    ? goals.filter((g, i) => {
        const need = progressOf[i]?.need
        const spend = spendIn(g.currency)
        const net = netIn(g.currency)
        return need !== undefined && need > 0 && spend !== undefined && net !== undefined && net > 0
          && monthsToSave(need, spend, spend + net, inflation) === undefined
      })
    : []

  return (
    <section className={card}>
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Goals</h2>
        <p className={muted}>Your available savings and monthly surplus fill goals from the top: each goal waits for the ones above it.</p>
        {cushion && (
          <p className={`mt-1 flex flex-wrap items-center gap-x-2 tabular-nums ${muted}`}>
            <Calendar />
            <span>{format(cushion.amount, cushion.currency)} kept as a {cushion.months}-month cushion</span>
            {cushion.available < cushion.amount && (
              <span className="text-amber-700 dark:text-amber-400">· {format(cushion.amount - Math.max(0, cushion.available), cushion.currency)} short of covering it</span>
            )}
          </p>
        )}
        {unreachable.length > 0 && (
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
            With {(inflation! * 100).toFixed(1)}% inflation, spending catches up with income before{' '}
            {unreachable.length === goals.length ? 'any goal is' : <><NameList names={unreachable.map((g) => g.name)} /> {unreachable.length === 1 ? 'is' : 'are'}</>} reached.
          </p>
        )}
      </div>

      <ul className="mt-4 flex flex-col gap-5">
        {goals.map((g, i) => {
          const p = progressOf[i]
          const have = p?.have ?? 0
          const progress = have / g.target
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
                  <div className="-ml-2 flex flex-col">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move goal ${g.name} up`} className={moveButton}>
                      <ChevronUp strokeWidth={2} />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === goals.length - 1} aria-label={`Move goal ${g.name} down`} className={moveButton}>
                      <ChevronDown strokeWidth={2} />
                    </button>
                  </div>
                  <CurrencyIcon currency={g.currency} />
                  <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{g.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`tabular-nums ${muted}`}>
                    {format(have, g.currency)} / {format(g.target, g.currency)}
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
              <p className="mt-1.5 text-sm">{p === undefined ? <Skeleton /> : status(g, p.have, p.need)}</p>
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

// "Car, House and Trip", names in bold
export function NameList({ names }: { names: string[] }) {
  return new Intl.ListFormat('en', { type: 'conjunction' }).formatToParts(names)
    .map((part, i) => (part.type === 'element' ? <strong key={i}>{part.value}</strong> : part.value))
}

const moveButton = 'rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:invisible dark:hover:bg-zinc-800 dark:hover:text-zinc-200'

export type GoalValues = { name: string, target: number, currency: Currency, wish?: boolean }

type GoalFormProps = {
  // the goal being edited; without it the form adds one and clears itself after
  initial?: GoalValues
  submitLabel: string
  onSave: (values: GoalValues) => Promise<unknown>
  onCancel?: () => void
  // adds a wish instead of a goal
  wish?: boolean
}

// name, amount and currency of a goal or wish, to add one or edit it in place
export function GoalForm({ initial, submitLabel, onSave, onCancel, wish }: GoalFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [target, setTarget] = useState(initial ? String(initial.target) : '')
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? 'USD')
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    try {
      await onSave({ name, target: Number(target), currency, ...(!initial && wish && { wish }) })
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
          placeholder={wish ? 'Wish, e.g. Camera' : 'Goal, e.g. Car'}
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label={wish ? 'Wish name' : 'Goal name'}
          className={`min-w-40 flex-1 px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 ${inputBox}`}
        />
        <div className="w-56">
          <MoneyInput label={wish ? 'Price' : 'Goal amount'} required min="0.01" placeholder="Amount" value={target} onChange={setTarget} currency={currency} onCurrency={setCurrency} />
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
