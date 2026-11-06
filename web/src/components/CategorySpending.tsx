import { format, percentOf } from '../lib/format'
import { card, muted } from '../lib/styles'
import type { Currency, Transaction, Leaf } from '../lib/types'

type CategorySpendingProps = {
  list: Transaction[]
  currency: Currency
  leafById: Map<string, Leaf>
  selected?: string
  onSelect: (category?: string) => void
}

// Totals per category, and per subcategory for the one that is open. Categories marked not spending
// (income, own-account moves) stay out; refunds (positive amounts) reduce their category.
export function CategorySpending({ list, currency, leafById, selected, onSelect }: CategorySpendingProps) {
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
