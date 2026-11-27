import type { ReactNode } from 'react'
import { Select } from '@base-ui/react/select'

type ChipSelectProps = {
  label: string
  title: string
  // the picked option's id, null for none
  value: number | null
  options: Array<{ value: number; label: string }>
  // the item that picks none: "Не переказ", "Не з вішліста"
  noneLabel: string
  onChange: (value: number | null) => void
  // what the trigger shows (an icon and text) and its look, a chip once picked or a link before
  children: ReactNode
  className: string
}

// A transaction row's chip that opens a list to pick from, with one item for none: a Base UI Select whose
// trigger is the chip itself. The popup mounts only while open, so a row costs just its trigger.
export function ChipSelect({
  label,
  title,
  value,
  options,
  noneLabel,
  onChange,
  children,
  className,
}: ChipSelectProps) {
  return (
    <Select.Root
      value={value}
      onValueChange={(next) => next !== value && onChange(next)}
      items={[{ value: null, label: noneLabel }, ...options]}
      modal={false}
    >
      <Select.Trigger
        aria-label={label}
        title={title}
        className={`inline-flex max-w-44 shrink-0 cursor-pointer items-center gap-1 text-xs focus-visible:outline-2 focus-visible:outline-indigo-500 ${className}`}
      >
        {children}
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={4} align="start" alignItemWithTrigger={false} className="z-40 outline-none">
          <Select.Popup className="max-h-[min(var(--available-height),20rem)] min-w-44 overflow-y-auto rounded-lg bg-white p-1 text-sm shadow-lg ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700">
            <Select.List>
              {[{ value: null, label: noneLabel }, ...options].map((o) => (
                <Select.Item
                  key={o.value ?? 'none'}
                  value={o.value}
                  className={`flex cursor-default items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-zinc-700 outline-none select-none data-highlighted:bg-indigo-50 data-highlighted:text-indigo-700 data-selected:font-semibold dark:text-zinc-300 dark:data-highlighted:bg-indigo-950/50 dark:data-highlighted:text-indigo-300 ${o.value === null ? 'text-zinc-500 dark:text-zinc-400' : ''}`}
                >
                  <Select.ItemText>{o.label}</Select.ItemText>
                  <Select.ItemIndicator className="text-indigo-600 dark:text-indigo-400">✓</Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}
