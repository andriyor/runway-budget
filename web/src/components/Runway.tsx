import { useState, type FormEvent } from 'react'
import { ErrorText, MoneyInput } from './controls'
import { LockIcon, BagIcon, BriefcaseIcon, CalendarIcon, TrendDownIcon } from './icons'
import { api } from '../lib/api'
import { format } from '../lib/format'
import { card, muted, inputBox, button } from '../lib/styles'
import { type Currency, type Budget } from '../lib/types'

export const AVG_DAYS_IN_MONTH = 30.44

function Estimate({ label, total, burn, currency }: { label: string, total: number, burn: number, currency: Currency }) {
  const [now] = useState(Date.now)
  if (burn <= 0) {
    return (
      <div className="rounded-xl bg-emerald-50 p-3 sm:p-4 dark:bg-emerald-950/40">
        <p className={muted}>{label}</p>
        <p className="mt-1 text-xl font-semibold text-emerald-700 sm:text-2xl dark:text-emerald-400">No end</p>
        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">+{format(-burn, currency)} saved per month</p>
      </div>
    )
  }
  const months = Math.max(0, total / burn)
  const until = new Date(now + months * AVG_DAYS_IN_MONTH * 864e5)
  return (
    <div className="rounded-xl bg-zinc-50 p-3 sm:p-4 dark:bg-zinc-800/50">
      <p className={muted}>{label}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-900 tabular-nums sm:text-2xl dark:text-zinc-100">
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
    <div className="rounded-xl bg-violet-50 p-3 sm:p-4 dark:bg-violet-950/40">
      <p className={muted}>To last {months} months without salary</p>
      <p className="mt-1 text-xl font-semibold text-zinc-900 tabular-nums sm:text-2xl dark:text-zinc-100">
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

export function Runway({ saved, onSaved, availableIn, reserveIn, salaryIn, minimalIn }: RunwayProps) {
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
    <section className={`${card} grid gap-4 sm:gap-6 md:grid-cols-2`}>
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
