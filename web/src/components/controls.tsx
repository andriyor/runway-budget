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
            {/* icon only on phones; the label stays for screen readers */}
            <Icon /> <span className="max-sm:sr-only">{kindLabels[k]}</span>
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
