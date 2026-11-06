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

type Budget = { monthlySpend: number, currency: Currency }

const AVG_DAYS_IN_MONTH = 30.44

function Runway({ totalIn }: { totalIn: (c: Currency) => number | undefined }) {
  const [saved, setSaved] = useState<Budget | null>(null)
  const [spend, setSpend] = useState('')
  const [currency, setCurrency] = useState<Currency>('UAH')
  const [error, setError] = useState('')

  useEffect(() => {
    api<Budget | null>('/budget').then((b) => {
      setSaved(b)
      if (b) {
        setSpend(String(b.monthlySpend))
        setCurrency(b.currency)
      }
    }).catch((e) => setError(e.message))
  }, [])

  async function save(e: FormEvent) {
    e.preventDefault()
    try {
      setSaved(await api<Budget>('/budget', {
        method: 'PUT',
        body: JSON.stringify({ monthlySpend: Number(spend), currency }),
      }))
      setError('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const total = saved && totalIn(saved.currency)
  const months = saved && total !== undefined ? Math.max(0, total! / saved.monthlySpend) : undefined
  const until = months !== undefined && new Date(Date.now() + months * AVG_DAYS_IN_MONTH * 864e5)
  const dirty = !saved || Number(spend) !== saved.monthlySpend || currency !== saved.currency

  return (
    <section className="runway">
      <form className="row" onSubmit={save}>
        <label htmlFor="spend">I spend per month</label>
        <input id="spend" type="number" step="0.01" min="0.01" required value={spend} onChange={(e) => setSpend(e.target.value)} />
        <CurrencySelect value={currency} onChange={setCurrency} />
        <button disabled={!dirty}>Save</button>
      </form>
      {error && <p role="alert" className="error">{error}</p>}
      {months !== undefined && (
        <p className="runway-result">
          Without salary you can live <strong>{months.toFixed(1)} months</strong>
          {months >= 12 && <> (≈ {(months / 12).toFixed(1)} years)</>}
          {until && <span className="muted"> · until {until.toLocaleDateString('uk-UA')}</span>}
        </p>
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
  const totalIn = (target: Currency) =>
    rates && accounts.reduce((sum, a) => sum + (a.balance * rates.rates[a.currency]) / rates.rates[target], 0)

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
      <Runway totalIn={totalIn} />

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
