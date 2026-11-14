import { iconColors, symbols } from '../lib/format'
import type { Currency } from '../lib/types'

export function CurrencyIcon({ currency, className = 'size-6 text-xs' }: { currency: Currency, className?: string }) {
  return (
    <span className={`inline-grid shrink-0 place-items-center rounded-full font-bold text-white ${iconColors[currency]} ${className}`} aria-hidden="true">
      {symbols[currency]}
    </span>
  )
}
