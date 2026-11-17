import { kindIcons, kindLabels } from '../lib/display'
import { accountKinds, type AccountKind } from '../lib/types'

export function KindToggle({ value, onChange }: { value: AccountKind; onChange: (k: AccountKind) => void }) {
  return (
    <div role="group" aria-label="Account type" className="inline-flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
      {accountKinds.map((k) => {
        const Icon = kindIcons[k]
        const active = k === value
        return (
          <button
            key={k}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(k)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium ${
              active
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {/* icon only in an accounts list under 28rem (phones, the sidebar on smaller desktops); the label stays for screen readers */}
            <Icon /> <span className="@max-md:sr-only">{kindLabels[k]}</span>
          </button>
        )
      })}
    </div>
  )
}
