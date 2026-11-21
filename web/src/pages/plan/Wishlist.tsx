import { useState } from 'react'
import { GoalForm, NameList, type GoalValues } from './Goals'
import { ConfirmButton } from '../../components/ConfirmButton'
import { ErrorText } from '../../components/ErrorText'
import { Skeleton } from '../../components/Skeleton'
import { CalendarDays, Hourglass, Pencil, Target, Trash2 } from 'lucide-react'
import { CurrencyIcon } from '../../components/icons'
import { api, useApi } from '../../lib/api'
import { format, wholeMoney, withConverted } from '../../lib/format'
import { cumulativeTargets, delayMonths, findPurchase, spreadWishes } from '../../lib/goals'
import { parentsById } from '../../lib/categories'
import { monthKey, monthLabel } from '../../lib/periods'
import { card, linkButton, muted } from '../../lib/styles'
import type { Account, Category, Convert, Currency, Goal, Transaction } from '../../lib/types'

type WishlistProps = {
  // available savings minus the months-without-income cushion
  forGoalsIn: (c: Currency) => number | undefined
  convert: Convert
  // income minus spending per month; undefined when spending is not set
  netIn: (c: Currency) => number | undefined
  // the currency the plan is shown in; prices keep their own, with this beside them
  currency: Currency
  // to spot a wish's purchase; transactions are undefined while they load
  transactions: Transaction[] | undefined
  accounts: Account[]
  categories: Category[]
}

// Smaller purchases you want, bought from the monthly surplus ahead of goals: each shows what buying it delays, so
// the cost is weighed in goal time, and a month picked for each spreads them so no month takes more than it saves
export function Wishlist({ forGoalsIn, convert, netIn, currency, transactions, accounts, categories }: WishlistProps) {
  const query = useApi<Goal[]>('/goals')
  const all = query.data ?? []
  const goals = all.filter((g) => !g.wish)
  // planned ones first, by month; sort keeps the list order within a month and among the unplanned
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

  // the transaction that looks like each wish's purchase
  const parentOf = parentsById(categories)
  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]))
  const purchaseOf = (w: Goal) =>
    transactions &&
    findPurchase(
      w,
      transactions,
      (c) => parentOf.get(c)?.id,
      (t) => convert(-t.amount, currencyOf.get(t.accountId)!, w.currency),
    )
  // "not it": that transaction and every earlier one are left out from now on
  const notIt = (w: Goal, t: Transaction) =>
    act(() =>
      api(`/goals/${w.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: w.name, target: w.target, currency: w.currency, matchAfter: t.time }),
      }),
    )

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
      return (
        <span className="font-medium text-emerald-600 dark:text-emerald-400">
          {wish.plannedFor ? 'Buying it' : 'Buying it now'} delays no goal
        </span>
      )
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
        {wish.plannedFor ? 'Buying it' : 'Buying it now'} pushes back{' '}
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

  // what each month's planned wishes add up to, in the plan's currency; undefined while rates load
  const monthTotals = new Map<string, number | undefined>()
  for (const w of wishes) {
    if (!w.plannedFor) continue
    const price = convert(w.target, w.currency, currency)
    const sum = monthTotals.has(w.plannedFor) ? monthTotals.get(w.plannedFor) : 0
    monthTotals.set(w.plannedFor, sum === undefined || price === undefined ? undefined : sum + price)
  }
  const surplus = netIn(currency)

  // a planned wish's month against the monthly surplus; undefined while it loads or without a surplus
  function monthFit(month: string) {
    const total = monthTotals.get(month)
    if (total === undefined || surplus === undefined || surplus <= 0) return undefined
    const name = monthLabel(month)
    if (total <= surplus)
      return (
        <span className="text-emerald-600 dark:text-emerald-400">
          {name}: {wholeMoney(total, currency)} of your {wholeMoney(surplus, currency)} monthly surplus
        </span>
      )
    return (
      <span className="text-amber-700 dark:text-amber-400">
        {name}: {wholeMoney(total, currency)}, {wholeMoney(total - surplus, currency)} over your monthly surplus
      </span>
    )
  }

  // gives every unplanned wish a month, so each month's wishes stay within the surplus
  const unplanned = wishes.filter((w) => !w.plannedFor)
  const prices = unplanned.map((w) => convert(w.target, w.currency, currency))
  const taken = [...monthTotals].every(([, v]) => v !== undefined) ? (monthTotals as Map<string, number>) : undefined
  const canSpread =
    unplanned.length > 0 && surplus !== undefined && surplus > 0 && taken && prices.every((p) => p !== undefined)
  const spread = () =>
    act(async () => {
      const months = spreadWishes(prices as number[], taken!, surplus!, monthKey(new Date(now).toISOString()))
      await Promise.all(
        unplanned.map((w, i) =>
          api(`/goals/${w.id}`, {
            method: 'PUT',
            body: JSON.stringify({ name: w.name, target: w.target, currency: w.currency, plannedFor: months[i] }),
          }),
        ),
      )
    })

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
        Smaller things you want, bought from your monthly surplus before goals. Each shows what buying it costs your
        goals; pick a month for each, or spread them out, so no month takes more than you save.
      </p>

      <ul className="mt-4 flex flex-col gap-5">
        {wishes.map((w) => {
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
          const effect = impact(w)
          const bought = purchaseOf(w)
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
              {bought && (
                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-sm tabular-nums">
                  <span className="text-zinc-900 dark:text-zinc-100">
                    Looks bought: {bought.description} on {new Date(bought.time).toLocaleDateString('uk-UA')} for{' '}
                    {format(-bought.amount, currencyOf.get(bought.accountId)!)}
                  </span>
                  <button type="button" onClick={() => remove(w)} className={linkButton}>
                    Bought it
                  </button>
                  <button type="button" onClick={() => notIt(w, bought)} className={linkButton}>
                    Not it
                  </button>
                </p>
              )}
              <p className="mt-1.5 text-sm">{effect ?? <Skeleton />}</p>
              <p className={`mt-0.5 flex flex-wrap items-center gap-x-2 text-sm tabular-nums ${muted}`}>
                <Hourglass />
                <span>
                  {days(w) === 0 ? 'Added today' : `On your list for ${days(w)} ${days(w) === 1 ? 'day' : 'days'}`}
                </span>
                {cost(w) && <span>· {cost(w)}</span>}
                {w.category && parentOf.get(w.category) && (
                  <span>
                    · {parentOf.get(w.category)!.emoji} {parentOf.get(w.category)!.label}
                  </span>
                )}
                {w.plannedFor && (
                  <span className="flex items-center gap-1">
                    · <CalendarDays /> {monthFit(w.plannedFor) ?? monthLabel(w.plannedFor)}
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
      {canSpread && (
        <button type="button" onClick={spread} className={`mt-3 ${linkButton}`}>
          Spread out the wishes without a month
        </button>
      )}
      <ErrorText>{error}</ErrorText>

      <div className="mt-4">
        <GoalForm wish submitLabel="Add wish" onSave={add} />
      </div>
    </section>
  )
}

const iconButton = 'rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-indigo-600 dark:hover:bg-zinc-800'
