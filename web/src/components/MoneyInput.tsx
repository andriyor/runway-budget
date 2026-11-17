import { inputBox } from '../lib/styles'
import { currencies, type Currency } from '../lib/types'

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

export function MoneyInput({
  id,
  label,
  value,
  onChange,
  currency,
  onCurrency,
  required,
  min,
  placeholder,
}: MoneyInputProps) {
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
        {currencies.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
    </div>
  )
}
