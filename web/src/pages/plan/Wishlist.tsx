import { useState } from 'react'
import { GoalForm, NameList, type GoalValues } from './Goals'
import { ConfirmButton } from '../../components/ConfirmButton'
import { ErrorText } from '../../components/ErrorText'
import { Skeleton } from '../../components/Skeleton'
import { CalendarDays, Check, GripVertical, Hourglass, Pencil, Target, Trash2 } from 'lucide-react'
import { DragDropProvider, useDroppable } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { move } from '@dnd-kit/helpers'
import { CollisionPriority } from '@dnd-kit/abstract'
import type { ReactNode } from 'react'
import { CurrencyIcon } from '../../components/icons'
import { api, setCached, useApi } from '../../lib/api'
import { format, wholeMoney, withConverted } from '../../lib/format'
import { cumulativeTargets, delayMonths, findPurchase, spreadWishes } from '../../lib/goals'
import { parentsById } from '../../lib/categories'
import { monthKey, monthLabel } from '../../lib/periods'
import { card, inputBox, linkButton, muted } from '../../lib/styles'
import type { Account, BoughtWish, Budget, Category, Convert, Currency, Goal, Transaction } from '../../lib/types'

type WishlistProps = {
  // available savings minus the months-without-income cushion
  forGoalsIn: (c: Currency) => number | undefined
  convert: Convert
  // income minus spending per month; undefined when spending is not set
  netIn: (c: Currency) => number | undefined
  // all incomes per month; undefined when there are none
  incomeIn: (c: Currency) => number | undefined
  // the currency the plan is shown in; prices keep their own, with this beside them
  currency: Currency
  // to spot a wish's purchase; transactions are undefined while they load
  transactions: Transaction[] | undefined
  accounts: Account[]
  categories: Category[]
}

// Smaller purchases you want, bought from the monthly surplus ahead of goals: each shows what buying it delays, so
// the cost is weighed in goal time, and a month picked for each spreads them so no month takes more than it saves
export function Wishlist({
  forGoalsIn,
  convert,
  netIn,
  incomeIn,
  currency,
  transactions,
  accounts,
  categories,
}: WishlistProps) {
  const query = useApi<Goal[]>('/goals')
  const all = query.data ?? []
  const goals = all.filter((g) => !g.wish)
  // planned ones first, by month; sort keeps the list order within a month and among the unplanned
  const wishes = all
    .filter((g) => g.wish)
    .sort((a, b) => (a.plannedFor ?? '9999').localeCompare(b.plannedFor ?? '9999'))
  const cumulative = cumulativeTargets(goals, convert)
  const [now] = useState(Date.now)
  // bought wishes sit in the card of the month they were bought in, from this month on; earlier ones are
  // listed under "Bought earlier"
  const bought = useApi<BoughtWish[]>('/goals/bought').data ?? []
  const thisMonth = monthKey(new Date(now).toISOString())
  const boughtMonth = (b: BoughtWish) => monthKey(b.purchase?.time ?? b.boughtAt)
  const boughtIn = (month: string | null) => (month ? bought.filter((b) => boughtMonth(b) === month) : [])
  // what it took from that month's surplus: the purchase, or the planned price when bought without one
  const paid = (b: BoughtWish) =>
    b.purchase ? convert(-b.purchase.amount, b.purchase.currency, currency) : convert(b.target, b.currency, currency)
  const price = (w: Goal) => convert(w.target, w.currency, currency)
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
  // the API replaces name, target and currency, so they go along with whatever changes
  const patch = (w: Goal, changes: Partial<GoalValues> & { matchAfter?: string }) =>
    api(`/goals/${w.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: w.name, target: w.target, currency: w.currency, ...changes }),
    })
  // it keeps its place in the order, which puts it below the goals added before it
  const commit = (w: Goal) => act(() => patch(w, { wish: false, plannedFor: null }))
  // puts a dragged wish at `index` among the wishes of `month` (null: no month yet), taking that month. Goals keep
  // their places in the shared order
  async function drop(wish: Goal, month: string | null, index: number) {
    const target = wishes.filter((w) => w !== wish && w.plannedFor === month)
    const before = wishes.filter((w) => w.plannedFor === month).indexOf(wish)
    if (month === wish.plannedFor && index === before) return
    const moved = month === wish.plannedFor ? wish : { ...wish, plannedFor: month }
    const list = all.filter((g) => g !== wish)
    // into a month with no other open wish (empty, or holding only bought ones) it keeps its place in the order
    const at =
      target.length === 0
        ? all.indexOf(wish)
        : index < target.length
          ? list.indexOf(target[index])
          : list.indexOf(target.at(-1)!) + 1
    list.splice(at, 0, moved)
    setCached('/goals', list)
    try {
      if (moved !== wish) await patch(wish, { plannedFor: month })
      await api('/goals/order', { method: 'PUT', body: JSON.stringify({ ids: list.map((g) => g.id) }) })
    } catch (err) {
      setCached('/goals', all)
      setError(`Reorder: ${(err as Error).message}`)
    }
  }
  const remove = (w: Goal) => act(() => api(`/goals/${w.id}`, { method: 'DELETE' }))
  // kept, with its purchase, in the history below instead of deleted
  const markBought = (w: Goal, t: Transaction) =>
    act(() =>
      api(`/goals/${w.id}/bought`, { method: 'PUT', body: JSON.stringify({ bought: true, transactionId: t.id }) }),
    )

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
  const notIt = (w: Goal, t: Transaction) => act(() => patch(w, { matchAfter: t.time }))

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

  // what a month takes from the surplus, in the plan's currency: its planned wishes at their price and the ones
  // bought in it at what they cost; undefined while rates load
  const monthTotal = (month: string) =>
    total([...wishes.filter((w) => w.plannedFor === month).map(price), ...boughtIn(month).map(paid)])
  const months = new Set([
    ...wishes.flatMap((w) => (w.plannedFor ? [w.plannedFor] : [])),
    ...bought.map(boughtMonth).filter((m) => m >= thisMonth),
  ])
  const monthTotals = new Map([...months].map((m) => [m, monthTotal(m)]))
  // what wishes may take each month: the monthly surplus less the share of income saved first
  const saveShare = useApi<Budget | null>('/budget').data?.saveShare ?? null
  const fullSurplus = netIn(currency)
  const savedFirst = saveShare === null ? 0 : ((incomeIn(currency) ?? 0) * saveShare) / 100
  const surplus = fullSurplus === undefined ? undefined : Math.max(0, fullSurplus - savedFirst)

  // gives every unplanned wish a month, so each month's wishes stay within the surplus
  const unplanned = wishes.filter((w) => !w.plannedFor)
  const prices = unplanned.map(price)
  const taken = [...monthTotals].every(([, v]) => v !== undefined) ? (monthTotals as Map<string, number>) : undefined
  const canSpread =
    unplanned.length > 0 && surplus !== undefined && surplus > 0 && taken && prices.every((p) => p !== undefined)
  const spread = () =>
    act(async () => {
      const months = spreadWishes(prices as number[], taken!, surplus!, thisMonth)
      await Promise.all(unplanned.map((w, i) => patch(w, { plannedFor: months[i] })))
    })

  function cost(wish: Goal) {
    const net = netIn(wish.currency)
    if (net === undefined || net <= 0) return undefined
    return `${(wish.target / net).toFixed(1)} months of your surplus`
  }

  // wish ids by month (noMonth for none), months in the shown order; while a drag runs, where it has put them so far
  const saved: Record<string, number[]> = {}
  for (const w of wishes) (saved[w.plannedFor ?? noMonth] ??= []).push(w.id)
  for (const b of bought) if (boughtMonth(b) >= thisMonth) saved[boughtMonth(b)] ??= []
  const [dragged, setDragged] = useState<Record<string, number[]>>()
  const byId = new Map(wishes.map((w) => [w.id, w]))
  const groups = Object.entries(dragged ?? saved)
    // months in order, no month last
    .sort(([a], [b]) => (a === noMonth ? 1 : b === noMonth ? -1 : a.localeCompare(b)))
    .map(([key, ids]) => ({
      key,
      month: key === noMonth ? null : key,
      items: ids.map((id) => byId.get(id)!).filter(Boolean),
    }))

  // every wish together, in the plan's currency; undefined while rates load
  const allWishes = total(wishes.map(price))

  return (
    <section className={card}>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Wishlist</h2>
      <p className={muted}>
        Smaller things you want, bought from your monthly surplus before goals. Each shows what buying it costs your
        goals; pick a month for each, or spread them out, and drag one by its handle to reorder it or move it to another
        month.
      </p>
      <SaveShare share={saveShare} saved={savedFirst} left={surplus} currency={currency} />

      <DragDropProvider
        onDragStart={() => setDragged(saved)}
        onDragOver={(event) => setDragged((g) => g && move(g, event))}
        onDragEnd={(event) => {
          const { source } = event.operation
          const wish = source && byId.get(Number(source.id))
          const at = dragged && wish && Object.entries(dragged).find(([, ids]) => ids.includes(wish.id))
          setDragged(undefined)
          if (event.canceled || !wish || !at) return
          drop(wish, at[0] === noMonth ? null : at[0], at[1].indexOf(wish.id))
        }}
      >
        {groups.map(({ key, month, items }) => (
          <WishGroup key={key} id={key}>
            <MonthHeader
              month={month}
              sum={total([...items.map(price), ...boughtIn(month).map(paid)])}
              surplus={surplus}
              saving={saveShare !== null}
              currency={currency}
            />
            <ul
              className={`flex flex-col gap-5 ${items.length ? 'mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800' : ''}`}
            >
              {items.map((w, i) => {
                if (editing === w.id) {
                  return (
                    <SortableWish key={w.id} id={w.id} index={i} group={key} disabled>
                      {() => (
                        <GoalForm
                          wish
                          initial={w}
                          submitLabel="Save"
                          onSave={(values) => update(w, values)}
                          onCancel={() => setEditing(undefined)}
                        />
                      )}
                    </SortableWish>
                  )
                }
                const effect = impact(w.target, w.currency, w.plannedFor ? 'Buying it' : 'Buying it now')
                const bought = purchaseOf(w)
                const days = Math.floor((now - Date.parse(w.addedAt)) / 864e5)
                return (
                  <SortableWish key={w.id} id={w.id} index={i} group={key}>
                    {(handle) => (
                      <>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            ref={handle}
                            aria-label={`Drag wish ${w.name}`}
                            title="Drag to reorder or to another month"
                            className="-ml-1.5 cursor-grab touch-none rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 active:cursor-grabbing dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                          >
                            <GripVertical strokeWidth={2} />
                          </button>
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
                              Looks bought: {bought.description} on {new Date(bought.time).toLocaleDateString('uk-UA')}{' '}
                              for {format(-bought.amount, currencyOf.get(bought.accountId)!)}
                            </span>
                            <button type="button" onClick={() => markBought(w, bought)} className={linkButton}>
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
                            {days === 0 ? 'Added today' : `On your list for ${days} ${days === 1 ? 'day' : 'days'}`}
                          </span>
                          {cost(w) && <span>· {cost(w)}</span>}
                          {w.category && parentOf.get(w.category) && (
                            <span>
                              · {parentOf.get(w.category)!.emoji} {parentOf.get(w.category)!.label}
                            </span>
                          )}
                        </p>
                      </>
                    )}
                  </SortableWish>
                )
              })}
            </ul>
            {boughtIn(month).length > 0 && (
              <ul className="mt-4 divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {boughtIn(month).map((b) => (
                  <BoughtRow key={b.id} wish={b} />
                ))}
              </ul>
            )}
          </WishGroup>
        ))}
      </DragDropProvider>
      {wishes.length > 1 && allWishes !== undefined && (
        <p className="mt-4 border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
          <span className="font-medium text-zinc-900 tabular-nums dark:text-zinc-100">
            Total {format(allWishes, currency)}
          </span>
          {' · '}
          {impact(allWishes, currency, 'Buying them all') ?? <Skeleton />}
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
      <BoughtHistory bought={bought.filter((b) => boughtMonth(b) < thisMonth)} />
    </section>
  )
}

// a month card's heading: the month, what its wishes add up to and, for a planned month, that against the
// monthly surplus. sum is undefined while rates load
function MonthHeader({
  month,
  sum,
  surplus,
  saving,
  currency,
}: {
  month: string | null
  sum: number | undefined
  // what wishes may take a month: the monthly surplus, less what is saved first when saving
  surplus: number | undefined
  saving: boolean
  currency: Currency
}) {
  const of = saving ? 'the surplus left after saving' : 'your monthly surplus'
  // nothing left for wishes makes any planned one over
  const fit =
    month && sum !== undefined && surplus !== undefined && (surplus > 0 || saving)
      ? surplus > 0
        ? sum / surplus
        : sum > 0
          ? Infinity
          : 0
      : undefined
  const over = fit !== undefined && fit > 1
  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
          {/* the month's number in a tile, where the calendar icon is for wishes without a month */}
          {month ? (
            <span
              aria-hidden
              className="grid h-6 min-w-6 place-items-center rounded-md bg-indigo-50 px-1 text-xs font-semibold text-indigo-700 tabular-nums dark:bg-indigo-950/60 dark:text-indigo-300"
            >
              {month.slice(5)}
            </span>
          ) : (
            <CalendarDays />
          )}
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
            aria-label={`${monthLabel(month!)} against ${of}`}
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
              ? `${wholeMoney(sum! - surplus!, currency)} over ${of}`
              : `${wholeMoney(surplus! - sum!, currency)} of ${of} left`}
          </p>
        </>
      )}
      {!month && <p className={`mt-1 text-xs ${muted}`}>Spread out gives each a month, the top one first</p>}
    </>
  )
}

// the percent of income to save before wishes ("pay yourself first"): the wishlist gets only the surplus left
// after it. Empty saves nothing first
function SaveShare({
  share,
  saved,
  left,
  currency,
}: {
  share: number | null
  // that share of income a month, and the surplus left for wishes after it; left is undefined while loading
  saved: number
  left: number | undefined
  currency: Currency
}) {
  const [draft, setDraft] = useState<string>()
  const [error, setError] = useState('')
  const shown = draft ?? (share === null ? '' : String(share))
  async function save() {
    setDraft(undefined)
    const value = shown.trim() === '' ? null : Math.round(Number(shown))
    if (value === share) return
    if (value !== null && !(value >= 1 && value <= 100)) return setError('Pick 1–100%, or leave it empty')
    try {
      await api('/budget', { method: 'PATCH', body: JSON.stringify({ saveShare: value }) })
      setError('')
    } catch (err) {
      setError((err as Error).message)
    }
  }
  return (
    <div className={`mt-3 text-sm ${muted}`}>
      <label className="inline-flex flex-wrap items-center gap-2">
        Save
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          placeholder="0"
          value={shown}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className={`w-16 px-2 py-1 text-right text-zinc-900 tabular-nums dark:text-zinc-100 ${inputBox}`}
        />
        % of income first
        {share !== null && left !== undefined && (
          <span className="tabular-nums">
            ≈ {wholeMoney(saved, currency)} a month; wishes get the {wholeMoney(left, currency)} left of the surplus
          </span>
        )}
      </label>
      <ErrorText>{error}</ErrorText>
    </div>
  )
}

const boughtDate = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })

// a bought wish: where and when, and what was paid against what was planned. Undo puts it back on the list
function BoughtRow({ wish: w }: { wish: BoughtWish }) {
  const [error, setError] = useState('')
  async function undo() {
    try {
      await api(`/goals/${w.id}/bought`, { method: 'PUT', body: JSON.stringify({ bought: false }) })
    } catch (err) {
      setError((err as Error).message)
    }
  }
  const p = w.purchase
  // the difference only means something in the wish's own currency
  const diff = p && p.currency === w.currency ? -p.amount - w.target : undefined
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2 text-sm">
      <span className="flex min-w-0 items-baseline gap-2">
        <Check
          size={14}
          strokeWidth={3}
          aria-label="Bought"
          className="shrink-0 self-center text-emerald-600 dark:text-emerald-400"
        />
        <span className="min-w-0">
          <span className="text-zinc-900 dark:text-zinc-100">{w.name}</span>
          <span className={muted}>
            {' · '}
            {p ? `${p.description} · ${boughtDate.format(new Date(p.time))}` : boughtDate.format(new Date(w.boughtAt))}
          </span>
        </span>
      </span>
      <span className="flex items-baseline gap-3 tabular-nums">
        {p ? (
          <span className="text-zinc-900 dark:text-zinc-100">
            {format(-p.amount, p.currency)}
            <span className={muted}>
              {' '}
              (planned {format(w.target, w.currency)}
              {diff !== undefined && Math.abs(diff) >= 0.005 && (
                <span
                  className={diff > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}
                >
                  {', '}
                  {diff > 0 ? '+' : '−'}
                  {format(Math.abs(diff), w.currency)}
                </span>
              )}
              )
            </span>
          </span>
        ) : (
          <span className={muted}>planned {format(w.target, w.currency)}</span>
        )}
        <button type="button" onClick={undo} className={linkButton}>
          Undo
        </button>
      </span>
      <ErrorText>{error}</ErrorText>
    </li>
  )
}

// wishes bought before this month, newest first; this month's and later ones are in their month's card
function BoughtHistory({ bought }: { bought: BoughtWish[] }) {
  if (bought.length === 0) return null
  return (
    <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Bought earlier</h3>
      <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
        {bought.map((w) => (
          <BoughtRow key={w.id} wish={w} />
        ))}
      </ul>
    </div>
  )
}

// the sum of amounts, or undefined if any is (a rate still loading)
const total = (amounts: (number | undefined)[]) =>
  amounts.some((a) => a === undefined) ? undefined : (amounts as number[]).reduce((s, a) => s + a, 0)

// the sortable group of wishes without a month
const noMonth = 'none'

// a wish row that can be dragged by the handle it hands its children, within its month or into another
function SortableWish({
  id,
  index,
  group,
  disabled,
  children,
}: {
  id: number
  index: number
  group: string
  disabled?: boolean
  children: (handle: (element: Element | null) => void) => ReactNode
}) {
  const { ref, handleRef, isDragging } = useSortable({ id, index, group, type: 'wish', accept: 'wish', disabled })
  return (
    <li ref={ref} className={isDragging ? 'opacity-50' : undefined}>
      {children(handleRef)}
    </li>
  )
}

// a month's card; a drop target too, so a wish can go back into a month a drag has emptied
function WishGroup({ id, children }: { id: string; children: ReactNode }) {
  const { ref } = useDroppable({ id, type: 'month', accept: 'wish', collisionPriority: CollisionPriority.Low })
  return (
    <div
      ref={ref}
      className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/40"
    >
      {children}
    </div>
  )
}

const iconButton = 'rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-indigo-600 dark:hover:bg-zinc-800'
