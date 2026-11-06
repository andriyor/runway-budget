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
            <small>Total in {c}</small>
            <strong>{rates ? format(totalIn(c)!, c) : '…'}</strong>
          </div>
        ))}
      </section>
      {rates && (
        <p className="muted">
          NBU rates on {rates.date}: 1 USD = {rates.rates.USD} UAH, 1 EUR = {rates.rates.EUR} UAH
        </p>
      )}

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
