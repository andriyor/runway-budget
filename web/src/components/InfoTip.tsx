import { type ReactNode } from 'react'
import { Popover } from '@base-ui/react/popover'
import { Info } from 'lucide-react'

// ⓘ with a short explanation: opens on mouse hover or on click, tap or Enter; closes on Esc or outside.
// In a portal, so a scrolling table or a narrow screen does not clip it.
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={0}
        aria-label={label}
        className="inline-flex rounded-full text-zinc-400 hover:text-zinc-600 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:text-zinc-200"
      >
        <Info size={20} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="start" collisionPadding={8} className="z-20">
          <Popover.Popup className="w-64 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-normal text-white shadow-lg outline-none dark:bg-zinc-700">
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
