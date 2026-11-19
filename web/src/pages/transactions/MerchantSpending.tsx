import { useState } from 'react'
import { MerchantIcon } from '../../components/MerchantIcon'
import { format, percentOf } from '../../lib/format'
import { card, linkButton, muted } from '../../lib/styles'
import { Change } from './Change'
import type { Currency, Leaf, Transaction } from '../../lib/types'

const TOP = 10

type MerchantSpendingProps = {
  list: Transaction[]
  currency: Currency
  leafById: Map<string, Leaf>
  selected?: string
  onSelect: (merchant?: string) => void
  // the period before, to show how spending changed; none for all time
  previous?: { list: Transaction[]; label: string }
}

// spending per merchant key, net of refunds, with its purchase count and latest purchase
function byMerchant(list: Transaction[], leafById: Map<string, Leaf>) {
  const merchants = new Map<string, { total: number; count: number; latest?: Transaction }>()
  // list is newest first, so the first purchase seen is the latest
  for (const t of list) {
    if (!leafById.get(t.category)?.parent.spending) continue
    const m = merchants.get(t.merchant) ?? { total: 0, count: 0 }
    m.total -= t.amount
    m.count += 1
    if (!m.latest && t.amount < 0) m.latest = t
    merchants.set(t.merchant, m)
  }
  return merchants
}

// Spending per merchant, net of refunds, same exclusions as the category summary.
// A merchant is shown under its latest purchase's description, icon and category emoji. With `previous`, the
// header and each row say how much that changed from the period before.
export function MerchantSpending({ list, currency, leafById, selected, onSelect, previous }: MerchantSpendingProps) {
  const [showAll, setShowAll] = useState(false)
  const merchants = byMerchant(list, leafById)
  const rows = [...merchants].filter(([, m]) => m.total > 0 && m.latest).sort((a, b) => b[1].total - a[1].total)
  if (rows.length === 0) return null
  const total = rows.reduce((sum, [, m]) => sum + m.total, 0)
  const before = previous && byMerchant(previous.list, leafById)
  const totalBefore = before && [...before.values()].filter((m) => m.total > 0).reduce((sum, m) => sum + m.total, 0)
  // keep the selected merchant visible even when it is outside the top
  const visible = showAll ? rows : rows.filter(([key], i) => i < TOP || key === selected)

  return (
    <section className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Spending by merchant</h2>
        <span className={`tabular-nums ${muted}`}>
          {rows.length} · {format(total, currency)}
          {previous && totalBefore !== undefined && (
            <>
              {' · '}
              <Change now={total} before={totalBefore} className="font-medium" /> vs {previous.label}
              {totalBefore > 0 &&
                ` (${total >= totalBefore ? '+' : '−'}${format(Math.abs(total - totalBefore), currency)})`}
            </>
          )}
        </span>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {visible.map(([key, m]) => (
          <li key={key}>
            <button
              type="button"
              aria-pressed={selected === key}
              onClick={() => onSelect(selected === key ? undefined : key)}
              className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-1 text-left hover:bg-zinc-50 aria-pressed:bg-indigo-50 aria-pressed:ring-1 aria-pressed:ring-indigo-200 dark:hover:bg-zinc-800/50 dark:aria-pressed:bg-indigo-950/40 dark:aria-pressed:ring-indigo-900"
            >
              <MerchantIcon
                domain={m.latest!.merchantDomain}
                emoji={leafById.get(m.latest!.category)?.parent.emoji ?? ''}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-zinc-900 dark:text-zinc-100">
                    {m.latest!.description}
                    <span className={`ml-1.5 ${muted}`}>× {m.count}</span>
                  </span>
                  <span className="shrink-0 font-medium text-zinc-900 tabular-nums dark:text-zinc-100">
                    {format(m.total, currency)}
                    <span className={`ml-2 inline-block w-12 text-right ${muted}`}>{percentOf(m.total / total)}%</span>
                    {before && (
                      <Change
                        now={m.total}
                        before={before.get(key)?.total ?? 0}
                        className="ml-1 inline-block w-12 text-right text-xs"
                      />
                    )}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${(m.total / rows[0][1].total) * 100}%` }}
                  />
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
      {rows.length > TOP && (
        <button type="button" className={`mt-3 text-sm ${linkButton}`} onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Показати топ-10' : `Показати всіх (${rows.length})`}
        </button>
      )}
    </section>
  )
}
