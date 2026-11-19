import type { ReactNode } from 'react'
import { Switch as BaseSwitch } from '@base-ui/react/switch'

// A pill on/off switch with its label; the thumb slides right and the track takes the accent when on.
export function Switch({
  checked,
  onChange,
  title,
  children,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  title?: string
  children: ReactNode
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2" title={title}>
      <BaseSwitch.Root
        checked={checked}
        onCheckedChange={onChange}
        className="inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-zinc-300 p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 data-checked:bg-indigo-600 dark:bg-zinc-700 dark:data-checked:bg-indigo-500"
      >
        <BaseSwitch.Thumb className="size-4 rounded-full bg-white shadow-sm transition-transform data-checked:translate-x-4" />
      </BaseSwitch.Root>
      {children}
    </label>
  )
}
