import { useState } from 'react'
import { GoalForm, moveButton, NameList, type GoalValues } from './Goals'
import { ConfirmButton } from '../../components/ConfirmButton'
import { ErrorText } from '../../components/ErrorText'
import { Skeleton } from '../../components/Skeleton'
import { CalendarDays, ChevronDown, ChevronUp, Hourglass, Pencil, Target, Trash2 } from 'lucide-react'
import { CurrencyIcon } from '../../components/icons'
import { api, setCached, useApi } from '../../lib/api'
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
  // moves a wish one place in the shown list. Within its month (or among the unplanned) it swaps with the
  // neighbour; at the edge of its month it joins the next month over, as its last wish going up or its first going
  // down, since the list is sorted by month. Goals keep their places in the shared order
  async function move(index: number, by: -1 | 1) {
    const wish = wishes[index]
    const next = wishes[index + by]
    const list = all.filter((g) => g !== wish)
    let moved = wish
    if (next.plannedFor === wish.plannedFor) {
      list.splice(all.indexOf(next), 0, wish)
    } else {
      moved = { ...wish, plannedFor: next.plannedFor }
      list.splice(list.indexOf(next) + (by < 0 ? 1 : 0), 0, moved)
    }
    setCached('/goals', list)
    try {
      if (moved !== wish)
        await api(`/goals/${wish.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: wish.name,
            target: wish.target,
            currency: wish.currency,
            plannedFor: moved.plannedFor,
          }),
        })
      await api('/goals/order', { method: 'PUT', body: JSON.stringify({ ids: list.map((g) => g.id) }) })
    } catch (err) {
      setCached('/goals', all)
      setError(`Reorder: ${(err as Error).message}`)
    }
  }
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

  // what spending `target` today does to each goal, said after `lead` ("Buying it"); undefined while rates or
  // balances load
  function impact(target: number, from: Currency, lead: string) {
    const rows = goals.map((g, i) => {
      const price = convert(target, from, g.currency)
      const forGoals = forGoalsIn(g.currency)
      if (price === undefined || forGoals === undefined || cumulative[i] === undefined) return undefined
      // how much further from reached the goal ends up, in its currency
      const further = delayMonths(cumulative[i]!, forGoals, price, 1)
      return { goal: g, further, net: netIn(g.currency) }
    })
    if (rows.some((r) => r === undefined)) return undefined
    const hit = rows.map((r) => r!).filter((r) => r.further > 0.005)
    if (hit.length === 0)
      return <span className="font-medium text-emerald-600 dark:text-emerald-400">{lead} delays no goal</span>
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
        {lead} pushes back{' '}
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

  // a group's heading: its month and what its wishes add up to, a planned month also against the monthly surplus
  function groupHeader(month: string | null, items: Goal[]) {
    const prices = items.map((w) => convert(w.target, w.currency, currency))
    const sum = prices.some((p) => p === undefined) ? undefined : (prices as number[]).reduce((s, p) => s + p, 0)
    const fit = month && sum !== undefined && surplus !== undefined && surplus > 0 ? sum / surplus : undefined
    const over = fit !== undefined && fit > 1
    return (
      <>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
            <CalendarDays />
            <span className="first-letter:uppercase">{month ? monthLabel(month) : 'No month yet'}</span>
          </h3>
          {sum !== undefined && (
            <span
              className={`text-sm tabular-nums ${fit === undefined ? muted : over ? 'font-medium text-amber-700 dark:text-amber-400' : 'font-medium text-emerald-600 dark:text-emerald-400'}`}
            >
              {wholeMoney(sum, currency)}
              {fit !== undefined && ` / ${wholeMoney(surplus!, currency)}`}
            </span>
          )}
        </div>
        {fit !== undefined && (
          <>
            <div
              role="progressbar"
              aria-label={`${monthLabel(month!)} against the monthly surplus`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(Math.min(fit, 1) * 100)}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
            >
              <div
                className={`h-full rounded-full ${over ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(fit, 1) * 100}%` }}
              />
            </div>
            <p className={`mt-1 text-xs tabular-nums ${muted}`}>
              {over
                ? `${wholeMoney(sum! - surplus!, currency)} over your monthly surplus`
                : `${wholeMoney(surplus! - sum!, currency)} of your monthly surplus left`}
            </p>
          </>
        )}
        {!month && <p className={`mt-1 text-xs ${muted}`}>Spread out gives each a month, the top one first</p>}
      </>
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

  // runs of wishes in the same month, in the shown order, each with the index of its first wish
  const groups: Array<{ month: string | null; start: number; items: Goal[] }> = []
  wishes.forEach((w, i) => {
    const last = groups.at(-1)
    if (last && last.month === w.plannedFor) last.items.push(w)
    else groups.push({ month: w.plannedFor, start: i, items: [w] })
  })

  const days = (w: Goal) => Math.floor((now - Date.parse(w.addedAt)) / 864e5)

  // every wish together, in the plan's currency; undefined while rates load
  const allPrices = wishes.map((w) => convert(w.target, w.currency, currency))
  const total = allPrices.some((p) => p === undefined) ? undefined : (allPrices as number[]).reduce((s, p) => s + p, 0)

  return (
    <section className={card}>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Wishlist</h2>
      <p className={muted}>
        Smaller things you want, bought from your monthly surplus before goals. Each shows what buying it costs your
        goals; pick a month for each, or spread them out, and the arrows reorder them or move one into the next month.
      </p>

      {groups.map(({ month, start, items }) => (
        <div
          key={month ?? 'none'}
          className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/40"
        >
          {groupHeader(month, items)}
          <ul className="mt-4 flex flex-col gap-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            {items.map((w, j) => {
              const i = start + j
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
              const effect = impact(w.target, w.currency, w.plannedFor ? 'Buying it' : 'Buying it now')
              const bought = purchaseOf(w)
              return (
                <li key={w.id}>
                  <div className="flex items-center gap-2">
                    <div className="-ml-2 flex flex-col">
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        aria-label={`Move wish ${w.name} up`}
                        className={moveButton}
                      >
                        <ChevronUp strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === wishes.length - 1}
                        aria-label={`Move wish ${w.name} down`}
                        className={moveButton}
                      >
                        <ChevronDown strokeWidth={2} />
                      </button>
                    </div>
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
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      {wishes.length > 1 && total !== undefined && (
        <p className="mt-4 border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
          <span className="font-medium text-zinc-900 tabular-nums dark:text-zinc-100">
            Total {format(total, currency)}
          </span>
          {' · '}
          {impact(total, currency, 'Buying them all') ?? <Skeleton />}
        </p>
      )}
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
