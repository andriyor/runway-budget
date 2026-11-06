import { useEffect, useState, type FormEvent } from 'react'

const currencies = ['USD', 'EUR', 'UAH'] as const
type Currency = typeof currencies[number]
const accountKinds = ['bank', 'cash'] as const
type AccountKind = typeof accountKinds[number]
type Account = { id: number, name: string, currency: Currency, kind: AccountKind, balance: number, updatedAt: string, monoAccountId: string | null }
type Transaction = { id: number, accountId: number, externalId: string, time: string, description: string, mcc: number, amount: number, category: string, categorySource: 'transaction' | 'merchant' | 'auto', mccDescription: string | null, merchantDomain: string | null }
type Category = { id: string, label: string, emoji: string, spending: boolean, subcategories: Array<{ id: string, label: string }> }
// what a transaction's category id points at: a subcategory, or a category without subcategories
type Leaf = { id: string, label: string, parent: Category }
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

const linkButton = 'shrink-0 font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400'
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

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7ZM4 10h16M8 3v4M16 3v4" />
    </svg>
  )
}

function TrendDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 7 6 6 4-4 8 8" />
      <path d="M15 17h6v-6" />
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
  minimalSpend: number | null
  minimalSpendCurrency: Currency | null
  targetMonths: number | null
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

type SpendLimitProps = { months: number, total: number, spend: number, minimal: number | undefined, currency: Currency }

// the most you can spend per month to make savings last `months` without salary
function SpendLimit({ months, total, spend, minimal, currency }: SpendLimitProps) {
  const limit = Math.max(0, total) / months
  const diff = limit - spend
  return (
    <div className="rounded-xl bg-violet-50 p-4 dark:bg-violet-950/40">
      <p className={muted}>To last {months} months without salary</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
        {format(limit, currency)} <span className="text-base font-normal text-zinc-500">per month at most</span>
      </p>
      <p className={`mt-1 text-sm tabular-nums ${diff >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
        {diff >= 0 ? `${format(diff, currency)} more than you spend now` : `cut ${format(-diff, currency)} from your usual spending`}
      </p>
      {minimal !== undefined && limit < minimal && (
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">Below your extreme-saving budget, likely not realistic.</p>
      )}
    </div>
  )
}

const amountString = (n: number | null) => (n === null ? '' : String(n))

// amounts as typed in the inputs; '' means not set
type BudgetForm = {
  spend: string
  currency: Currency
  salary: string
  salaryCurrency: Currency
  reserve: string
  reserveCurrency: Currency
  minimal: string
  minimalCurrency: Currency
  months: string
}

const toForm = (b: Budget | null, fallback: Currency = 'UAH'): BudgetForm => ({
  spend: b ? String(b.monthlySpend) : '',
  currency: b?.currency ?? fallback,
  salary: amountString(b?.salary ?? null),
  salaryCurrency: b?.salaryCurrency ?? fallback,
  reserve: amountString(b?.reserve ?? null),
  reserveCurrency: b?.reserveCurrency ?? fallback,
  minimal: amountString(b?.minimalSpend ?? null),
  minimalCurrency: b?.minimalSpendCurrency ?? fallback,
  months: amountString(b?.targetMonths ?? null),
})

// request body for PUT /budget; empty optional amount omits (clears) its pair
function budgetBody(f: BudgetForm) {
  return {
    monthlySpend: Number(f.spend),
    currency: f.currency,
    ...(f.salary !== '' && { salary: Number(f.salary), salaryCurrency: f.salaryCurrency }),
    ...(f.reserve !== '' && { reserve: Number(f.reserve), reserveCurrency: f.reserveCurrency }),
    ...(f.minimal !== '' && { minimalSpend: Number(f.minimal), minimalSpendCurrency: f.minimalCurrency }),
    ...(f.months !== '' && { targetMonths: Number(f.months) }),
  }
}

type RunwayProps = {
  saved: Budget | null
  onSaved: (b: Budget) => void
  availableIn: (c: Currency) => number | undefined
  reserveIn: (c: Currency) => number
  salaryIn: (c: Currency) => number | undefined
  minimalIn: (c: Currency) => number | undefined
}

function Runway({ saved, onSaved, availableIn, reserveIn, salaryIn, minimalIn }: RunwayProps) {
  const [form, setForm] = useState(() => toForm(saved))
  const [error, setError] = useState('')
  const field = <K extends keyof BudgetForm>(key: K) => (value: BudgetForm[K]) => setForm((f) => ({ ...f, [key]: value }))

  const body = budgetBody(form)

  async function save(e: FormEvent) {
    e.preventDefault()
    try {
      onSaved(await api<Budget>('/budget', { method: 'PUT', body: JSON.stringify(body) }))
      setError('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  // unset optional currencies fall back to the form's, so they don't count as changes
  const dirty = !saved || JSON.stringify(body) !== JSON.stringify(budgetBody({
    ...toForm(saved),
    salaryCurrency: saved.salaryCurrency ?? form.salaryCurrency,
    reserveCurrency: saved.reserveCurrency ?? form.reserveCurrency,
    minimalCurrency: saved.minimalSpendCurrency ?? form.minimalCurrency,
  }))

  const available = saved ? availableIn(saved.currency) : undefined
  const reserved = saved ? reserveIn(saved.currency) : 0
  const salaryInSpendCurrency = saved ? salaryIn(saved.currency) : undefined
  const minimalInSpendCurrency = saved ? minimalIn(saved.currency) : undefined

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
          <MoneyInput id="spend" label="Monthly spend" required min="0.01" value={form.spend} onChange={field('spend')} currency={form.currency} onCurrency={field('currency')} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}><span className="text-sky-600"><TrendDownIcon /></span> Extreme saving per month {optional}</span>
          <MoneyInput id="minimal" label="Extreme saving per month" min="0.01" placeholder="bare minimum, less than usual" value={form.minimal} onChange={field('minimal')} currency={form.minimalCurrency} onCurrency={field('minimalCurrency')} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}><span className="text-emerald-600"><BriefcaseIcon /></span> My salary per month {optional}</span>
          <MoneyInput id="salary" label="Monthly salary" min="0" placeholder="leave empty if none" value={form.salary} onChange={field('salary')} currency={form.salaryCurrency} onCurrency={field('salaryCurrency')} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}><span className="text-amber-500"><LockIcon /></span> Untouchable reserve {optional}</span>
          <MoneyInput id="reserve" label="Untouchable reserve" min="0" placeholder="never spent, excluded from runway" value={form.reserve} onChange={field('reserve')} currency={form.reserveCurrency} onCurrency={field('reserveCurrency')} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}><span className="text-violet-600"><CalendarIcon /></span> Live without salary for {optional}</span>
          <div className={`flex items-center ${inputBox}`}>
            <input
              id="months"
              type="number"
              step="1"
              min="1"
              placeholder="months, shows how much you can spend"
              value={form.months}
              onChange={(e) => field('months')(e.target.value)}
              className="w-full min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-zinc-900 tabular-nums outline-none placeholder:text-zinc-400 dark:text-zinc-100"
            />
            <span className="px-3 text-sm text-zinc-500">months</span>
          </div>
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
              {minimalInSpendCurrency !== undefined && (
                <>
                  <Estimate label="Extreme saving, without salary" total={available} burn={minimalInSpendCurrency} currency={saved.currency} />
                  {minimalInSpendCurrency >= saved.monthlySpend && (
                    <p className="text-sm text-amber-700 dark:text-amber-400">Extreme saving is not below your usual spending.</p>
                  )}
                </>
              )}
              {saved.targetMonths !== null && (
                <SpendLimit months={saved.targetMonths} total={available} spend={saved.monthlySpend} minimal={minimalInSpendCurrency} currency={saved.currency} />
              )}
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

type Cushion = { months: number, amount: number, available: number, currency: Currency }

type GoalsProps = {
  // available savings minus the months-without-salary cushion
  forGoalsIn: (c: Currency) => number | undefined
  cushion: Cushion | undefined
  // salary minus spending per month; undefined when spending is not set
  netIn: (c: Currency) => number | undefined
}

function Goals({ forGoalsIn, cushion, netIn }: GoalsProps) {
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
        {cushion && (
          <p className={`mt-1 flex flex-wrap items-center gap-x-2 tabular-nums ${muted}`}>
            <CalendarIcon />
            <span>{format(cushion.amount, cushion.currency)} kept as a {cushion.months}-month cushion</span>
            {cushion.available < cushion.amount && (
              <span className="text-amber-700 dark:text-amber-400">· {format(cushion.amount - Math.max(0, cushion.available), cushion.currency)} short of covering it</span>
            )}
          </p>
        )}
      </div>

      <ul className="mt-4 flex flex-col gap-5">
        {goals.map((g) => {
          const forGoals = forGoalsIn(g.currency)
          const have = Math.max(0, forGoals ?? 0)
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
              <p className="mt-1.5 text-sm">{forGoals === undefined ? <Skeleton /> : status(g, have)}</p>
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

type Slice = {
  key: string
  label: string
  icon: React.ReactNode
  color: string
  // share of the whole, 0..1; undefined until rates load
  share: number | undefined
  detail: string
}

const percentOf = (share: number | undefined) => (share === undefined ? undefined : Math.round(share * 1000) / 10)

function ShareBar({ title, slices }: { title: string, slices: Slice[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</h3>
      <div
        className="mt-2 flex h-3 gap-0.5"
        role="img"
        aria-label={`${title}: ${slices.map((x) => `${x.label} ${percentOf(x.share) ?? '?'}%`).join(', ')}`}
      >
        {slices.map((x) => (
          <div
            key={x.key}
            title={`${x.label}: ${percentOf(x.share)}% of total`}
            className={`h-full rounded-[4px] transition-[flex-grow] ${x.color}`}
            style={{ flexGrow: Math.max(0, x.share ?? 0), flexBasis: 0 }}
          />
        ))}
      </div>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {slices.map((x) => (
          <li key={x.key} className="flex items-start gap-2">
            {x.icon}
            <div className="min-w-0">
              <p className="font-medium text-zinc-900 tabular-nums dark:text-zinc-100">
                {x.label}
                {x.share !== undefined && <span className="ml-1.5 font-semibold">{percentOf(x.share)}%</span>}
              </p>
              <p className={`truncate tabular-nums ${muted}`}>{x.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

const kindColors: Record<AccountKind, string> = { bank: 'bg-violet-600', cash: 'bg-teal-600' }
const accountCount = (n: number) => `${n} ${n === 1 ? 'account' : 'accounts'}`

function Allocation({ accounts, convert }: { accounts: Account[], convert: Convert }) {
  if (accounts.length === 0) return null
  const uahOf = (list: Account[]) => {
    let total = 0
    for (const a of list) {
      const uah = convert(a.balance, a.currency, 'UAH')
      if (uah === undefined) return undefined
      total += uah
    }
    return total
  }
  const totalUah = uahOf(accounts)
  const shareOf = (list: Account[]) => {
    const uah = uahOf(list)
    return uah === undefined || totalUah === undefined || totalUah <= 0 ? undefined : uah / totalUah
  }

  const byCurrency: Slice[] = currencies
    .map((c) => ({ c, list: accounts.filter((a) => a.currency === c) }))
    .filter(({ list }) => list.length > 0)
    .map(({ c, list }) => ({
      key: c,
      label: c,
      icon: <CurrencyIcon currency={c} />,
      color: iconColors[c],
      share: shareOf(list),
      detail: `${format(list.reduce((sum, a) => sum + a.balance, 0), c)} · ${accountCount(list.length)}`,
    }))

  const byKind: Slice[] = accountKinds
    .map((k) => ({ k, list: accounts.filter((a) => a.kind === k) }))
    .filter(({ list }) => list.length > 0)
    .map(({ k, list }) => {
      const Icon = kindIcons[k]
      const uah = uahOf(list)
      return {
        key: k,
        label: kindLabels[k],
        icon: (
          <span className={`inline-grid size-6 shrink-0 place-items-center rounded-full text-white ${kindColors[k]}`} aria-hidden="true">
            <Icon />
          </span>
        ),
        color: kindColors[k],
        share: shareOf(list),
        detail: `${uah === undefined ? '…' : format(uah, 'UAH')} · ${accountCount(list.length)}`,
      }
    })

  return (
    <section className={card}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Allocation</h2>
        <span className={muted}>share of total at NBU rate</span>
      </div>
      <div className="mt-4 flex flex-col gap-6">
        <ShareBar title="By currency" slices={byCurrency} />
        <ShareBar title="By type" slices={byKind} />
      </div>
    </section>
  )
}

function Nav({ page }: { page: string }) {
  const link = (href: string, label: string) => (
    <a
      href={href}
      aria-current={page === href ? 'page' : undefined}
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 aria-[current=page]:bg-zinc-900 aria-[current=page]:text-white dark:text-zinc-300 dark:hover:bg-zinc-800 dark:aria-[current=page]:bg-zinc-100 dark:aria-[current=page]:text-zinc-900"
    >
      {label}
    </a>
  )
  return <nav className="flex gap-2">{link('#/', 'Balances')}{link('#/transactions', 'Transactions')}</nav>
}

// ponytail: favicons via Google's public service, so it sees which merchant domains are shown; proxy through the API if that matters
function MerchantIcon({ domain, emoji }: { domain: string | null, emoji: string }) {
  const [failed, setFailed] = useState(false)
  if (domain && !failed) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt=""
        onError={() => setFailed(true)}
        className="size-9 shrink-0 rounded-full bg-white object-contain p-1.5 ring-1 ring-zinc-200 dark:ring-zinc-700"
      />
    )
  }
  return (
    <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-100 text-lg dark:bg-zinc-800">
      {emoji}
    </span>
  )
}

type CategorySpendingProps = {
  list: Transaction[]
  currency: Currency
  leafById: Map<string, Leaf>
  selected?: string
  onSelect: (category?: string) => void
}

// Totals per category, and per subcategory for the one that is open. Categories marked not spending
// (income, own-account moves) stay out; refunds (positive amounts) reduce their category.
function CategorySpending({ list, currency, leafById, selected, onSelect }: CategorySpendingProps) {
  const parents = new Map([...leafById.values()].map((l) => [l.parent.id, l.parent]))
  const byParent = new Map<string, number>()
  const byLeaf = new Map<string, number>()
  for (const t of list) {
    const parent = leafById.get(t.category)?.parent
    if (!parent?.spending) continue
    byParent.set(parent.id, (byParent.get(parent.id) ?? 0) - t.amount)
    byLeaf.set(t.category, (byLeaf.get(t.category) ?? 0) - t.amount)
  }
  const rows = [...byParent].filter(([, sum]) => sum > 0).sort((a, b) => b[1] - a[1])
  const total = rows.reduce((sum, [, x]) => sum + x, 0)
  if (total === 0) return null
  const day = new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium' })
  // the open category: the selected one, or the parent of a selected subcategory
  const open = selected && (leafById.get(selected)?.parent.id ?? selected)

  const row = (id: string, label: string, emoji: string | undefined, sum: number, max: number, onClick: () => void, sub = false) => (
    <li key={id} className={sub ? 'ml-11' : undefined}>
      <button
        type="button"
        aria-pressed={selected === id}
        onClick={onClick}
        className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-1 text-left hover:bg-zinc-50 aria-pressed:bg-indigo-50 aria-pressed:ring-1 aria-pressed:ring-indigo-200 dark:hover:bg-zinc-800/50 dark:aria-pressed:bg-indigo-950/40 dark:aria-pressed:ring-indigo-900"
      >
        {emoji && (
          <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-base dark:bg-zinc-800">{emoji}</span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className={`truncate ${sub ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-900 dark:text-zinc-100'}`}>{label}</span>
            <span className="shrink-0 font-medium text-zinc-900 tabular-nums dark:text-zinc-100">
              {format(sum, currency)}
              <span className={`ml-2 inline-block w-12 text-right ${muted}`}>{percentOf(sum / total)}%</span>
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className={`h-full rounded-full ${sub ? 'bg-indigo-300 dark:bg-indigo-400' : 'bg-indigo-500'}`} style={{ width: `${(sum / max) * 100}%` }} />
          </div>
        </div>
      </button>
    </li>
  )

  return (
    <section className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Spending by category</h2>
        <span className={`tabular-nums ${muted}`}>
          {day.format(new Date(list.at(-1)!.time))} – {day.format(new Date(list[0].time))} · {format(total, currency)}
        </span>
      </div>
      <ul className="mt-3 flex flex-col gap-3">
        {rows.flatMap(([id, sum]) => {
          const parent = parents.get(id)!
          const subs = id === open
            ? parent.subcategories.map((sc) => [sc, byLeaf.get(sc.id) ?? 0] as const).filter(([, x]) => x > 0).sort((a, b) => b[1] - a[1])
            : []
          return [
            row(id, parent.label, parent.emoji, sum, rows[0][1], () => onSelect(selected === id ? undefined : id)),
            ...subs.map(([sc, x]) => row(sc.id, sc.label, undefined, x, subs[0][1], () => onSelect(selected === sc.id ? id : sc.id), true)),
          ]
        })}
      </ul>
    </section>
  )
}

// ISO 8601 week: weeks start on Monday, week 1 holds the year's first Thursday
function isoWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const year = d.getUTCFullYear()
  return { year, week: Math.ceil(((d.getTime() - Date.UTC(year, 0, 1)) / 86_400_000 + 1) / 7) }
}

const monthName = new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric' })
const shortDay = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' })

// month and week keys a transaction belongs to, with a label for each, in local time
function periodsOf(t: Transaction): Array<[string, string]> {
  const date = new Date(t.time)
  const { year, week } = isoWeek(date)
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() || 7) - 1))
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  return [
    [`m:${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, monthName.format(date)],
    [`w:${year}-${String(week).padStart(2, '0')}`, `Тиждень ${week} · ${shortDay.format(monday)} – ${shortDay.format(sunday)} ${year}`],
  ]
}

function TransactionsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState<number>()
  const [list, setList] = useState<Transaction[]>()
  const [error, setError] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [category, setCategory] = useState<string>()
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [period, setPeriod] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const account = accounts.find((a) => a.id === accountId)
  const leafById = new Map<string, Leaf>(categories.flatMap((c) =>
    c.subcategories.length ? c.subcategories.map((sc) => [sc.id, { ...sc, parent: c }] as const) : [[c.id, { id: c.id, label: c.label, parent: c }] as const]))
  // a selection is a category (matches all its subcategories) or a single subcategory
  const inSelection = (t: Transaction) => t.category === category || leafById.get(t.category)?.parent.id === category
  const selectionLabel = (id: string) => {
    const leaf = leafById.get(id)
    if (!leaf) return categories.find((c) => c.id === id)?.label
    return leaf.id === leaf.parent.id ? leaf.label : `${leaf.parent.label} › ${leaf.label}`
  }

  useEffect(() => {
    api<Account[]>('/accounts')
      .then((all) => {
        setAccounts(all)
        setAccountId((all.find((a) => a.monoAccountId) ?? all[0])?.id)
      })
      .catch((e) => setError(e.message))
    api<Category[]>('/categories').then(setCategories).catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (accountId === undefined) return
    api<Transaction[]>(`/accounts/${accountId}/transactions`).then(setList).catch((e) => setError(e.message))
  }, [accountId])

  async function sync() {
    setSyncing(true)
    try {
      const { account: synced } = await api<{ account: Account }>('/accounts/mono/sync', { method: 'POST' })
      setAccounts((all) => (all.some((a) => a.id === synced.id) ? all.map((a) => (a.id === synced.id ? synced : a)) : [...all, synced]))
      setList(await api<Transaction[]>(`/accounts/${synced.id}/transactions`))
      setAccountId(synced.id)
      setError('')
    } catch (err) {
      setError(`Monobank: ${(err as Error).message}`)
    } finally {
      setSyncing(false)
    }
  }

  // A merchant change touches other rows, so reload the list after any change
  async function changeCategory(t: Transaction, steps: Array<{ path: string, body: object }>) {
    try {
      for (const { path, body } of steps) await api(path, { method: 'PUT', body: JSON.stringify(body) })
      setList(await api<Transaction[]>(`/accounts/${t.accountId}/transactions`))
    } catch (err) {
      setError(`Category: ${(err as Error).message}`)
    }
  }
  const setOwn = (t: Transaction, category: string | null) => ({ path: `/categories/transactions/${t.id}`, body: { category } })
  const setMerchant = (t: Transaction, category: string | null) => ({ path: '/categories/merchants', body: { description: t.description, category } })

  const dateTime = new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium', timeStyle: 'short' })

  const periods = new Map<string, string>()
  for (const t of list ?? []) for (const [key, label] of periodsOf(t)) periods.set(key, label)
  // keys sort chronologically as text; newest first
  const periodOptions = (prefix: string) => [...periods].filter(([key]) => key.startsWith(prefix)).sort(([a], [b]) => b.localeCompare(a))
  const shown = period ? list?.filter((t) => periodsOf(t).some(([key]) => key === period)) : list

  return (
    <>
      {error && (
        <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900">
          {error}
        </p>
      )}
      <section className={card}>
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Account"
            value={accountId ?? ''}
            onChange={(e) => { setList(undefined); setCategory(undefined); setPeriod(''); setAccountId(Number(e.target.value)) }}
            className={`min-w-40 flex-1 px-3 py-2 text-sm text-zinc-900 outline-none dark:text-zinc-100 ${inputBox}`}
          >
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}
          </select>
          <select
            aria-label="Period"
            value={period}
            onChange={(e) => { setCategory(undefined); setPeriod(e.target.value) }}
            className={`min-w-40 px-3 py-2 text-sm text-zinc-900 outline-none dark:text-zinc-100 ${inputBox}`}
          >
            <option value="">Увесь час</option>
            <optgroup label="Місяць">
              {periodOptions('m:').map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </optgroup>
            <optgroup label="Тиждень">
              {periodOptions('w:').map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </optgroup>
          </select>
          {account && (
            <span className="text-lg font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">{format(account.balance, account.currency)}</span>
          )}
          <button className={button} onClick={sync} disabled={syncing}>{syncing ? 'Syncing…' : 'Sync Monobank'}</button>
        </div>

        {accounts.length === 0 && <p className={`py-6 text-center ${muted}`}>No accounts yet. Sync Monobank to create one.</p>}
        {account && !list && <div className="mt-4"><Skeleton /></div>}
        {account && list?.length === 0 && <p className={`py-6 text-center ${muted}`}>No transactions for this account.</p>}
      </section>
      {account && shown && list!.length > 0 && (
        <>
          <CategorySpending list={shown} currency={account.currency} leafById={leafById} selected={category} onSelect={setCategory} />
          <section className={card}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-3">
                <span className="truncate text-zinc-700 dark:text-zinc-300">{category ? selectionLabel(category) : 'All transactions'}</span>
                {category && (
                  <button type="button" onClick={() => setCategory(undefined)} className="shrink-0 font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                    Show all
                  </button>
                )}
              </span>
              <div role="group" aria-label="Sort by" className="inline-flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
                {(['date', 'amount'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={sortBy === key}
                    onClick={() => setSortBy(key)}
                    className={`rounded-md px-2.5 py-1 font-medium ${
                      sortBy === key
                        ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    {key === 'date' ? 'Date' : 'Amount'}
                  </button>
                ))}
              </div>
            </div>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {/* the API returns newest first; amount sorts biggest first, income and spending alike */}
              {(category ? shown.filter(inSelection) : shown)
                .toSorted((a, b) => (sortBy === 'amount' ? Math.abs(b.amount) - Math.abs(a.amount) : 0))
                .map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <MerchantIcon domain={t.merchantDomain} emoji={leafById.get(t.category)?.parent.emoji ?? ''} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.description}</p>
                    <p className={`flex min-w-0 items-center gap-1 tabular-nums ${muted}`}>
                      <select
                        aria-label={`Category of ${t.description}`}
                        value={t.category}
                        title={selectionLabel(t.category)}
                        onChange={(e) => changeCategory(t, [setOwn(t, e.target.value || null)])}
                        className="max-w-40 shrink-0 cursor-pointer truncate rounded bg-transparent hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:text-zinc-100"
                      >
                        <option value="">Автоматично</option>
                        {categories.filter((c) => c.subcategories.length).map((c) => (
                          <optgroup key={c.id} label={`${c.emoji} ${c.label}`}>
                            {c.subcategories.map((sc) => <option key={sc.id} value={sc.id}>{sc.label}</option>)}
                          </optgroup>
                        ))}
                        <optgroup label="Службові">
                          {categories.filter((c) => !c.subcategories.length).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </optgroup>
                      </select>
                      {t.categorySource === 'transaction' && (
                        <button type="button" className={linkButton} onClick={() => changeCategory(t, [setMerchant(t, t.category), setOwn(t, null)])}>
                          усім від продавця
                        </button>
                      )}
                      {t.categorySource === 'merchant' && (
                        <button type="button" className={linkButton} onClick={() => changeCategory(t, [setMerchant(t, null)])}>
                          скинути для продавця
                        </button>
                      )}
                      <span className="truncate" title={t.mccDescription ?? undefined}>· {dateTime.format(new Date(t.time))} · MCC {t.mcc}</span>
                    </p>
                  </div>
                  <span className={`shrink-0 text-sm font-semibold tabular-nums ${t.amount < 0 ? 'text-zinc-900 dark:text-zinc-100' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    {format(t.amount, account.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  )
}

export default function App() {
  const [page, setPage] = useState(location.hash || '#/')
  useEffect(() => {
    const onHash = () => setPage(location.hash || '#/')
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
      <Nav page={page} />
      {page === '#/transactions' ? <TransactionsPage /> : <Balances />}
    </main>
  )
}

function Balances() {
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
