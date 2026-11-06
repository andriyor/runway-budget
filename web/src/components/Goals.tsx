import { useEffect, useState, type FormEvent } from 'react'
import { AVG_DAYS_IN_MONTH } from './Runway'
import { Skeleton, ErrorText, MoneyInput } from './controls'
import { CurrencyIcon, CalendarIcon, TrashIcon } from './icons'
import { api } from '../lib/api'
import { format } from '../lib/format'
import { card, muted, inputBox, button } from '../lib/styles'
import type { Currency, Goal } from '../lib/types'

type Cushion = { months: number, amount: number, available: number, currency: Currency }

type GoalsProps = {
  // available savings minus the months-without-salary cushion
  forGoalsIn: (c: Currency) => number | undefined
  cushion: Cushion | undefined
  // salary minus spending per month; undefined when spending is not set
  netIn: (c: Currency) => number | undefined
}

export function Goals({ forGoalsIn, cushion, netIn }: GoalsProps) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [error, setError] = useState('')
  const [now] = useState(Date.now)

  useEffect(() => {
    api<Goal[]>('/goals').then(setGoals).catch((e) => setError(e.message))
  }, [])

  async function add(e: FormEvent) {
    e.preventDefault()
    try {
      const created = await api<Goal>('/goals', {
        method: 'POST',
        body: JSON.stringify({ name, target: Number(target), currency }),
      })
      setGoals((list) => [...list, created])
      setName('')
      setTarget('')
      setError('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function remove(goal: Goal) {
    if (!confirm(`Delete goal "${goal.name}"?`)) return
    try {
      await api(`/goals/${goal.id}`, { method: 'DELETE' })
      setGoals((list) => list.filter((g) => g.id !== goal.id))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  function status(goal: Goal, have: number) {
    if (have >= goal.target) return <span className="font-medium text-emerald-600 dark:text-emerald-400">Reached</span>
    const net = netIn(goal.currency)
    if (net === undefined) return <span className={muted}>Set monthly spending and salary to see when.</span>
    if (net <= 0) return <span className="text-rose-600 dark:text-rose-400">Not reachable: you spend at least as much as you earn.</span>
    const months = (goal.target - have) / net
    const when = new Date(now + months * AVG_DAYS_IN_MONTH * 864e5)
    return (
      <span className="text-zinc-700 tabular-nums dark:text-zinc-300">
        In <strong>{months.toFixed(1)} months</strong>
        <span className="text-zinc-500 dark:text-zinc-400"> · {when.toLocaleDateString('uk-UA')} · saving {format(net, goal.currency)} per month</span>
      </span>
    )
  }

  return (
    <section className={card}>
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Goals</h2>
        <p className={muted}>Measured against your available savings. Each goal assumes your whole monthly surplus goes to it.</p>
        {cushion && (
          <p className={`mt-1 flex flex-wrap items-center gap-x-2 tabular-nums ${muted}`}>
            <CalendarIcon />
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
                    onClick={() => remove(g)}
                    aria-label={`Delete goal ${g.name}`}
                    className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600 dark:hover:bg-zinc-800"
                  >
                    <TrashIcon />
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

      <form className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50" onSubmit={add}>
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
        <button className={button}>Add goal</button>
      </form>
    </section>
  )
}
