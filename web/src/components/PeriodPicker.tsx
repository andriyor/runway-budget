import { Select } from '@base-ui/react/select'
import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { ChevronIcon } from './icons'
import { periodsOf } from '../lib/periods'
import { inputBox } from '../lib/styles'
import type { Transaction } from '../lib/types'

// period kinds by key prefix; '' is all time. A day ('d:') is picked from the week chart, not here.
const KINDS = [
  { prefix: '', label: 'Усе' },
  { prefix: 'y:', label: 'Рік' },
  { prefix: 'q:', label: 'Квартал' },
  { prefix: 'm:', label: 'Місяць' },
  { prefix: 'w:', label: 'Тиждень' },
] as const

const kindOf = (period: string) => (period === '' ? '' : period.slice(0, 2))

type PeriodPickerProps = {
  period: string
  // every period key with transactions, and its label
  periods: Map<string, string>
  // the newest transaction in the current period: switching kind picks the period of that kind holding it
  reference: Transaction | undefined
  onChange: (period: string) => void
}

// The kind of period, ‹ › to step to the previous or next one of that kind, and a list of that kind's
// periods only, newest first, instead of one list of every month, quarter, year and week.
export function PeriodPicker({ period, periods, reference, onChange }: PeriodPickerProps) {
  const kind = kindOf(period)
  // a picked day steps and lists like its week
  const listKind = kind === 'd:' ? 'w:' : kind
  const options = [...periods].filter(([key]) => key.startsWith(listKind) && listKind !== '').sort(([a], [b]) => b.localeCompare(a))
  const index = options.findIndex(([key]) => key === period)
  // options are newest first, so "previous" is one further down the list
  const older = index >= 0 ? options[index + 1]?.[0] : undefined
  const newer = index > 0 ? options[index - 1][0] : undefined

  function pickKind(prefix: string) {
    if (prefix === '') return onChange('')
    const own = reference && periodsOf(reference).find(([key]) => key.startsWith(prefix))?.[0]
    onChange(own ?? [...periods.keys()].filter((key) => key.startsWith(prefix)).sort().at(-1) ?? '')
  }

  const step = 'grid size-9 shrink-0 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <ToggleGroup
        value={[kind === 'd:' ? 'w:' : kind]}
        onValueChange={(value) => value.length && pickKind(value[0])}
        aria-label="Period kind"
        className="inline-flex shrink-0 rounded-lg bg-zinc-100 p-0.5 text-sm dark:bg-zinc-800"
      >
        {KINDS.map((k) => (
          <Toggle
            key={k.prefix}
            value={k.prefix}
            className="rounded-md px-2.5 py-1.5 font-medium text-zinc-500 hover:text-zinc-800 data-pressed:bg-white data-pressed:text-zinc-900 data-pressed:shadow-sm dark:text-zinc-400 dark:hover:text-zinc-200 dark:data-pressed:bg-zinc-950 dark:data-pressed:text-zinc-100"
          >
            {k.label}
          </Toggle>
        ))}
      </ToggleGroup>

      {listKind !== '' && (
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <button type="button" className={step} disabled={!older} onClick={() => older && onChange(older)} aria-label="Previous period">
            <span className="-rotate-90"><ChevronIcon up /></span>
          </button>
          <Select.Root
            value={period}
            onValueChange={(value) => value && onChange(value)}
            items={[...options, ...(kind === 'd:' ? [[period, periods.get(period)] as const] : [])].map(([value, label]) => ({ value, label }))}
          >
            <Select.Trigger
              aria-label="Period"
              className={`flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2 text-left text-sm text-zinc-900 outline-none sm:w-64 sm:flex-none dark:text-zinc-100 ${inputBox}`}
            >
              <Select.Value className="truncate" />
              <Select.Icon className="shrink-0 text-zinc-400"><ChevronIcon /></Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner sideOffset={4} alignItemWithTrigger={false} className="z-40 outline-none">
                <Select.Popup className="max-h-[min(var(--available-height),20rem)] min-w-[var(--anchor-width)] overflow-y-auto rounded-lg bg-white p-1 text-sm shadow-lg ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700">
                  <Select.List>
                    {options.map(([key, label]) => (
                      <Select.Item
                        key={key}
                        value={key}
                        className="flex cursor-default items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-zinc-700 outline-none select-none data-highlighted:bg-indigo-50 data-highlighted:text-indigo-700 data-selected:font-semibold dark:text-zinc-300 dark:data-highlighted:bg-indigo-950/50 dark:data-highlighted:text-indigo-300"
                      >
                        <Select.ItemText>{label}</Select.ItemText>
                        <Select.ItemIndicator className="text-indigo-600 dark:text-indigo-400">✓</Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.List>
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
          <button type="button" className={step} disabled={!newer} onClick={() => newer && onChange(newer)} aria-label="Next period">
            <span className="rotate-90"><ChevronIcon up /></span>
          </button>
        </div>
      )}
    </div>
  )
}
