import { useState } from 'react'
import { Combobox } from '@base-ui/react/combobox'
import { Check, ChevronDown, ChevronLeft } from 'lucide-react'
import { muted } from '../../lib/styles'
import type { Category } from '../../lib/types'

// search also holds the parent's name, so «продукти» finds every grocery subcategory
type Item = { value: string, label: string, search: string }
type Group = { id: string, emoji: string, name: string, value: string, items: Item[] }

// the leaves to pick from: each category's subcategories, then the categories without any
const groupsOf = (categories: Category[]): Group[] => [
  ...categories.filter((c) => c.subcategories.length)
    .map((c) => ({ id: c.id, emoji: c.emoji, name: c.label, value: `${c.emoji} ${c.label}`, items: c.subcategories.map((s) => ({ value: s.id, label: s.label, search: `${s.label} ${c.label}`.toLowerCase() })) })),
  { id: 'service', emoji: '⚙️', name: 'Службові', value: '⚙️ Службові', items: categories.filter((c) => !c.subcategories.length).map((c) => ({ value: c.id, label: c.label, search: c.label.toLowerCase() })) },
]
const row = 'flex w-full cursor-default items-center justify-between gap-2 px-3 py-1 text-left outline-none'

type CategoryPickerProps = {
  label: string
  value: string
  categories: Category[]
  // category: null goes back to automatic; forMerchant applies it to every transaction from the merchant
  onPick: (category: string | null, forMerchant: boolean) => void
}

// ▾ that opens the categories, one level at a time so neither level scrolls: the categories, then the
// picked one's subcategories (opening on the current category's). Typing searches every subcategory at once.
// Mounted only while open, so it costs nothing per row.
export function CategoryPicker({ label, value, categories, onPick }: CategoryPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  // the category whose subcategories are shown; undefined shows the categories
  const [parent, setParent] = useState<string>()
  const [forMerchant, setForMerchant] = useState(false)
  const groups = groupsOf(categories)
  const selected = groups.flatMap((g) => g.items).find((i) => i.value === value) ?? null
  const shown = groups.find((g) => g.id === parent)
  const pick = (category: string | null) => {
    onPick(category, forMerchant)
    setOpen(false)
  }
  return (
    <Combobox.Root
      items={groups}
      filter={(item: Item, query) => item.search.includes(query.trim().toLowerCase())}
      // searching lists every match; otherwise only the opened category's subcategories, or none under the categories
      filteredItems={query.trim() ? undefined : shown ? [shown] : []}
      autoHighlight
      value={selected}
      onValueChange={(item: Item | null) => { if (item) pick(item.value) }}
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setQuery('')
        setForMerchant(false)
        setParent(groups.find((g) => g.items.includes(selected!))?.id)
      }}
      inputValue={query}
      onInputValueChange={setQuery}
    >
      <Combobox.Trigger
        aria-label={label}
        title="Змінити категорію"
        className="cursor-pointer py-0.5 pr-2 pl-1.5 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500 data-popup-open:bg-indigo-50 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 dark:data-popup-open:bg-indigo-950/50"
      >
        <ChevronDown size={12} strokeWidth={2.5} />
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} align="start" collisionPadding={8} className="z-20">
          <Combobox.Popup className="flex max-h-[min(34rem,var(--available-height))] w-96 max-w-[calc(100vw-1rem)] flex-col rounded-lg bg-white text-sm text-zinc-800 shadow-lg ring-1 ring-zinc-200 outline-none dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-700">
            <Combobox.Input
              placeholder="Пошук категорії…"
              className="m-2 rounded-md bg-zinc-100 px-2.5 py-1.5 outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-zinc-800"
            />
            {!query.trim() && !shown && (
              <div className="min-h-0 flex-1 overflow-y-auto pb-1">
                <button type="button" onClick={() => pick(null)} className={`${row} hover:bg-indigo-50 dark:hover:bg-indigo-950/50 ${value ? '' : 'font-semibold text-indigo-700 dark:text-indigo-300'}`}>
                  Автоматично {!value && <Check size={14} />}
                </button>
                {/* tiles rather than rows, so all the categories fit without scrolling */}
                <div className="grid grid-cols-4 gap-1 px-2 pt-1">
                  {groups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setParent(g.id)}
                      className={`flex flex-col items-center gap-0.5 rounded-md px-0.5 py-1.5 text-center text-sm leading-tight hover:bg-indigo-50 dark:hover:bg-indigo-950/50 ${g.items.includes(selected!) ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300' : ''}`}
                    >
                      <span aria-hidden className="text-2xl">{g.emoji}</span>
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {query.trim() && <Combobox.Empty className={`px-3 pb-2 ${muted}`}>Нічого не знайдено</Combobox.Empty>}
            <Combobox.List className="min-h-0 flex-1 overflow-y-auto pb-1 empty:hidden">
              {(group: Group) => (
                <Combobox.Group key={group.id} items={group.items}>
                  {query.trim()
                    ? <Combobox.GroupLabel className={`px-3 pt-2 pb-0.5 text-xs ${muted}`}>{group.value}</Combobox.GroupLabel>
                    : (
                      <Combobox.GroupLabel
                        render={<button type="button" onClick={() => setParent(undefined)} />}
                        className={`${row} mb-0.5 border-b border-zinc-100 pb-1.5 font-medium hover:bg-indigo-50 dark:border-zinc-800 dark:hover:bg-indigo-950/50`}
                      >
                        <span className="flex min-w-0 items-center gap-1"><ChevronLeft size={14} className="shrink-0 text-zinc-400" /><span className="truncate">{group.value}</span></span>
                      </Combobox.GroupLabel>
                    )}
                  <Combobox.Collection>
                    {(item: Item) => (
                      <Combobox.Item
                        key={item.value}
                        value={item}
                        className={`${row} data-highlighted:bg-indigo-50 data-selected:font-semibold data-selected:text-indigo-700 dark:data-highlighted:bg-indigo-950/50 dark:data-selected:text-indigo-300`}
                      >
                        {item.label}
                        <Combobox.ItemIndicator><Check size={14} /></Combobox.ItemIndicator>
                      </Combobox.Item>
                    )}
                  </Combobox.Collection>
                </Combobox.Group>
              )}
            </Combobox.List>
            <label className="flex cursor-pointer items-center gap-2 border-t border-zinc-200 px-3 py-2 text-xs dark:border-zinc-700">
              <input type="checkbox" checked={forMerchant} onChange={(e) => setForMerchant(e.target.checked)} className="size-3.5 accent-indigo-600" />
              Для всіх транзакцій цього продавця
            </label>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
