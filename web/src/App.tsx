import { useEffect, useState, type FormEvent } from 'react'
import './App.css'

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

const symbols: Record<Currency, string> = { USD: '$', EUR: '€', UAH: '₴' }

function CurrencyIcon({ currency }: { currency: Currency }) {
  return <span className={`cur-icon cur-${currency}`} aria-hidden="true">{symbols[currency]}</span>
}

function BankIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5.5 10v7.5M10 10v7.5M14 10v7.5M18.5 10v7.5" />
      <path d="M3 20h18" />
    </svg>
  )
}

const formatRate = (rate: number) =>
  new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(rate)

function CurrencySelect({ value, onChange }: { value: Currency, onChange: (c: Currency) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Currency)} aria-label="Currency">
      {currencies.map((c) => <option key={c}>{c}</option>)}
    </select>
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
    <form className="row" onSubmit={save}>
      <span className="name">{account.name}</span>
      <input type="number" step="0.01" required value={balance} onChange={(e) => setBalance(e.target.value)} aria-label={`${account.name} balance`} />
      <CurrencySelect value={currency} onChange={setCurrency} />
      <button disabled={!dirty}>Save</button>
      <small>{error || `updated ${new Date(account.updatedAt).toLocaleString('uk-UA')}`}</small>
    </form>
  )
}

type Budget = { monthlySpend: number, currency: Currency, salary: number | null, salaryCurrency: Currency | null }
type Convert = (amount: number, from: Currency, to: Currency) => number | undefined

const AVG_DAYS_IN_MONTH = 30.44

function Estimate({ label, total, burn, currency }: { label: string, total: number, burn: number, currency: Currency }) {
  if (burn <= 0) {
    return (
      <p className="runway-result">
        {label}: <strong>no end</strong>
        <span className="muted"> · you save {format(-burn, currency)} per month</span>
      </p>
    )
  }
  const months = Math.max(0, total / burn)
  const until = new Date(Date.now() + months * AVG_DAYS_IN_MONTH * 864e5)
  return (
    <p className="runway-result">
      {label}: <strong>{months.toFixed(1)} months</strong>
      {months >= 12 && <> (≈ {(months / 12).toFixed(1)} years)</>}
      <span className="muted"> · until {until.toLocaleDateString('uk-UA')} · −{format(burn, currency)} per month</span>
    </p>
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
    <section className="runway">
      <form onSubmit={save}>
        <div className="row">
          <label htmlFor="spend">I spend per month</label>
          <input id="spend" type="number" step="0.01" min="0.01" required value={spend} onChange={(e) => setSpend(e.target.value)} />
          <CurrencySelect value={currency} onChange={setCurrency} />
        </div>
        <div className="row">
          <label htmlFor="salary">My salary per month</label>
          <input id="salary" type="number" step="0.01" min="0" placeholder="optional" value={salary} onChange={(e) => setSalary(e.target.value)} />
          <CurrencySelect value={salaryCurrency} onChange={setSalaryCurrency} />
          <button disabled={!dirty}>Save</button>
        </div>
      </form>
      {error && <p role="alert" className="error">{error}</p>}
      {saved && total !== undefined && (
        <>
          <Estimate label="Without salary" total={total!} burn={saved.monthlySpend} currency={saved.currency} />
          {salaryInSpendCurrency !== undefined && (
            <Estimate label="With salary" total={total!} burn={saved.monthlySpend - salaryInSpendCurrency} currency={saved.currency} />
          )}
        </>
      )}
      {!saved && <p className="muted">Set your monthly spending to see how long your savings last.</p>}
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
    <main>
      <h1>Balances</h1>
      {error && <p role="alert" className="error">{error}</p>}

      <section className="totals">
        {currencies.map((c) => (
          <div key={c}>
            <small className="label"><CurrencyIcon currency={c} /> Total in {c}</small>
            <strong>{rates ? format(totalIn(c)!, c) : '…'}</strong>
            {rates && (
              <small className="rate">
                {c === 'UAH'
                  ? <><BankIcon /> NBU rate · {rates.date}</>
                  : <>1 {symbols[c]} = {formatRate(rates.rates[c])} ₴</>}
              </small>
            )}
          </div>
        ))}
      </section>

      <h2>Runway</h2>
      <Runway totalIn={totalIn} convert={convert} />

      <h2>Accounts</h2>
      {accounts.map((a) => <AccountRow key={`${a.id}-${a.updatedAt}`} account={a} onSaved={replace} />)}
      {accounts.length === 0 && <p className="muted">No accounts yet.</p>}

      <h2>Add account</h2>
      <form className="row" onSubmit={add}>
        <input placeholder="Name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" />
        <input type="number" step="0.01" placeholder="Balance" required value={balance} onChange={(e) => setBalance(e.target.value)} aria-label="Balance" />
        <CurrencySelect value={currency} onChange={setCurrency} />
        <button>Add</button>
      </form>
    </main>
  )
}
