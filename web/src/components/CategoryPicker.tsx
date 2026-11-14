import { useState } from 'react'
import { Combobox } from '@base-ui/react/combobox'
import { Check, ChevronDown } from 'lucide-react'
import { muted } from '../lib/styles'
import type { Category } from '../lib/types'

// search also holds the parent's name, so «продукти» finds every grocery subcategory
type Item = { value: string, label: string, search: string }
type Group = { value: string, items: Item[] }

// the leaves to pick from: automatic first, each category's subcategories, then the categories without any
const groupsOf = (categories: Category[]): Group[] => [
  { value: '', items: [{ value: '', label: 'Автоматично', search: 'автоматично' }] },
  ...categories.filter((c) => c.subcategories.length)
    .map((c) => ({ value: `${c.emoji} ${c.label}`, items: c.subcategories.map((s) => ({ value: s.id, label: s.label, search: `${s.label} ${c.label}`.toLowerCase() })) })),
  { value: 'Службові', items: categories.filter((c) => !c.subcategories.length).map((c) => ({ value: c.id, label: c.label, search: c.label.toLowerCase() })) },
]

type CategoryPickerProps = {
  label: string
  value: string
  categories: Category[]
  // category: null goes back to automatic; forMerchant applies it to every transaction from the merchant
  onPick: (category: string | null, forMerchant: boolean) => void
}

// ▾ that opens a searchable list of categories; mounted only while open, so a long list costs nothing per row
export function CategoryPicker({ label, value, categories, onPick }: CategoryPickerProps) {
  const [forMerchant, setForMerchant] = useState(false)
  const groups = groupsOf(categories)
  const selected = groups.flatMap((g) => g.items).find((i) => i.value === value) ?? null
  return (
    <Combobox.Root
      items={groups}
      filter={(item: Item, query) => item.search.includes(query.trim().toLowerCase())}
      autoHighlight
      value={selected}
      onValueChange={(item: Item | null) => { if (item) onPick(item.value || null, forMerchant) }}
      onOpenChange={(open) => { if (!open) setForMerchant(false) }}
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
          <Combobox.Popup className="flex max-h-[min(26rem,var(--available-height))] w-64 flex-col rounded-lg bg-white text-sm text-zinc-800 shadow-lg ring-1 ring-zinc-200 outline-none dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-700">
            <Combobox.Input
              placeholder="Пошук категорії…"
              className="m-2 rounded-md bg-zinc-100 px-2.5 py-1.5 outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-zinc-800"
            />
            <Combobox.Empty className={`px-3 pb-2 ${muted}`}>Нічого не знайдено</Combobox.Empty>
            <Combobox.List className="min-h-0 flex-1 overflow-y-auto pb-1">
              {(group: Group) => (
                <Combobox.Group key={group.value} items={group.items}>
                  {group.value && <Combobox.GroupLabel className={`px-3 pt-2 pb-0.5 text-xs ${muted}`}>{group.value}</Combobox.GroupLabel>}
                  <Combobox.Collection>
                    {(item: Item) => (
                      <Combobox.Item
                        key={item.value}
                        value={item}
                        className="flex cursor-default items-center justify-between gap-2 px-3 py-1 outline-none data-highlighted:bg-indigo-50 data-selected:font-semibold data-selected:text-indigo-700 dark:data-highlighted:bg-indigo-950/50 dark:data-selected:text-indigo-300"
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
