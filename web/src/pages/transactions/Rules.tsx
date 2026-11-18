import { useState } from 'react'
import { CategoryPicker } from './CategoryPicker'
import { ErrorBanner } from '../../components/ErrorBanner'
import { Skeleton } from '../../components/Skeleton'
import { api, useApi } from '../../lib/api'
import { format } from '../../lib/format'
import { card, linkButton, muted } from '../../lib/styles'
import type { Category, CategoryRules } from '../../lib/types'

const date = new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium' })

// The categories and essential flags you set by hand: for every transaction of a merchant, and for single
// transactions. Everything else is sorted automatically from the MCC and description.
export function Rules() {
  const rulesQuery = useApi<CategoryRules>('/categories/rules')
  const categoriesQuery = useApi<Category[]>('/categories')
  const [saveError, setError] = useState('')
  const error = saveError || (rulesQuery.error ?? categoriesQuery.error)?.message || ''
  const categories = categoriesQuery.data ?? []
  const label = (id: string | null) => {
    if (id === null) return 'автоматично'
    for (const c of categories) {
      if (c.id === id) return `${c.emoji} ${c.label}`
      const sub = c.subcategories.find((s) => s.id === id)
      if (sub) return `${c.emoji} ${c.label} › ${sub.label}`
    }
    return id
  }

  // each write refetches the rules and the transactions (see api)
  async function save(what: string, steps: Array<{ path: string; method: 'PUT' | 'PATCH'; body: object }>) {
    try {
      for (const { path, method, body } of steps) await api(path, { method, body: JSON.stringify(body) })
      setError('')
    } catch (err) {
      setError(`${what}: ${(err as Error).message}`)
    }
  }
  const merchantCategory = (description: string, category: string | null) => ({
    path: '/categories/merchants',
    method: 'PUT' as const,
    body: { description, category },
  })
  const merchantEssential = (description: string, essential: boolean | null) => ({
    path: '/categories/merchants/essential',
    method: 'PUT' as const,
    body: { description, essential },
  })
  const ownCategory = (id: number, category: string | null) => ({
    path: `/categories/transactions/${id}`,
    method: 'PUT' as const,
    body: { category },
  })
  const ownEssential = (id: number, essential: boolean | null) => ({
    path: `/transactions/${id}`,
    method: 'PATCH' as const,
    body: { essential },
  })

  const essentialSelect = (value: boolean | null, name: string, onChange: (v: boolean | null) => void) => (
    <select
      aria-label={`Essential: ${name}`}
      value={value === null ? '' : String(value)}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value === 'true')}
      className={`field-sizing-content max-w-44 cursor-pointer rounded bg-transparent focus-visible:outline-2 focus-visible:outline-indigo-500 ${value ? 'text-emerald-700 dark:text-emerald-400' : ''}`}
    >
      <option value="">○/● як у категорії</option>
      <option value="true">● необхідне</option>
      <option value="false">○ необов’язкове</option>
    </select>
  )
  const chip =
    'inline-flex min-w-0 max-w-72 items-stretch divide-x divide-zinc-200 overflow-hidden rounded-full bg-zinc-100 text-xs text-zinc-700 dark:divide-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'

  const rules = rulesQuery.data
  return (
    <>
      <ErrorBanner>{error}</ErrorBanner>
      <section className={card}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Category rules</h1>
          <a href="#/transactions" className={`text-sm ${linkButton}`}>
            ← Transactions
          </a>
        </div>
        <p className={`mt-1 ${muted}`}>
          Categories and essential flags you set by hand. A transaction’s own choice wins over its merchant’s, and the
          merchant’s over the automatic one from the MCC.
        </p>
      </section>

      {!rules || !categoriesQuery.data ? (
        <section className={card}>
          <Skeleton />
        </section>
      ) : (
        <>
          <section className={card}>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Merchants <span className={muted}>· {rules.merchants.length}</span>
            </h2>
            {rules.merchants.length === 0 ? (
              <p className={`py-4 ${muted}`}>
                None yet. Pick a category on a transaction with «Для всіх транзакцій цього продавця».
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
                {rules.merchants.map((m) => (
                  <li key={m.merchant} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{m.description}</p>
                      <p className={muted}>
                        {m.transactionCount} {m.transactionCount === 1 ? 'transaction' : 'transactions'}
                      </p>
                    </div>
                    <span className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${muted}`}>
                      <span className={chip}>
                        <span className="truncate py-0.5 pr-2 pl-2.5">{label(m.category)}</span>
                        <CategoryPicker
                          label={`Category of ${m.description}: ${label(m.category)}`}
                          value={m.category ?? ''}
                          categories={categories}
                          merchantOnly
                          onPick={(category) => save('Category', [merchantCategory(m.description, category)])}
                        />
                      </span>
                      {essentialSelect(m.essential, m.description, (essential) =>
                        save('Essential', [merchantEssential(m.description, essential)]),
                      )}
                      <button
                        type="button"
                        className={linkButton}
                        onClick={() =>
                          save('Reset', [
                            ...(m.category !== null ? [merchantCategory(m.description, null)] : []),
                            ...(m.essential !== null ? [merchantEssential(m.description, null)] : []),
                          ])
                        }
                      >
                        скинути
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={card}>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Single transactions <span className={muted}>· {rules.transactions.length}</span>
            </h2>
            {rules.transactions.length === 0 ? (
              <p className={`py-4 ${muted}`}>None. Every hand-picked category applies to a whole merchant.</p>
            ) : (
              <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
                {rules.transactions.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.description}</p>
                      <p className={`tabular-nums ${muted}`}>
                        {date.format(new Date(t.time))} · {format(t.amount, t.currency)}
                      </p>
                    </div>
                    <span className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${muted}`}>
                      <span className={chip}>
                        <span className="truncate py-0.5 pr-2 pl-2.5">
                          {t.category === null ? 'як у продавця' : label(t.category)}
                        </span>
                        <CategoryPicker
                          label={`Category of ${t.description}: ${label(t.category)}`}
                          value={t.category ?? ''}
                          categories={categories}
                          onPick={(category, forMerchant) =>
                            save(
                              'Category',
                              forMerchant
                                ? [merchantCategory(t.description, category), ownCategory(t.id, null)]
                                : [ownCategory(t.id, category)],
                            )
                          }
                        />
                      </span>
                      {essentialSelect(t.essential, t.description, (essential) =>
                        save('Essential', [ownEssential(t.id, essential)]),
                      )}
                      {t.category !== null && (
                        <button
                          type="button"
                          className={linkButton}
                          onClick={() =>
                            save('Category', [merchantCategory(t.description, t.category), ownCategory(t.id, null)])
                          }
                        >
                          усім від продавця
                        </button>
                      )}
                      <button
                        type="button"
                        className={linkButton}
                        onClick={() =>
                          save('Reset', [
                            ...(t.category !== null ? [ownCategory(t.id, null)] : []),
                            ...(t.essential !== null ? [ownEssential(t.id, null)] : []),
                          ])
                        }
                      >
                        скинути
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  )
}
