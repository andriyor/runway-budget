import type { Currency } from './types'

// one formatter per currency and style, built once: amounts are formatted hundreds of times per render
const formatters = new Map<string, Intl.NumberFormat>()
const formatter = (currency: Currency, maximumFractionDigits?: number) => {
  const key = `${currency}:${maximumFractionDigits}`
  if (!formatters.has(key))
    formatters.set(key, new Intl.NumberFormat('uk-UA', { style: 'currency', currency, maximumFractionDigits }))
  return formatters.get(key)!
}

export const format = (amount: number, currency: Currency) => formatter(currency).format(amount)

const rate = new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
export const formatRate = (value: number) => rate.format(value)

export const symbols: Record<Currency, string> = { USD: '$', EUR: '€', UAH: '₴' }
export const iconColors: Record<Currency, string> = { USD: 'bg-emerald-600', EUR: 'bg-blue-600', UAH: 'bg-amber-600' }

export const percentOf = (share: number | undefined) =>
  share === undefined ? undefined : Math.round(share * 1000) / 10

export const wholeMoney = (amount: number, currency: Currency) => formatter(currency, 0).format(amount)

const AVG_DAYS_IN_MONTH = 30.44

// the local date `months` after `now`, e.g. 23.06.2027
export const dateIn = (months: number, now: number) =>
  new Date(now + months * AVG_DAYS_IN_MONTH * 864e5).toLocaleDateString('uk-UA')
