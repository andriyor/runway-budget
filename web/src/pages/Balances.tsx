import { useEffect, useState, type FormEvent } from 'react'
import { AccountRow } from '../components/AccountRow'
import { Allocation } from '../components/Allocation'
import { Goals } from '../components/Goals'
import { Runway } from '../components/Runway'
import { KindToggle, Skeleton, MoneyInput } from '../components/controls'
import { CurrencyIcon, BankIcon } from '../components/icons'
import { api } from '../lib/api'
import { format, formatRate, symbols } from '../lib/format'
import { card, muted, inputBox, button } from '../lib/styles'
import { currencies, type Currency, type AccountKind, type Account, type Rates, type Budget, type Convert } from '../lib/types'

export function Balances() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [rates, setRates] = useState<Rates>()
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [currency, setCurrency] = useState<Currency>('UAH')
  const [kind, setKind] = useState<AccountKind>('bank')
  // undefined while loading
  const [budget, setBudget] = useState<Budget | null>()

  useEffect(() => {
    api<Budget | null>('/budget').then(setBudget).catch((e) => setError(e.message))
    api<Account[]>('/accounts').then(setAccounts).catch((e) => setError(e.message))
    api<Rates>('/rates').then(setRates).catch((e) => setError(`Rates: ${e.message}`))
  }, [])

  async function add(e: FormEvent) {
    e.preventDefault()
    try {
      const created = await api<Account>('/accounts', {
        method: 'POST',
        body: JSON.stringify({ name, currency, kind, balance: Number(balance) }),
      })
      setAccounts((list) => [...list, created])
      setName('')
      setBalance('')
      setError('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function move(index: number, by: -1 | 1) {
    const previous = accounts
    const next = [...accounts]
    ;[next[index], next[index + by]] = [next[index + by], next[index]]
    setAccounts(next)
    try {
      await api('/accounts/order', { method: 'PUT', body: JSON.stringify({ ids: next.map((a) => a.id) }) })
    } catch (err) {
      setAccounts(previous)
      setError(`Reorder: ${(err as Error).message}`)
    }
  }

  const removeAccount = (id: number) => setAccounts((list) => list.filter((a) => a.id !== id))
  const replace = (updated: Account) =>
    setAccounts((list) => list.map((a) => (a.id === updated.id ? updated : a)))

  // rates are UAH per unit, so convert via UAH
  const convert: Convert = (amount, from, to) => rates && (amount * rates.rates[from]) / rates.rates[to]
  const totalIn = (target: Currency) =>
    rates && accounts.reduce((sum, a) => sum + convert(a.balance, a.currency, target)!, 0)
  const fromBudget = (amount: number | null | undefined, from: Currency | null | undefined, to: Currency) =>
    amount != null && from ? convert(amount, from, to) : undefined
  const reserveIn = (c: Currency) => fromBudget(budget?.reserve, budget?.reserveCurrency, c) ?? 0
  const salaryIn = (c: Currency) => fromBudget(budget?.salary, budget?.salaryCurrency, c)
  const minimalIn = (c: Currency) => fromBudget(budget?.minimalSpend, budget?.minimalSpendCurrency, c)
  const availableIn = (c: Currency) => {
    const total = totalIn(c)
    return total === undefined ? undefined : total - reserveIn(c)
  }
  const cushionIn = (c: Currency) =>
    budget?.targetMonths ? budget.targetMonths * fromBudget(budget.monthlySpend, budget.currency, c)! : 0
  const forGoalsIn = (c: Currency) => {
    const available = availableIn(c)
    return available === undefined ? undefined : available - cushionIn(c)
  }
  const cushion = budget?.targetMonths && rates
    ? { months: budget.targetMonths, amount: cushionIn(budget.currency), available: availableIn(budget.currency)!, currency: budget.currency }
    : undefined
  const netIn = (c: Currency) =>
    budget && rates ? (salaryIn(c) ?? 0) - convert(budget.monthlySpend, budget.currency, c)! : undefined

  return (
    <>
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Balances</h1>
        <p className={muted}>USD, EUR and UAH accounts, converted at the National Bank of Ukraine rate.</p>
      </header>

      {error && (
        <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900">
          {error}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        {currencies.map((c) => (
          <div key={c} className={`${card} flex flex-col`}>
            <p className={`flex items-center gap-2 ${muted}`}>
              <CurrencyIcon currency={c} /> Total in {c}
            </p>
            <p className="mt-3 truncate text-2xl font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
              {rates ? format(totalIn(c)!, c) : <Skeleton />}
            </p>
            {rates && (
              <p className="mt-4 flex items-center gap-1.5 border-t border-dashed border-zinc-200 pt-3 text-xs text-zinc-500 tabular-nums dark:border-zinc-800 dark:text-zinc-400">
                {c === 'UAH'
                  ? <><BankIcon /> NBU rate · {rates.date}</>
                  : <>1 {symbols[c]} = {formatRate(rates.rates[c])} ₴</>}
              </p>
            )}
          </div>
        ))}
      </section>

      <Allocation accounts={accounts} convert={convert} />

      {budget !== undefined && (
        <Runway saved={budget} onSaved={setBudget} availableIn={availableIn} reserveIn={reserveIn} salaryIn={salaryIn} minimalIn={minimalIn} />
      )}

      <Goals forGoalsIn={forGoalsIn} cushion={cushion} netIn={netIn} />

      <section className={card}>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Accounts</h2>
          <span className={muted}>{accounts.length}</span>
        </div>
        <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
          {accounts.map((a, i) => (
            <AccountRow
              key={`${a.id}-${a.updatedAt}`}
              account={a}
              onSaved={replace}
              onDeleted={removeAccount}
              onMoveUp={i > 0 ? () => move(i, -1) : undefined}
              onMoveDown={i < accounts.length - 1 ? () => move(i, 1) : undefined}
            />
          ))}
        </ul>
        {accounts.length === 0 && <p className={`py-6 text-center ${muted}`}>No accounts yet. Add your first one below.</p>}

        <form className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50" onSubmit={add}>
          <input
            placeholder="Account name"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Account name"
            className={`min-w-40 flex-1 px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 ${inputBox}`}
          />
          <KindToggle value={kind} onChange={setKind} />
          <div className="w-56">
            <MoneyInput label="Balance" required placeholder="Balance" value={balance} onChange={setBalance} currency={currency} onCurrency={setCurrency} />
          </div>
          <button className={button}>Add account</button>
        </form>
      </section>
    </>
  )
}
