import { type ReactNode } from 'react'
import { AlertDialog } from '@base-ui/react/alert-dialog'

type ConfirmButtonProps = {
  // the button that opens the dialog: its accessible name, look and content, usually an icon
  label: string
  className: string
  children: ReactNode
  // the question, an optional consequence under it, and the destructive button's text, e.g. "Delete"
  title: string
  description?: string
  confirmLabel: string
  onConfirm: () => void
}

// A button that asks before a destructive action, in a dialog instead of the browser's confirm()
export function ConfirmButton({
  label,
  className,
  children,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ConfirmButtonProps) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger aria-label={label} className={className}>
        {children}
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-30 bg-black/40 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-30 w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-xl ring-1 ring-zinc-200 transition duration-150 outline-none data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 dark:bg-zinc-900 dark:ring-zinc-800">
          <AlertDialog.Title className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </AlertDialog.Title>
          {description && (
            <AlertDialog.Description className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {description}
            </AlertDialog.Description>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Close className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
              Cancel
            </AlertDialog.Close>
            <AlertDialog.Close
              onClick={onConfirm}
              className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500"
            >
              {confirmLabel}
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
