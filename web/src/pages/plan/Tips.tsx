import { useState, type ReactNode } from 'react'
import { CircleCheck, Info, Lightbulb, X } from 'lucide-react'
import { useFinance } from '../../lib/finance'
import { wholeMoney } from '../../lib/format'
import { annualRate } from '../../lib/inflation'
import { recurring } from '../../lib/recurring'
import { card, linkButton, muted } from '../../lib/styles'
import { tipsFor, type Tip } from '../../lib/tips'
import type { Currency } from '../../lib/types'

// at most this many at once, so the card stays calm
const SHOWN = 3
const DISMISSED_KEY = 'dismissedTips'

function readDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]')
  } catch {
    return []
  }
}

const tones: Record<Tip['tone'], { icon: ReactNode; tint: string }> = {
  watch: {
    icon: <Lightbulb size={16} />,
    tint: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  },
  info: { icon: <Info size={16} />, tint: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400' },
  good: {
    icon: <CircleCheck size={16} />,
    tint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  },
}

// General tips from your own numbers (see lib/tips): the plan's fund, savings rate and hryvnia savings, and
// recurring payments that got more expensive. Each can be dismissed; dismissed ones stay hidden in this browser.
export function Tips({ currency }: { currency: Currency }) {
  const finance = useFinance({ withTransactions: true, withInflation: true })
  const [dismissed, setDismissed] = useState(readDismissed)
  const [now] = useState(() => new Date())
  function save(next: string[]) {
    setDismissed(next)
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next))
    } catch {
      // private mode: dismissed until reload
    }
  }

  const { budget, accounts, categories, transactions, convert } = finance
  const available = finance.availableIn(currency)
  const spending = finance.spendIn(currency)
  const essential = finance.minimalIn(currency)
  const kept = finance.keptIncomeIn(currency)
  if (!budget || available === undefined || spending === undefined) return null

  // months savings last without a job; Infinity when continuing income covers the spending
  const monthsOf = (monthly: number) => (monthly - kept <= 0 ? Infinity : Math.max(0, available) / (monthly - kept))
  const payments =
    transactions && categories.length ? recurring(transactions, accounts, categories, convert, currency, now) : []
  const hryvnia = accounts
    .filter((a) => a.currency === 'UAH' && a.balance > 0)
    .reduce((sum, a) => sum + (convert(a.balance, 'UAH', currency) ?? 0), 0)

  const tips = tipsFor({
    fundMonths: budget.targetMonths ? monthsOf(spending) : undefined,
    essentialMonths: essential !== undefined ? monthsOf(essential) : undefined,
    targetMonths: budget.targetMonths ?? 6,
    income: finance.incomeIn(currency) ?? 0,
    spending,
    hryvniaSavings: hryvnia,
    inflation: finance.inflation ? annualRate(finance.inflation) : undefined,
    priceRises: (payments ?? []).map((p) => ({
      merchant: p.latest.merchant,
      name: p.latest.description,
      latest: p.amount,
      usual: p.usual,
    })),
    money: (amount) => wholeMoney(amount, currency),
  })
  const shown = tips.filter((t) => !dismissed.includes(t.id)).slice(0, SHOWN)
  const hidden = tips.filter((t) => dismissed.includes(t.id)).length
  if (shown.length === 0 && hidden === 0) return null

  return (
    <section className={card}>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Tips</h2>
      {shown.length > 0 ? (
        <ul className="mt-3 grid gap-3">
          {shown.map((t) => (
            <li
              key={t.id}
              className="flex gap-3 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200 dark:bg-zinc-800/40 dark:ring-zinc-800"
            >
              <span aria-hidden className={`grid size-8 shrink-0 place-items-center rounded-lg ${tones[t.tone].tint}`}>
                {tones[t.tone].icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.title}</p>
                <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                  {t.text}
                  {t.href && (
                    <>
                      {' '}
                      <a href={t.href} className={linkButton}>
                        See it →
                      </a>
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => save([...dismissed, t.id])}
                aria-label={`Dismiss: ${t.title}`}
                className="grid size-7 shrink-0 place-items-center rounded-md text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={`mt-2 ${muted}`}>Nothing new.</p>
      )}
      <p className={`mt-3 flex flex-wrap gap-x-3 text-xs ${muted}`}>
        <span>General guidelines applied to your own numbers, not personal financial advice.</span>
        {hidden > 0 && (
          <button type="button" onClick={() => save([])} className={linkButton}>
            Show {hidden} dismissed
          </button>
        )}
      </p>
    </section>
  )
}
