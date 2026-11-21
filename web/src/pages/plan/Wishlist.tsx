import { useState } from 'react'
import { GoalForm, NameList, type GoalValues } from './Goals'
import { ConfirmButton } from '../../components/ConfirmButton'
import { ErrorText } from '../../components/ErrorText'
import { Skeleton } from '../../components/Skeleton'
import { CalendarDays, Hourglass, Pencil, Target, Trash2 } from 'lucide-react'
import { CurrencyIcon } from '../../components/icons'
import { api, useApi } from '../../lib/api'
import { format, withConverted } from '../../lib/format'
import { cumulativeTargets, delayMonths, monthsUntil, wishFit } from '../../lib/goals'
import { monthKey, monthLabel } from '../../lib/periods'
import { card, muted } from '../../lib/styles'
import type { Convert, Currency, Goal } from '../../lib/types'

type WishlistProps = {
  // available savings minus the months-without-income cushion
  forGoalsIn: (c: Currency) => number | undefined
  convert: Convert
  // income minus spending per month; undefined when spending is not set
  netIn: (c: Currency) => number | undefined
  // the currency the plan is shown in; prices keep their own, with this beside them
  currency: Currency
}

// Purchases you want but have not committed to: they get no savings, and each shows what buying it today would
// delay, so the cost is weighed in goal time rather than money
export function Wishlist({ forGoalsIn, convert, netIn, currency }: WishlistProps) {
  const query = useApi<Goal[]>('/goals')
  const all = query.data ?? []
  const goals = all.filter((g) => !g.wish)
  // planned ones first, by month, so each is paid after the ones planned before it; sort keeps the list order
  const wishes = all
    .filter((g) => g.wish)
    .sort((a, b) => (a.plannedFor ?? '9999').localeCompare(b.plannedFor ?? '9999'))
  const cumulative = cumulativeTargets(goals, convert)
  const [now] = useState(Date.now)
  const [editing, setEditing] = useState<number>()
  const [saveError, setError] = useState('')
  const error = saveError || query.error?.message || ''

  const add = (values: GoalValues) => api<Goal>('/goals', { method: 'POST', body: JSON.stringify(values) })
  async function update(wish: Goal, values: GoalValues) {
    await api<Goal>(`/goals/${wish.id}`, { method: 'PUT', body: JSON.stringify(values) })
    setEditing(undefined)
  }

  async function act(action: () => Promise<unknown>) {
    try {
      await action()
    } catch (err) {
      setError((err as Error).message)
    }
  }
  // it keeps its place in the order, which puts it below the goals added before it
  const commit = (w: Goal) =>
    act(() =>
      api(`/goals/${w.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: w.name, target: w.target, currency: w.currency, wish: false, plannedFor: null }),
      }),
    )
  const remove = (w: Goal) => act(() => api(`/goals/${w.id}`, { method: 'DELETE' }))

  // what buying `wish` today does to each goal; undefined while rates or balances load
  function impact(wish: Goal) {
    const rows = goals.map((g, i) => {
      const price = convert(wish.target, wish.currency, g.currency)
      const forGoals = forGoalsIn(g.currency)
      if (price === undefined || forGoals === undefined || cumulative[i] === undefined) return undefined
      // how much further from reached the goal ends up, in its currency
      const further = delayMonths(cumulative[i]!, forGoals, price, 1)
      return { goal: g, further, net: netIn(g.currency) }
    })
    if (rows.some((r) => r === undefined)) return undefined
    const hit = rows.map((r) => r!).filter((r) => r.further > 0.005)
    if (hit.length === 0)
      return <span className="font-medium text-emerald-600 dark:text-emerald-400">Buying it now delays no goal</span>
    // goals pushed back by the same amount share one phrase: "Car and House by 5.4 months"
    const groups = new Map<string, string[]>()
    for (const { goal, further, net } of hit) {
      const shown = convert(further, goal.currency, currency)
      const by =
        net !== undefined && net > 0
          ? `${(further / net).toFixed(1)} months`
          : shown === undefined
            ? format(further, goal.currency)
            : format(shown, currency)
      groups.set(by, [...(groups.get(by) ?? []), goal.name])
    }
    const every = groups.size === 1 && hit.length === goals.length && goals.length > 1
    return (
      <span className="text-amber-700 tabular-nums dark:text-amber-400">
        Buying it now pushes back{' '}
        {every
          ? `every goal by ${[...groups.keys()][0]}`
          : [...groups].map(([by, names], i) => (
              <span key={by}>
                {i > 0 && ' · '}
                <NameList names={names} /> by {by}
              </span>
            ))}
      </span>
    )
  }

  // whether a planned wish fits in its month: goals come first, then the wishes planned before it; undefined
  // while rates or balances load
  function fit(wish: Goal, index: number) {
    const c = wish.currency
    const saved = forGoalsIn(c)
    const ahead = [...goals, ...wishes.slice(0, index)].map((g) => convert(g.target, g.currency, c))
    if (saved === undefined || ahead.some((v) => v === undefined)) return undefined
    const reserved = ahead.reduce<number>((sum, v) => sum + v!, 0)
    const net = netIn(c) ?? 0
    const { left, earliest } = wishFit(reserved, saved, net, wish.target, monthsUntil(wish.plannedFor!, new Date(now)))
    const month = monthLabel(wish.plannedFor!)
    const amount = (v: number) => withConverted(v, c, currency, convert)
    if (left >= 0)
      return (
        <span className="font-medium text-emerald-600 tabular-nums dark:text-emerald-400">
          Fits in {month} after your goals, with {amount(left)} to spare
        </span>
      )
    const first = new Date(now)
    first.setMonth(first.getMonth() + earliest, 1)
    return (
      <span className="text-amber-700 tabular-nums dark:text-amber-400">
        Short by {amount(-left)} in {month} once your goals are covered ·{' '}
        {earliest === Infinity
          ? 'it does not fit while your savings stop growing'
          : earliest === 0
            ? 'it fits now'
            : `the first month it fits is ${monthLabel(monthKey(first.toISOString()))}`}
      </span>
    )
  }

  function cost(wish: Goal) {
    const net = netIn(wish.currency)
    if (net === undefined || net <= 0) return undefined
    return `${(wish.target / net).toFixed(1)} months of your surplus`
  }

  const days = (w: Goal) => Math.floor((now - Date.parse(w.addedAt)) / 864e5)

  return (
    <section className={card}>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Wishlist</h2>
      <p className={muted}>
        Things you want but have not committed to. They take no savings; each shows what buying it today would cost your
        goals, or, with a month picked, whether it fits then once your goals are covered.
      </p>

      <ul className="mt-4 flex flex-col gap-5">
        {wishes.map((w, index) => {
          if (editing === w.id) {
            return (
              <li key={w.id}>
                <GoalForm
                  wish
                  initial={w}
                  submitLabel="Save"
                  onSave={(values) => update(w, values)}
                  onCancel={() => setEditing(undefined)}
                />
              </li>
            )
          }
          const effect = w.plannedFor ? fit(w, index) : impact(w)
          return (
            <li key={w.id}>
              <div className="flex items-center gap-2">
                <CurrencyIcon currency={w.currency} />
                <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-3">
                  <span className="block break-words font-medium text-zinc-900 sm:truncate dark:text-zinc-100">
                    {w.name}
                  </span>
                  <span className={`block shrink-0 tabular-nums ${muted}`}>
                    {withConverted(w.target, w.currency, currency, convert)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => commit(w)}
                    aria-label={`Save for ${w.name}`}
                    title="Save for it: make it a goal"
                    className={iconButton}
                  >
                    <Target />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(w.id)}
                    aria-label={`Edit wish ${w.name}`}
                    className={iconButton}
                  >
                    <Pencil />
                  </button>
                  <ConfirmButton
                    label={`Remove wish ${w.name}`}
                    className={`${iconButton} hover:text-rose-600`}
                    title={`Remove “${w.name}” from the wishlist?`}
                    confirmLabel="Remove"
                    onConfirm={() => remove(w)}
                  >
                    <Trash2 />
                  </ConfirmButton>
                </div>
              </div>
              <p className="mt-1.5 text-sm">{effect ?? <Skeleton />}</p>
              <p className={`mt-0.5 flex flex-wrap items-center gap-x-2 text-sm tabular-nums ${muted}`}>
                <Hourglass />
                <span>
                  {days(w) === 0 ? 'Added today' : `On your list for ${days(w)} ${days(w) === 1 ? 'day' : 'days'}`}
                </span>
                {cost(w) && <span>· {cost(w)}</span>}
                {w.plannedFor && (
                  <span className="flex items-center gap-1">
                    · <CalendarDays /> {monthLabel(w.plannedFor)}
                  </span>
                )}
              </p>
            </li>
          )
        })}
      </ul>
      {wishes.length === 0 && (
        <p className={`py-6 text-center ${muted}`}>No wishes yet. Add something you are tempted to buy.</p>
      )}
      <ErrorText>{error}</ErrorText>

      <div className="mt-4">
        <GoalForm wish submitLabel="Add wish" onSave={add} />
      </div>
    </section>
  )
}

const iconButton = 'rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-indigo-600 dark:hover:bg-zinc-800'
