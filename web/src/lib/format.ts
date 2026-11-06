import type { Currency } from './types'

export const format = (amount: number, currency: Currency) =>
  new Intl.NumberFormat('uk-UA', { style: 'currency', currency }).format(amount)

export const formatRate = (rate: number) =>
  new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(rate)

export const symbols: Record<Currency, string> = { USD: '$', EUR: '€', UAH: '₴' }
export const iconColors: Record<Currency, string> = { USD: 'bg-emerald-600', EUR: 'bg-blue-600', UAH: 'bg-amber-600' }

export const percentOf = (share: number | undefined) => (share === undefined ? undefined : Math.round(share * 1000) / 10)

export const wholeMoney = (amount: number, currency: Currency) =>
  new Intl.NumberFormat('uk-UA', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
