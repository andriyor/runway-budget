import { useState, type FormEvent, type ReactNode } from 'react'
import { ErrorText } from '../../components/ErrorText'
import { MoneyInput } from '../../components/MoneyInput'
import { Briefcase, Calendar, Lock, Pencil, ShoppingBag, Trash2, TrendingDown } from 'lucide-react'
import { api } from '../../lib/api'
import { dateIn, format } from '../../lib/format'
import { monthsLasting } from '../../lib/inflation'
import { card, muted, inputBox, button, linkButton } from '../../lib/styles'
import { type Currency, type Budget } from '../../lib/types'

type EstimateProps = {
  label: string
  total: number
  spend: number
  // incomes that keep coming in this scenario
  income: number
  // yearly inflation, e.g. 0.11; undefined while unknown
  inflation: number | undefined
  currency: Currency
}

// How long `total` lasts at `spend` minus `income` per month, and, with inflation known, how long when
// spending grows with it while incomes stay flat.
function Estimate({ label, total, spend, income, inflation, currency }: EstimateProps) {
  const [now] = useState(Date.now)
  const burn = spend - income
  const date = (months: number) => dateIn(months, now)
  const inflated = inflation !== undefined && inflation > 0 ? monthsLasting(total, spend, income, inflation) : undefined
  const withInflation = inflated !== undefined && (
    <p className={`mt-1 text-sm tabular-nums ${muted}`}>
      With {(inflation! * 100).toFixed(1)}% inflation:{' '}
      {inflated === Infinity ? (
        'still no end'
      ) : (
        <span className={burn <= 0 ? 'text-amber-700 dark:text-amber-400' : undefined}>
          {inflated.toFixed(1)} months · until {date(inflated)}
        </span>
      )}
    </p>
  )
  if (burn <= 0) {
    return (
      <div className="rounded-xl bg-emerald-50 p-3 sm:p-4 dark:bg-emerald-950/40">
        <p className={muted}>{label}</p>
        <p className="mt-1 text-xl font-semibold text-emerald-700 sm:text-2xl dark:text-emerald-400">No end</p>
        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
          +{format(-burn, currency)} saved per month
        </p>
        {withInflation}
      </div>
    )
  }
  const months = Math.max(0, total / burn)
  return (
    <div className="rounded-xl bg-zinc-50 p-3 sm:p-4 dark:bg-zinc-800/50">
      <p className={muted}>{label}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-900 tabular-nums sm:text-2xl dark:text-zinc-100">
        {months.toFixed(1)} <span className="text-base font-normal text-zinc-500">months</span>
        {months >= 12 && (
          <span className="text-base font-normal text-zinc-500"> · ≈ {(months / 12).toFixed(1)} years</span>
        )}
      </p>
      <p className="mt-1 text-sm tabular-nums">
        <span className="text-zinc-500 dark:text-zinc-400">until {date(months)} · </span>
        <span className="text-rose-600 dark:text-rose-400">−{format(burn, currency)} per month</span>
      </p>
      {withInflation}
    </div>
  )
}

type SpendLimitProps = {
  months: number
  total: number
  kept: number
  spend: number
  minimal: number | undefined
  currency: Currency
}

// the most you can spend per month to make savings plus the incomes that keep coming (`kept`) last `months`
function SpendLimit({ months, total, kept, spend, minimal, currency }: SpendLimitProps) {
  const limit = Math.max(0, total) / months + kept
  const diff = limit - spend
  return (
    <div className="rounded-xl bg-violet-50 p-3 sm:p-4 dark:bg-violet-950/40">
      <p className={muted}>To last {months} months without income</p>
      <p className="mt-1 text-xl font-semibold text-zinc-900 tabular-nums sm:text-2xl dark:text-zinc-100">
        {format(limit, currency)} <span className="text-base font-normal text-zinc-500">per month at most</span>
      </p>
      <p
        className={`mt-1 text-sm tabular-nums ${diff >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
      >
        {diff >= 0
          ? `${format(diff, currency)} more than you spend now`
          : `cut ${format(-diff, currency)} from your usual spending`}
      </p>
      {minimal !== undefined && limit < minimal && (
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
          Below your essential spending, likely not realistic.
        </p>
      )}
    </div>
  )
}

// the saved settings, read-only: what the estimates beside them are based on
function Settings({ budget: b }: { budget: Budget }) {
  const unset = <span className="text-zinc-400">Not set</span>
  const rows: { icon: ReactNode; label: string; value: ReactNode }[] = [
    {
      icon: (
        <span className="text-rose-500">
          <ShoppingBag />
        </span>
      ),
      label: 'I spend per month',
      value: format(b.monthlySpend, b.currency),
    },
    {
      icon: (
        <span className="text-sky-600">
          <TrendingDown />
        </span>
      ),
      label: 'Essential spending',
      value: b.minimalSpend !== null && b.minimalSpendCurrency ? format(b.minimalSpend, b.minimalSpendCurrency) : unset,
    },
    {
      icon: (
        <span className="text-emerald-600">
          <Briefcase />
        </span>
      ),
      label: 'Income per month',
      value:
        b.incomes.length === 0 ? (
          unset
        ) : (
          <span className="flex flex-col items-end gap-1">
            {b.incomes.map((i, n) => (
              <span key={n} className="flex flex-col items-end">
                <span>
                  <span className="text-zinc-500 dark:text-zinc-400">{i.name} </span>
                  {format(i.amount, i.currency)}
                </span>
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                  {i.keeps ? 'continues without a job' : 'stops if I lose my job'}
                </span>
              </span>
            ))}
          </span>
        ),
    },
    {
      icon: (
        <span className="text-amber-500">
          <Lock />
        </span>
      ),
      label: 'Untouchable reserve',
      value: b.reserve !== null && b.reserveCurrency ? format(b.reserve, b.reserveCurrency) : unset,
    },
    {
      icon: (
        <span className="text-violet-600">
          <Calendar />
        </span>
      ),
      label: 'Emergency fund',
      value: b.targetMonths !== null ? `${b.targetMonths} months of spending` : unset,
    },
  ]
  return (
    <dl className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
      {rows.map(({ icon, label, value }) => (
        <div key={label} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0">
          <dt className="flex shrink-0 items-center gap-1.5 self-start text-sm text-zinc-700 dark:text-zinc-300">
            {icon} {label}
          </dt>
          <dd className="text-right text-sm font-medium text-zinc-900 tabular-nums dark:text-zinc-100">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

const amountString = (n: number | null) => (n === null ? '' : String(n))

// amounts as typed in the inputs; '' means not set
type IncomeRow = { name: string; amount: string; currency: Currency; keeps: boolean }
type BudgetForm = {
  spend: string
  currency: Currency
  incomes: IncomeRow[]
  reserve: string
  reserveCurrency: Currency
  minimal: string
  minimalCurrency: Currency
  months: string
}

const toForm = (b: Budget | null, fallback: Currency = 'UAH'): BudgetForm => ({
  spend: b ? String(b.monthlySpend) : '',
  currency: b?.currency ?? fallback,
  incomes: (b?.incomes ?? []).map((i) => ({
    name: i.name,
    amount: String(i.amount),
    currency: i.currency,
    keeps: i.keeps,
  })),
  reserve: amountString(b?.reserve ?? null),
  reserveCurrency: b?.reserveCurrency ?? fallback,
  minimal: amountString(b?.minimalSpend ?? null),
  minimalCurrency: b?.minimalSpendCurrency ?? fallback,
  months: amountString(b?.targetMonths ?? null),
})

// request body for PUT /budget; empty optional amount omits (clears) its pair, an income without an amount is dropped
function budgetBody(f: BudgetForm) {
  return {
    monthlySpend: Number(f.spend),
    currency: f.currency,
    incomes: f.incomes
      .filter((i) => i.amount !== '')
      .map((i) => ({
        name: i.name.trim() || 'Income',
        amount: Number(i.amount),
        currency: i.currency,
        keeps: i.keeps,
      })),
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
  // all incomes together
  incomeIn: (c: Currency) => number | undefined
  // the incomes that keep coming without the others
  keptIncomeIn: (c: Currency) => number
  minimalIn: (c: Currency) => number | undefined
  // usual monthly spending converted; undefined while rates load
  spendIn: (c: Currency) => number | undefined
  // what each sellable thing owned brings in a quick sale, in `currency`
  sales: Array<{ name: string; amount: number }>
  // yearly inflation, e.g. 0.11; undefined while unknown
  inflation: number | undefined
  // the currency the estimates are shown in; the settings keep their own
  currency: Currency
}

export function Runway({
  saved,
  onSaved,
  availableIn,
  reserveIn,
  incomeIn,
  keptIncomeIn,
  minimalIn,
  spendIn,
  sales,
  inflation,
  currency: c,
}: RunwayProps) {
  const [form, setForm] = useState(() => toForm(saved))
  // the settings show as a summary once saved; Plan re-keys this on the saved budget, so a save returns to it
  const [editing, setEditing] = useState(!saved)
  const [error, setError] = useState('')
  const field =
    <K extends keyof BudgetForm>(key: K) =>
    (value: BudgetForm[K]) =>
      setForm((f) => ({ ...f, [key]: value }))
  const incomeField =
    <K extends keyof IncomeRow>(index: number, key: K) =>
    (value: IncomeRow[K]) =>
      setForm((f) => ({ ...f, incomes: f.incomes.map((i, n) => (n === index ? { ...i, [key]: value } : i)) }))
  const addIncome = () =>
    setForm((f) => ({ ...f, incomes: [...f.incomes, { name: '', amount: '', currency: f.currency, keeps: false }] }))
  const removeIncome = (index: number) => setForm((f) => ({ ...f, incomes: f.incomes.filter((_, n) => n !== index) }))

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
  const dirty =
    !saved ||
    JSON.stringify(body) !==
      JSON.stringify(
        budgetBody({
          ...toForm(saved),
          reserveCurrency: saved.reserveCurrency ?? form.reserveCurrency,
          minimalCurrency: saved.minimalSpendCurrency ?? form.minimalCurrency,
        }),
      )

  const available = saved ? availableIn(c) : undefined
  const reserved = saved ? reserveIn(c) : 0
  const incomeInSpendCurrency = saved ? incomeIn(c) : undefined
  const kept = saved ? keptIncomeIn(c) : 0
  const minimalInSpendCurrency = saved ? minimalIn(c) : undefined
  const spend = spendIn(c)

  const fieldLabel = 'flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300'
  const optional = <span className="font-normal text-zinc-400">· optional</span>
  const heading = (
    <div>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Runway</h2>
      <p className={muted}>How long your savings last.</p>
    </div>
  )

  return (
    <section className={`${card} grid gap-4 sm:gap-6 md:grid-cols-2`}>
      {!editing && saved ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            {heading}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={`flex items-center gap-1.5 text-sm ${linkButton}`}
            >
              <Pencil /> Edit
            </button>
          </div>
          <Settings budget={saved} />
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={save}>
          {heading}
          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>
              <span className="text-rose-500">
                <ShoppingBag />
              </span>{' '}
              I spend per month
            </span>
            <MoneyInput
              id="spend"
              label="Monthly spend"
              required
              min="0.01"
              value={form.spend}
              onChange={field('spend')}
              currency={form.currency}
              onCurrency={field('currency')}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>
              <span className="text-sky-600">
                <TrendingDown />
              </span>{' '}
              Essential spending per month {optional}
            </span>
            <MoneyInput
              id="minimal"
              label="Essential spending per month"
              min="0.01"
              placeholder="rent, food, medicine: less than usual"
              value={form.minimal}
              onChange={field('minimal')}
              currency={form.minimalCurrency}
              onCurrency={field('minimalCurrency')}
            />
          </label>
          <fieldset className="flex flex-col gap-1.5">
            <legend className={`${fieldLabel} mb-1.5`}>
              <span className="text-emerald-600">
                <Briefcase />
              </span>{' '}
              My income per month {optional}
            </legend>
            {form.incomes.map((income, index) => (
              <div key={index} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <input
                    placeholder="Salary"
                    maxLength={100}
                    value={income.name}
                    onChange={(e) => incomeField(index, 'name')(e.target.value)}
                    aria-label={`Income ${index + 1} name`}
                    className={`w-28 min-w-0 px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 ${inputBox}`}
                  />
                  <div className="min-w-0 flex-1">
                    <MoneyInput
                      label={`Income ${index + 1} per month`}
                      min="0.01"
                      placeholder="per month"
                      value={income.amount}
                      onChange={incomeField(index, 'amount')}
                      currency={income.currency}
                      onCurrency={incomeField(index, 'currency')}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeIncome(index)}
                    aria-label={`Remove income ${income.name || index + 1}`}
                    className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600 dark:hover:bg-zinc-800"
                  >
                    <Trash2 />
                  </button>
                </div>
                {/* decides the emergency fund: only an income that continues lowers what savings must hold */}
                <select
                  value={income.keeps ? 'continues' : 'stops'}
                  onChange={(e) => incomeField(index, 'keeps')(e.target.value === 'continues')}
                  aria-label={`${income.name || `Income ${index + 1}`} if I lose my job`}
                  className={`self-start px-2 py-1 text-sm text-zinc-700 outline-none dark:text-zinc-300 ${inputBox}`}
                >
                  <option value="stops">Stops if I lose my job</option>
                  <option value="continues">Continues without a job</option>
                </select>
              </div>
            ))}
            <button type="button" className={`self-start text-sm ${linkButton}`} onClick={addIncome}>
              + Add income
            </button>
          </fieldset>
          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>
              <span className="text-amber-500">
                <Lock />
              </span>{' '}
              Untouchable reserve {optional}
            </span>
            <MoneyInput
              id="reserve"
              label="Untouchable reserve"
              min="0"
              placeholder="never spent, excluded from runway"
              value={form.reserve}
              onChange={field('reserve')}
              currency={form.reserveCurrency}
              onCurrency={field('reserveCurrency')}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>
              <span className="text-violet-600">
                <Calendar />
              </span>{' '}
              Emergency fund: months of spending to keep {optional}
            </span>
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
            <div className="flex items-center gap-2">
              <button className={button} disabled={!dirty}>
                Save
              </button>
              {saved && (
                <button
                  type="button"
                  onClick={() => {
                    setForm(toForm(saved))
                    setError('')
                    setEditing(false)
                  }}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
              )}
            </div>
            <ErrorText>{error}</ErrorText>
          </div>
        </form>
      )}
      <div className="flex flex-col justify-center gap-3">
        {saved && available !== undefined && spend !== undefined ? (
          <>
            {reserved > 0 && (
              <p className={`flex flex-wrap items-center gap-x-2 tabular-nums ${muted}`}>
                <Lock />
                <span>{format(reserved, c)} untouchable</span>
                <span>·</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {format(Math.max(0, available), c)} available
                </span>
              </p>
            )}
            <Estimate
              label="Without income"
              total={available}
              spend={spend}
              income={kept}
              inflation={inflation}
              currency={c}
            />
            {/* a last resort, never in the estimates: how much longer the money lasts after selling */}
            {spend - kept > 0 && sales.length > 0 && (
              <ul className={`flex flex-col gap-0.5 tabular-nums ${muted}`}>
                {sales.map((s, n) => (
                  <li key={n}>
                    Selling {s.name} (≈ {format(s.amount, c)}):{' '}
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      +{(s.amount / (spend - kept)).toFixed(1)} months
                    </span>
                  </li>
                ))}
                {sales.length > 1 &&
                  (() => {
                    const all = sales.reduce((sum, s) => sum + s.amount, 0)
                    return (
                      <li className="mt-0.5 border-t border-zinc-200 pt-1 dark:border-zinc-800">
                        Selling everything (≈ {format(all, c)}):{' '}
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          +{(all / (spend - kept)).toFixed(1)} months
                        </span>
                      </li>
                    )
                  })()}
              </ul>
            )}
            {minimalInSpendCurrency !== undefined && (
              <>
                <Estimate
                  label="Essentials only, without income"
                  total={available}
                  spend={minimalInSpendCurrency}
                  income={kept}
                  inflation={inflation}
                  currency={c}
                />
                {minimalInSpendCurrency >= spend && (
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Essential spending is not below your usual spending.
                  </p>
                )}
              </>
            )}
            {saved.targetMonths !== null && (
              <SpendLimit
                months={saved.targetMonths}
                total={available}
                kept={kept}
                spend={spend}
                minimal={minimalInSpendCurrency}
                currency={c}
              />
            )}
            {incomeInSpendCurrency !== undefined && (
              <Estimate
                label="With income"
                total={available}
                spend={spend}
                income={incomeInSpendCurrency}
                inflation={inflation}
                currency={c}
              />
            )}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-center dark:border-zinc-700">
            <p className={muted}>Set your monthly spending to see how long your savings last.</p>
          </div>
        )}
      </div>
    </section>
  )
}
