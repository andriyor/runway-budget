import { useEffect, useState, type FormEvent } from 'react'

const currencies = ['USD', 'EUR', 'UAH'] as const
type Currency = typeof currencies[number]
const accountKinds = ['bank', 'cash'] as const
type AccountKind = typeof accountKinds[number]
type Account = { id: number, name: string, currency: Currency, kind: AccountKind, balance: number, updatedAt: string }
type Rates = { date: string, rates: Record<Currency, number> }

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? res.statusText)
  return res.status === 204 ? (undefined as T) : res.json()
}

const format = (amount: number, currency: Currency) =>
  new Intl.NumberFormat('uk-UA', { style: 'currency', currency }).format(amount)

const formatRate = (rate: number) =>
  new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(rate)

const symbols: Record<Currency, string> = { USD: '$', EUR: '€', UAH: '₴' }
const iconColors: Record<Currency, string> = { USD: 'bg-emerald-600', EUR: 'bg-blue-600', UAH: 'bg-amber-600' }

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

function CashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 9.5v5M18 9.5v5" />
    </svg>
  )
}

const kindLabels: Record<AccountKind, string> = { bank: 'Bank', cash: 'Cash' }
const kindIcons: Record<AccountKind, () => React.JSX.Element> = { bank: BankIcon, cash: CashIcon }

function KindToggle({ value, onChange }: { value: AccountKind, onChange: (k: AccountKind) => void }) {
  return (
    <div role="group" aria-label="Account type" className="inline-flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
      {accountKinds.map((k) => {
        const Icon = kindIcons[k]
        const active = k === value
        return (
          <button
            key={k}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(k)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium ${
              active
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Icon /> {kindLabels[k]}
          </button>
        )
      })}
    </div>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8h14l-1 12H6L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  )
}

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18" />
    </svg>
  )
}

function ChevronIcon({ up }: { up?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={up ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
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

type AccountRowProps = {
  account: Account
  onSaved: (a: Account) => void
  onDeleted: (id: number) => void
  // undefined disables the button (first / last row)
  onMoveUp?: () => void
  onMoveDown?: () => void
}

const moveButton = 'rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:invisible dark:hover:bg-zinc-800 dark:hover:text-zinc-200'

function AccountRow({ account, onSaved, onDeleted, onMoveUp, onMoveDown }: AccountRowProps) {
  const [name, setName] = useState(account.name)
  const [balance, setBalance] = useState(String(account.balance))
  const [currency, setCurrency] = useState(account.currency)
  const [kind, setKind] = useState(account.kind)
  const [error, setError] = useState('')
  const dirty = name.trim() !== account.name
    || Number(balance) !== account.balance
    || currency !== account.currency
    || kind !== account.kind

  async function save(e: FormEvent) {
    e.preventDefault()
    try {
      onSaved(await api<Account>(`/accounts/${account.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim(), balance: Number(balance), currency, kind }),
      }))
      setError('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function remove() {
    if (!confirm(`Delete account "${account.name}"? Its balance will no longer be counted.`)) return
    try {
      await api(`/accounts/${account.id}`, { method: 'DELETE' })
      onDeleted(account.id)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <li className="py-3">
      <form className="flex flex-wrap items-center gap-3" onSubmit={save}>
        <div className="-ml-2 flex flex-col">
          <button type="button" onClick={onMoveUp} disabled={!onMoveUp} aria-label={`Move ${account.name} up`} className={moveButton}>
            <ChevronIcon up />
          </button>
          <button type="button" onClick={onMoveDown} disabled={!onMoveDown} aria-label={`Move ${account.name} down`} className={moveButton}>
            <ChevronIcon />
          </button>
        </div>
        <CurrencyIcon currency={account.currency} className="size-9 text-sm" />
        <div className="min-w-32 flex-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            pattern=".*\S.*"
            aria-label="Account name"
            title="Click to rename"
            className="-mx-1.5 w-full rounded-md bg-transparent px-1.5 py-0.5 font-medium text-zinc-900 outline-none hover:bg-zinc-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus:bg-zinc-950"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            updated {new Date(account.updatedAt).toLocaleString('uk-UA')}
          </p>
        </div>
        <KindToggle value={kind} onChange={setKind} />
        <div className="w-56">
          <MoneyInput label={`${account.name} balance`} required value={balance} onChange={setBalance} currency={currency} onCurrency={setCurrency} />
        </div>
        <button className={button} disabled={!dirty}>Save</button>
        <button
          type="button"
          onClick={remove}
          aria-label={`Delete account ${account.name}`}
          className="rounded-md p-2 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600 dark:hover:bg-zinc-800"
        >
          <TrashIcon />
        </button>
      </form>
      <ErrorText>{error}</ErrorText>
    </li>
  )
}

type Budget = {
  monthlySpend: number
  currency: Currency
  salary: number | null
  salaryCurrency: Currency | null
  reserve: number | null
  reserveCurrency: Currency | null
}
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

const amountString = (n: number | null) => (n === null ? '' : String(n))

// request body for PUT /budget; empty optional amount omits (clears) its pair
function budgetBody(spend: string, currency: Currency, salary: string, salaryCurrency: Currency, reserve: string, reserveCurrency: Currency) {
  return {
    monthlySpend: Number(spend),
    currency,
    ...(salary !== '' && { salary: Number(salary), salaryCurrency }),
    ...(reserve !== '' && { reserve: Number(reserve), reserveCurrency }),
  }
}

type RunwayProps = {
  saved: Budget | null
  onSaved: (b: Budget) => void
  availableIn: (c: Currency) => number | undefined
  reserveIn: (c: Currency) => number
  salaryIn: (c: Currency) => number | undefined
}

function Runway({ saved, onSaved, availableIn, reserveIn, salaryIn }: RunwayProps) {
  const [spend, setSpend] = useState(saved ? String(saved.monthlySpend) : '')
  const [currency, setCurrency] = useState<Currency>(saved?.currency ?? 'UAH')
  const [salary, setSalary] = useState(amountString(saved?.salary ?? null))
  const [salaryCurrency, setSalaryCurrency] = useState<Currency>(saved?.salaryCurrency ?? 'UAH')
  const [reserve, setReserve] = useState(amountString(saved?.reserve ?? null))
  const [reserveCurrency, setReserveCurrency] = useState<Currency>(saved?.reserveCurrency ?? 'UAH')
  const [error, setError] = useState('')

  const body = budgetBody(spend, currency, salary, salaryCurrency, reserve, reserveCurrency)

  async function save(e: FormEvent) {
    e.preventDefault()
    try {
      onSaved(await api<Budget>('/budget', { method: 'PUT', body: JSON.stringify(body) }))
      setError('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const dirty = !saved || JSON.stringify(body) !== JSON.stringify(budgetBody(
    String(saved.monthlySpend), saved.currency,
    amountString(saved.salary), saved.salaryCurrency ?? salaryCurrency,
    amountString(saved.reserve), saved.reserveCurrency ?? reserveCurrency,
  ))

  const available = saved ? availableIn(saved.currency) : undefined
  const reserved = saved ? reserveIn(saved.currency) : 0
  const salaryInSpendCurrency = saved ? salaryIn(saved.currency) : undefined

  const fieldLabel = 'flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300'
  const optional = <span className="font-normal text-zinc-400">· optional</span>

  return (
    <section className={`${card} grid gap-6 md:grid-cols-2`}>
      <form className="flex flex-col gap-4" onSubmit={save}>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Runway</h2>
          <p className={muted}>How long your savings last.</p>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}><span className="text-rose-500"><BagIcon /></span> I spend per month</span>
          <MoneyInput id="spend" label="Monthly spend" required min="0.01" value={spend} onChange={setSpend} currency={currency} onCurrency={setCurrency} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}><span className="text-emerald-600"><BriefcaseIcon /></span> My salary per month {optional}</span>
          <MoneyInput id="salary" label="Monthly salary" min="0" placeholder="leave empty if none" value={salary} onChange={setSalary} currency={salaryCurrency} onCurrency={setSalaryCurrency} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}><span className="text-amber-500"><LockIcon /></span> Untouchable reserve {optional}</span>
          <MoneyInput id="reserve" label="Untouchable reserve" min="0" placeholder="never spent, excluded from runway" value={reserve} onChange={setReserve} currency={reserveCurrency} onCurrency={setReserveCurrency} />
        </label>
        <div>
          <button className={button} disabled={!dirty}>Save</button>
          <ErrorText>{error}</ErrorText>
        </div>
      </form>
      <div className="flex flex-col justify-center gap-3">
        {saved && available !== undefined
          ? (
            <>
              {reserved > 0 && (
                <p className={`flex flex-wrap items-center gap-x-2 tabular-nums ${muted}`}>
                  <LockIcon />
                  <span>{format(reserved, saved.currency)} untouchable</span>
                  <span>·</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{format(Math.max(0, available), saved.currency)} available</span>
                </p>
              )}
              <Estimate label="Without salary" total={available} burn={saved.monthlySpend} currency={saved.currency} />
              {salaryInSpendCurrency !== undefined && (
                <Estimate label="With salary" total={available} burn={saved.monthlySpend - salaryInSpendCurrency} currency={saved.currency} />
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

type Goal = { id: number, name: string, target: number, currency: Currency }

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  )
}

type GoalsProps = {
  availableIn: (c: Currency) => number | undefined
  // salary minus spending per month; undefined when spending is not set
  netIn: (c: Currency) => number | undefined
}

function Goals({ availableIn, netIn }: GoalsProps) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [error, setError] = useState('')
  const [now] = useState(Date.now)

  useEffect(() => {
    api<Goal[]>('/goals').then(setGoals).catch((e) => setError(e.message))
  }, [])

  async function add(e: FormEvent) {
    e.preventDefault()
    try {
      const created = await api<Goal>('/goals', {
        method: 'POST',
        body: JSON.stringify({ name, target: Number(target), currency }),
      })
      setGoals((list) => [...list, created])
      setName('')
      setTarget('')
      setError('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function remove(goal: Goal) {
    if (!confirm(`Delete goal "${goal.name}"?`)) return
    try {
      await api(`/goals/${goal.id}`, { method: 'DELETE' })
      setGoals((list) => list.filter((g) => g.id !== goal.id))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  function status(goal: Goal, have: number) {
    if (have >= goal.target) return <span className="font-medium text-emerald-600 dark:text-emerald-400">Reached</span>
    const net = netIn(goal.currency)
    if (net === undefined) return <span className={muted}>Set monthly spending and salary to see when.</span>
    if (net <= 0) return <span className="text-rose-600 dark:text-rose-400">Not reachable: you spend at least as much as you earn.</span>
    const months = (goal.target - have) / net
    const when = new Date(now + months * AVG_DAYS_IN_MONTH * 864e5)
    return (
      <span className="text-zinc-700 tabular-nums dark:text-zinc-300">
        In <strong>{months.toFixed(1)} months</strong>
        <span className="text-zinc-500 dark:text-zinc-400"> · {when.toLocaleDateString('uk-UA')} · saving {format(net, goal.currency)} per month</span>
      </span>
    )
  }

  return (
    <section className={card}>
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Goals</h2>
        <p className={muted}>Measured against your available savings. Each goal assumes your whole monthly surplus goes to it.</p>
      </div>

      <ul className="mt-4 flex flex-col gap-5">
        {goals.map((g) => {
          const available = availableIn(g.currency)
          const have = Math.max(0, available ?? 0)
          const progress = Math.min(1, have / g.target)
          return (
            <li key={g.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <CurrencyIcon currency={g.currency} />
                  <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{g.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`tabular-nums ${muted}`}>
                    {format(Math.min(have, g.target), g.currency)} / {format(g.target, g.currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(g)}
                    aria-label={`Delete goal ${g.name}`}
                    className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600 dark:hover:bg-zinc-800"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
              <div
                role="progressbar"
                aria-label={`${g.name} progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
                className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
              >
                <div
                  className={`h-full rounded-full transition-[width] ${progress >= 1 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-sm">{available === undefined ? <Skeleton /> : status(g, have)}</p>
            </li>
          )
        })}
      </ul>
      {goals.length === 0 && <p className={`py-6 text-center ${muted}`}>No goals yet. Add one below.</p>}
      <ErrorText>{error}</ErrorText>

      <form className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50" onSubmit={add}>
        <input
          placeholder="Goal, e.g. Car"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Goal name"
          className={`min-w-40 flex-1 px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 ${inputBox}`}
        />
        <div className="w-56">
          <MoneyInput label="Goal amount" required min="0.01" placeholder="Amount" value={target} onChange={setTarget} currency={currency} onCurrency={setCurrency} />
        </div>
        <button className={button}>Add goal</button>
      </form>
    </section>
  )
}

function Allocation({ accounts, convert }: { accounts: Account[], convert: Convert }) {
  const byCurrency = currencies
    .map((c) => {
      const own = accounts.filter((a) => a.currency === c)
      const sum = own.reduce((total, a) => total + a.balance, 0)
      return { currency: c, count: own.length, sum, uah: convert(sum, c, 'UAH') }
    })
    .filter((row) => row.count > 0)
  const totalUah = byCurrency.reduce((total, row) => total + (row.uah ?? 0), 0)
  if (byCurrency.length === 0) return null
  const rows = byCurrency.map((row) => {
    const share = row.uah === undefined || totalUah <= 0 ? undefined : row.uah / totalUah
    return { ...row, share, percent: share === undefined ? undefined : Math.round(share * 1000) / 10 }
  })

  return (
    <section className={card}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">By currency</h2>
        <span className={muted}>share of total at NBU rate</span>
      </div>
      <div className="mt-4 flex h-3 gap-0.5" role="img" aria-label={rows.map((r) => `${r.currency} ${r.percent ?? '?'}%`).join(', ')}>
        {rows.map(({ currency, share, percent }) => (
          <div
            key={currency}
            title={`${currency}: ${percent}% of total`}
            className={`h-full rounded-[4px] transition-[flex-grow] ${iconColors[currency]}`}
            style={{ flexGrow: Math.max(0, share ?? 0), flexBasis: 0 }}
          />
        ))}
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {rows.map(({ currency, count, sum, percent }) => (
          <li key={currency} className="flex items-start gap-2">
            <CurrencyIcon currency={currency} />
            <div className="min-w-0">
              <p className="font-medium text-zinc-900 tabular-nums dark:text-zinc-100">
                {currency}
                {percent !== undefined && <span className="ml-1.5 font-semibold">{percent}%</span>}
              </p>
              <p className={`truncate tabular-nums ${muted}`}>
                {format(sum, currency)} · {count} {count === 1 ? 'account' : 'accounts'}
              </p>
            </div>
          </li>
        ))}
      </ul>
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
  const availableIn = (c: Currency) => {
    const total = totalIn(c)
    return total === undefined ? undefined : total - reserveIn(c)
  }
  const netIn = (c: Currency) =>
    budget && rates ? (salaryIn(c) ?? 0) - convert(budget.monthlySpend, budget.currency, c)! : undefined

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

      <Allocation accounts={accounts} convert={convert} />

      {budget !== undefined && (
        <Runway saved={budget} onSaved={setBudget} availableIn={availableIn} reserveIn={reserveIn} salaryIn={salaryIn} />
      )}

      <Goals availableIn={availableIn} netIn={netIn} />

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
    </main>
  )
}
