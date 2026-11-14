import { type ReactNode } from 'react'
import { Popover } from '@base-ui/react/popover'
import { Info } from 'lucide-react'
import { kindIcons, kindLabels } from '../lib/display'
import { inputBox } from '../lib/styles'
import { currencies, type Currency, accountKinds, type AccountKind } from '../lib/types'

export function KindToggle({ value, onChange }: { value: AccountKind, onChange: (k: AccountKind) => void }) {
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

export function Skeleton() {
  return <span className="inline-block h-8 w-36 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
}

export function ErrorText({ children }: { children: string }) {
  return children ? <p role="alert" className="mt-2 text-sm text-rose-600 dark:text-rose-400">{children}</p> : null
}

// a page's load or save error, above its cards
export function ErrorBanner({ children }: { children: string }) {
  return children
    ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900">{children}</p>
    : null
}

type MoneyInputProps = {
  id?: string
  label: string
  value: string
  onChange: (v: string) => void
  currency: Currency
  onCurrency: (c: Currency) => void
  required?: boolean
  min?: string
  placeholder?: string
}

export function MoneyInput({ id, label, value, onChange, currency, onCurrency, required, min, placeholder }: MoneyInputProps) {
  return (
    <div className={`flex ${inputBox}`}>
      <input
        id={id}
        type="number"
        step="0.01"
        min={min}
        required={required}
        placeholder={placeholder}
        aria-label={id ? undefined : label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-zinc-900 tabular-nums outline-none placeholder:text-zinc-400 dark:text-zinc-100"
      />
      <select
        value={currency}
        onChange={(e) => onCurrency(e.target.value as Currency)}
        aria-label={`${label} currency`}
        className="rounded-r-lg border-l border-zinc-200 bg-transparent px-2 text-sm font-medium text-zinc-700 outline-none dark:border-zinc-700 dark:text-zinc-200"
      >
        {currencies.map((c) => <option key={c}>{c}</option>)}
      </select>
    </div>
  )
}

// ⓘ with a short explanation: opens on mouse hover or on click, tap or Enter; closes on Esc or outside.
// In a portal, so a scrolling table or a narrow screen does not clip it.
export function InfoTip({ label, children }: { label: string, children: ReactNode }) {
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
