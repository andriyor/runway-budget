import { useEffect, useState, type FormEvent } from 'react'
import { ErrorText, MoneyInput } from './controls'
import { TrashIcon } from './icons'
import { api } from '../lib/api'
import { format, wholeMoney } from '../lib/format'
import { monthKey } from '../lib/periods'
import { card, muted, inputBox, button } from '../lib/styles'
import type { Account, Category, CategoryBudget, Convert, Currency, Transaction } from '../lib/types'

type CategoryBudgetsProps = {
  transactions: Transaction[] | undefined
  accounts: Account[]
  categories: Category[]
  convert: Convert
  currency: Currency
}

// This month's spending per top-level category against its monthly cap, all accounts, net of refunds,
// cancelled pairs left out, at today's rate. The tick on each bar is an even pace: the cap × the share of
// the month gone. Amber once ahead of that pace, red once over the cap.
export function CategoryBudgets({ transactions, accounts, categories, convert, currency }: CategoryBudgetsProps) {
  const [budgets, setBudgets] = useState<CategoryBudget[]>([])
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [amountCurrency, setAmountCurrency] = useState<Currency>(currency)
  const [error, setError] = useState('')
  const [now] = useState(() => new Date())

  useEffect(() => {
    api<CategoryBudget[]>('/category-budgets').then(setBudgets).catch((e) => setError(e.message))
  }, [])

  const spending = categories.filter((c) => c.spending)
  // picking a category that has a cap fills in its amount, so the form edits it
  function pick(id: string) {
    setCategory(id)
    const saved = budgets.find((b) => b.category === id)
    if (saved) {
      setAmount(String(saved.amount))
      setAmountCurrency(saved.currency)
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    try {
      const saved = await api<CategoryBudget>(`/category-budgets/${category}`, {
        method: 'PUT',
        body: JSON.stringify({ amount: Number(amount), currency: amountCurrency }),
      })
      setBudgets((list) => [...list.filter((b) => b.category !== saved.category), saved])
      setCategory('')
      setAmount('')
      setError('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function remove(budget: CategoryBudget, label: string) {
    if (!confirm(`Remove the budget for ${label}?`)) return
    try {
      await api(`/category-budgets/${budget.category}`, { method: 'DELETE' })
      setBudgets((list) => list.filter((b) => b.category !== budget.category))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (!transactions) return null
  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]))
  const parentOf = new Map(categories.flatMap((c) => [[c.id, c.id] as const, ...c.subcategories.map((s) => [s.id, c.id] as const)]))
  const current = monthKey(now.toISOString())
  const spent = new Map<string, number>()
  for (const t of transactions) {
    const parent = parentOf.get(t.category)
    if (t.cancelled || !parent || monthKey(t.time) !== current) continue
    spent.set(parent, (spent.get(parent) ?? 0) - (convert(t.amount, currencyOf.get(t.accountId)!, currency) ?? 0))
  }
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const gone = now.getDate() / daysInMonth
  const rows = spending
    .flatMap((c) => {
      const budget = budgets.find((b) => b.category === c.id)
      const cap = budget && convert(budget.amount, budget.currency, currency)
      return budget && cap !== undefined ? [{ category: c, budget, cap, spent: Math.max(0, spent.get(c.id) ?? 0) }] : []
    })
    .sort((a, b) => b.spent / b.cap - a.spent / a.cap)
  const totalCap = rows.reduce((s, r) => s + r.cap, 0)
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0)

  return (
    <section className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Category budgets</h2>
        {rows.length > 0 && (
          <span className={`tabular-nums ${muted}`}>
            day {now.getDate()} of {daysInMonth} · {wholeMoney(totalSpent, currency)} of {wholeMoney(totalCap, currency)}
          </span>
        )}
      </div>

      <ul className="mt-3 flex flex-col gap-4">
        {rows.map(({ category: c, budget, cap, spent: used }) => {
          const share = used / cap
          const tone = share > 1 ? 'rose' : share > gone ? 'amber' : 'emerald'
          const bar = { rose: 'bg-rose-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500' }[tone]
          const text = { rose: 'text-rose-600 dark:text-rose-400', amber: 'text-amber-700 dark:text-amber-400', emerald: 'text-emerald-700 dark:text-emerald-400' }[tone]
          return (
            <li key={c.id}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-zinc-900 dark:text-zinc-100">
                  <span aria-hidden className="mr-2">{c.emoji}</span>{c.label}
                </span>
                <span className="flex shrink-0 items-center gap-2 tabular-nums">
                  <span className="text-zinc-900 dark:text-zinc-100">{wholeMoney(used, currency)}</span>
                  <span className={muted}>of {format(budget.amount, budget.currency)}</span>
                  <button
                    type="button"
                    onClick={() => remove(budget, c.label)}
                    aria-label={`Remove the budget for ${c.label}`}
                    className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600 dark:hover:bg-zinc-800"
                  >
                    <TrashIcon />
                  </button>
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={`${c.label} budget used`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(Math.min(1, share) * 100)}
                className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
              >
                <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(1, share) * 100}%` }} />
                {/* where an even pace would be by today */}
                <div aria-hidden className="absolute inset-y-0 w-0.5 bg-zinc-900/60 dark:bg-white/70" style={{ left: `${gone * 100}%` }} />
              </div>
              <p className={`mt-1 text-xs tabular-nums ${text}`}>
                {share > 1
                  ? `${wholeMoney(used - cap, currency)} over`
                  : `${wholeMoney(cap - used, currency)} left${share > gone ? ` · ahead of pace by ${wholeMoney(used - cap * gone, currency)}` : ''}`}
              </p>
            </li>
          )
        })}
      </ul>
      {rows.length === 0 && <p className={`py-4 text-center ${muted}`}>No budgets yet. Set a monthly cap for a category below.</p>}
      <ErrorText>{error}</ErrorText>

      <form className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50" onSubmit={save}>
        <select
          required
          value={category}
          onChange={(e) => pick(e.target.value)}
          aria-label="Category"
          className={`min-w-40 flex-1 px-3 py-2 text-sm text-zinc-900 outline-none dark:text-zinc-100 ${inputBox}`}
        >
          <option value="" disabled>Category…</option>
          {spending.map((c) => (
            <option key={c.id} value={c.id}>{c.emoji} {c.label}{budgets.some((b) => b.category === c.id) ? ' · has a budget' : ''}</option>
          ))}
        </select>
        <div className="w-56">
          <MoneyInput label="Monthly budget" required min="0.01" placeholder="per month" value={amount} onChange={setAmount} currency={amountCurrency} onCurrency={setAmountCurrency} />
        </div>
        <button className={button}>{budgets.some((b) => b.category === category) ? 'Update budget' : 'Set budget'}</button>
      </form>
    </section>
  )
}
