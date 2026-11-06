import { useEffect, useState, type FormEvent } from 'react'

const currencies = ['USD', 'EUR', 'UAH'] as const
type Currency = typeof currencies[number]
type Account = { id: number, name: string, currency: Currency, balance: number, updatedAt: string }
type Rates = { date: string, rates: Record<Currency, number> }

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? res.statusText)
  return res.json()
}

const format = (amount: number, currency: Currency) =>
  new Intl.NumberFormat('uk-UA', { style: 'currency', currency }).format(amount)

const formatRate = (rate: number) =>
  new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(rate)

const symbols: Record<Currency, string> = { USD: '$', EUR: '€', UAH: '₴' }
const iconColors: Record<Currency, string> = { USD: 'bg-emerald-600', EUR: 'bg-blue-600', UAH: 'bg-amber-500' }

const card = 'rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800'
const muted = 'text-sm text-zinc-500 dark:text-zinc-400'
const inputBox = 'rounded-lg bg-white ring-1 ring-inset ring-zinc-300 focus-within:ring-2 focus-within:ring-indigo-500 dark:bg-zinc-950 dark:ring-zinc-700'
const button = 'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-indigo-600'

function CurrencyIcon({ currency, className = 'size-6 text-xs' }: { currency: Currency, className?: string }) {
  return (
    <span className={`inline-grid shrink-0 place-items-center rounded-full font-bold text-white ${iconColors[currency]} ${className}`} aria-hidden="true">
      {symbols[currency]}
    </span>
  )
}

function BankIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5.5 10v7.5M10 10v7.5M14 10v7.5M18.5 10v7.5" />
      <path d="M3 20h18" />
    </svg>
  )
}

function Skeleton() {
  return <span className="inline-block h-8 w-36 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
}

function ErrorText({ children }: { children: string }) {
  return children ? <p role="alert" className="mt-2 text-sm text-rose-600 dark:text-rose-400">{children}</p> : null
}

type MoneyInputProps = {
  id?: string
  label: string
  value: string
  onChange: (v: string) => void
  currency: Currency
  onCurrency: (c: Currency) => void
  required?: boolean
  min?: string
  placeholder?: string
}

function MoneyInput({ id, label, value, onChange, currency, onCurrency, required, min, placeholder }: MoneyInputProps) {
  return (
    <div className={`flex ${inputBox}`}>
      <input
        id={id}
        type="number"
        step="0.01"
        min={min}
        required={required}
        placeholder={placeholder}
        aria-label={id ? undefined : label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-zinc-900 tabular-nums outline-none placeholder:text-zinc-400 dark:text-zinc-100"
      />
      <select
        value={currency}
        onChange={(e) => onCurrency(e.target.value as Currency)}
        aria-label={`${label} currency`}
        className="rounded-r-lg border-l border-zinc-200 bg-transparent px-2 text-sm font-medium text-zinc-700 outline-none dark:border-zinc-700 dark:text-zinc-200"
      >
        {currencies.map((c) => <option key={c}>{c}</option>)}
      </select>
    </div>
  )
}

function AccountRow({ account, onSaved }: { account: Account, onSaved: (a: Account) => void }) {
  const [balance, setBalance] = useState(String(account.balance))
  const [currency, setCurrency] = useState(account.currency)
  const [error, setError] = useState('')
  const dirty = Number(balance) !== account.balance || currency !== account.currency

  async function save(e: FormEvent) {
    e.preventDefault()
    try {
      onSaved(await api<Account>(`/accounts/${account.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ balance: Number(balance), currency }),
      }))
      setError('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <li className="py-3">
      <form className="flex flex-wrap items-center gap-3" onSubmit={save}>
        <CurrencyIcon currency={account.currency} className="size-9 text-sm" />
        <div className="min-w-32 flex-1">
          <p className="font-medium text-zinc-900 dark:text-zinc-100">{account.name}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            updated {new Date(account.updatedAt).toLocaleString('uk-UA')}
          </p>
        </div>
        <div className="w-56">
          <MoneyInput label={`${account.name} balance`} required value={balance} onChange={setBalance} currency={currency} onCurrency={setCurrency} />
        </div>
        <button className={button} disabled={!dirty}>Save</button>
      </form>
      <ErrorText>{error}</ErrorText>
    </li>
  )
}

type Budget = { monthlySpend: number, currency: Currency, salary: number | null, salaryCurrency: Currency | null }
type Convert = (amount: number, from: Currency, to: Currency) => number | undefined

const AVG_DAYS_IN_MONTH = 30.44

function Estimate({ label, total, burn, currency }: { label: string, total: number, burn: number, currency: Currency }) {
  const [now] = useState(Date.now)
  if (burn <= 0) {
    return (
      <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/40">
        <p className={muted}>{label}</p>
        <p className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-400">No end</p>
        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">+{format(-burn, currency)} saved per month</p>
      </div>
    )
  }
  const months = Math.max(0, total / burn)
  const until = new Date(now + months * AVG_DAYS_IN_MONTH * 864e5)
  return (
    <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
      <p className={muted}>{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
        {months.toFixed(1)} <span className="text-base font-normal text-zinc-500">months</span>
        {months >= 12 && <span className="text-base font-normal text-zinc-500"> · ≈ {(months / 12).toFixed(1)} years</span>}
      </p>
      <p className="mt-1 text-sm tabular-nums">
        <span className="text-zinc-500 dark:text-zinc-400">until {until.toLocaleDateString('uk-UA')} · </span>
        <span className="text-rose-600 dark:text-rose-400">−{format(burn, currency)} per month</span>
      </p>
    </div>
  )
}

function Runway({ totalIn, convert }: { totalIn: (c: Currency) => number | undefined, convert: Convert }) {
  const [saved, setSaved] = useState<Budget | null>(null)
  const [spend, setSpend] = useState('')
  const [currency, setCurrency] = useState<Currency>('UAH')
  const [salary, setSalary] = useState('')
  const [salaryCurrency, setSalaryCurrency] = useState<Currency>('UAH')
  const [error, setError] = useState('')

  useEffect(() => {
    api<Budget | null>('/budget').then((b) => {
      setSaved(b)
      if (b) {
        setSpend(String(b.monthlySpend))
        setCurrency(b.currency)
        setSalary(b.salary === null ? '' : String(b.salary))
        if (b.salaryCurrency) setSalaryCurrency(b.salaryCurrency)
      }
    }).catch((e) => setError(e.message))
  }, [])

  async function save(e: FormEvent) {
    e.preventDefault()
    try {
      setSaved(await api<Budget>('/budget', {
        method: 'PUT',
        body: JSON.stringify({
          monthlySpend: Number(spend),
          currency,
          // empty salary field clears it
          ...(salary !== '' && { salary: Number(salary), salaryCurrency }),
        }),
      }))
      setError('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const total = saved && totalIn(saved.currency)
  const salaryInSpendCurrency = saved?.salary != null && saved.salaryCurrency
    ? convert(saved.salary, saved.salaryCurrency, saved.currency)
    : undefined
  const dirty = !saved
    || Number(spend) !== saved.monthlySpend
    || currency !== saved.currency
    || (salary === '' ? saved.salary !== null : Number(salary) !== saved.salary || salaryCurrency !== saved.salaryCurrency)

  return (
    <section className={`${card} grid gap-6 md:grid-cols-2`}>
      <form className="flex flex-col gap-4" onSubmit={save}>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Runway</h2>
          <p className={muted}>How long your savings last.</p>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">I spend per month</span>
          <MoneyInput id="spend" label="Monthly spend" required min="0.01" value={spend} onChange={setSpend} currency={currency} onCurrency={setCurrency} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            My salary per month <span className="font-normal text-zinc-400">· optional</span>
          </span>
          <MoneyInput id="salary" label="Monthly salary" min="0" placeholder="leave empty if none" value={salary} onChange={setSalary} currency={salaryCurrency} onCurrency={setSalaryCurrency} />
        </label>
        <div>
          <button className={button} disabled={!dirty}>Save</button>
          <ErrorText>{error}</ErrorText>
        </div>
      </form>
      <div className="flex flex-col justify-center gap-3">
        {saved && total !== undefined
          ? (
            <>
              <Estimate label="Without salary" total={total!} burn={saved.monthlySpend} currency={saved.currency} />
              {salaryInSpendCurrency !== undefined && (
                <Estimate label="With salary" total={total!} burn={saved.monthlySpend - salaryInSpendCurrency} currency={saved.currency} />
              )}
            </>
            )
          : (
            <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-center dark:border-zinc-700">
              <p className={muted}>Set your monthly spending to see how long your savings last.</p>
            </div>
            )}
      </div>
    </section>
  )
}

export default function App() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [rates, setRates] = useState<Rates>()
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [currency, setCurrency] = useState<Currency>('UAH')

  useEffect(() => {
    api<Account[]>('/accounts').then(setAccounts).catch((e) => setError(e.message))
    api<Rates>('/rates').then(setRates).catch((e) => setError(`Rates: ${e.message}`))
  }, [])

  async function add(e: FormEvent) {
    e.preventDefault()
    try {
      const created = await api<Account>('/accounts', {
        method: 'POST',
        body: JSON.stringify({ name, currency, balance: Number(balance) }),
      })
      setAccounts((list) => [...list, created])
      setName('')
      setBalance('')
      setError('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const replace = (updated: Account) =>
    setAccounts((list) => list.map((a) => (a.id === updated.id ? updated : a)))

  // rates are UAH per unit, so convert via UAH
  const convert: Convert = (amount, from, to) => rates && (amount * rates.rates[from]) / rates.rates[to]
  const totalIn = (target: Currency) =>
    rates && accounts.reduce((sum, a) => sum + convert(a.balance, a.currency, target)!, 0)

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
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

      <Runway totalIn={totalIn} convert={convert} />

      <section className={card}>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Accounts</h2>
          <span className={muted}>{accounts.length}</span>
        </div>
        <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
          {accounts.map((a) => <AccountRow key={`${a.id}-${a.updatedAt}`} account={a} onSaved={replace} />)}
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
          <div className="w-56">
            <MoneyInput label="Balance" required placeholder="Balance" value={balance} onChange={setBalance} currency={currency} onCurrency={setCurrency} />
          </div>
          <button className={button}>Add account</button>
        </form>
      </section>
    </main>
  )
}
