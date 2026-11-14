import { useState, type FormEvent } from 'react'
import { AccountRow } from '../components/AccountRow'
import { Allocation } from '../components/Allocation'
import { BalanceHistory } from '../components/BalanceHistory'
import { ErrorBanner, InfoTip, KindToggle, Skeleton, MoneyInput } from '../components/controls'
import { CurrencyIcon, BankIcon } from '../components/icons'
import { api } from '../lib/api'
import { useFinance } from '../lib/finance'
import { format, formatRate, symbols } from '../lib/format'
import { card, muted, inputBox, button } from '../lib/styles'
import { currencies, type Currency, type AccountKind, type Account } from '../lib/types'

export function Balances() {
  const { accounts, setAccounts, rates, transactions, error, setError, currency: chartCurrency, convert, totalIn } = useFinance({ withTransactions: true })
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [currency, setCurrency] = useState<Currency>('UAH')
  const [kind, setKind] = useState<AccountKind>('bank')

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

  return (
    <>
      <header className="flex items-center gap-2">
        <h1 className="text-2xl font-bold sm:text-3xl tracking-tight text-zinc-900 dark:text-zinc-100">Balances</h1>
        <InfoTip label="About balances">USD, EUR and UAH accounts, converted at the National Bank of Ukraine rate.</InfoTip>
      </header>

      <ErrorBanner>{error}</ErrorBanner>

      {/* desktop: the overview on the left, accounts beside it; phones and tablets: one column */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_28rem] xl:grid-cols-[minmax(0,1fr)_32rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4 sm:gap-6 lg:gap-4">
          {/* one card: phones a line per currency, from sm up three columns; the rate only shows from sm up */}
          <section className={`${card} grid divide-y divide-zinc-200 py-1 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:py-4 dark:divide-zinc-800`}>
            {currencies.map((c) => (
              <div key={c} className="flex min-w-0 items-center justify-between gap-3 py-2 sm:flex-col sm:items-stretch sm:justify-start sm:px-4 sm:py-0 sm:first:pl-0 sm:last:pr-0">
                <p className={`flex shrink-0 items-center gap-2 ${muted}`}>
                  <CurrencyIcon currency={c} /> Total in {c}
                </p>
                <p className="min-w-0 truncate text-lg font-semibold text-zinc-900 tabular-nums sm:mt-1.5 sm:text-xl dark:text-zinc-100">
                  {rates ? format(totalIn(c)!, c) : <Skeleton />}
                </p>
                {rates && (
                  <p className="mt-0.5 hidden items-center gap-1.5 text-xs text-zinc-500 tabular-nums sm:flex dark:text-zinc-400">
                    {c === 'UAH'
                      ? <><BankIcon /> NBU rate · {rates.date}</>
                      : <>1 {symbols[c]} = {formatRate(rates.rates[c])} ₴</>}
                  </p>
                )}
              </div>
            ))}
          </section>

          <BalanceHistory accounts={accounts} transactions={transactions} convert={convert} currency={chartCurrency} />

          <Allocation accounts={accounts} convert={convert} />
        </div>

        {/* the container lets account rows lay out by the list's width, not the screen's */}
        <section className={`${card} @container lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto`}>
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
      </div>
    </>
  )
}
