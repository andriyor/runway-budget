import type { Transaction } from './types'

export const monthKey = (time: string) => {
  const d = new Date(time)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ISO 8601 week: weeks start on Monday, week 1 holds the year's first Thursday
function isoWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const year = d.getUTCFullYear()
  return { year, week: Math.ceil(((d.getTime() - Date.UTC(year, 0, 1)) / 86_400_000 + 1) / 7) }
}

const monthName = new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric' })

const shortDay = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' })

const fullDay = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })
const longDay = new Intl.DateTimeFormat('uk-UA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })

// "2027-03" → "березень 2027 р."
export const monthLabel = (month: string) => monthName.format(new Date(`${month}-01T00:00:00`))

// ISO week key of a local date: "w:2026-45"
const weekKey = (date: Date) => {
  const { year, week } = isoWeek(date)
  return `w:${year}-${String(week).padStart(2, '0')}`
}

// week key of a day key: "2026-11-09" → "w:2026-46"
export const weekOfDay = (day: string) => weekKey(new Date(`${day}T00:00:00`))

// quarter of a month key: "2026-10" → "q:2026-4"
export const quarterOf = (month: string) =>
  `q:${month.slice(0, 4)}-${Math.floor((Number(month.slice(5, 7)) - 1) / 3) + 1}`

// "q:2026-4" → "4-й квартал 2026"
export const quarterLabel = (quarter: string) => `${quarter.slice(7)}-й квартал ${quarter.slice(2, 6)}`

// month keys of a quarter key: "q:2026-4" → ["2026-10", "2026-11", "2026-12"]
export const quarterMonths = (quarter: string) => {
  const [year, q] = quarter.slice(2).split('-').map(Number)
  return [1, 2, 3].map((i) => `${year}-${String((q - 1) * 3 + i).padStart(2, '0')}`)
}

// local day key: "2026-11-09"
export const dayKey = (time: string) => `${monthKey(time)}-${String(new Date(time).getDate()).padStart(2, '0')}`

// day keys of an ISO week key, Monday first: "w:2026-01" → ["2025-12-29", …, "2026-01-04"]
export const weekDays = (week: string) => {
  const [year, n] = week.slice(2).split('-').map(Number)
  // January 4th is always in week 1
  const monday = 4 - ((new Date(year, 0, 4).getDay() || 7) - 1) + (n - 1) * 7
  return [0, 1, 2, 3, 4, 5, 6].map((i) => dayKey(new Date(year, 0, monday + i).toISOString()))
}
// month, quarter, year, week and day keys a transaction belongs to, with a label for each, in local time
export function periodsOf(t: Transaction): Array<[string, string]> {
  const date = new Date(t.time)
  const { year, week } = isoWeek(date)
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() || 7) - 1))
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  return [
    [`m:${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, monthName.format(date)],
    [quarterOf(monthKey(t.time)), quarterLabel(quarterOf(monthKey(t.time)))],
    [`y:${date.getFullYear()}`, `${date.getFullYear()} рік`],
    [weekKey(date), `Тиждень ${week} · ${shortDay.format(monday)} – ${shortDay.format(sunday)} ${year}`],
    [`d:${dayKey(t.time)}`, longDay.format(date)],
  ]
}

// a picked range, both days included: "r:2026-03-03..2026-04-15" → ["2026-03-03", "2026-04-15"]
export const rangeOf = (period: string) =>
  period.startsWith('r:') ? (period.slice(2).split('..') as [string, string]) : undefined

// "3 бер. – 15 квіт. 2026 р.", or one day: "3 бер. 2026 р."
export function rangeLabel(period: string) {
  const [from, to] = rangeOf(period)!.map((d) => new Date(`${d}T00:00:00`))
  if (from.getTime() === to.getTime()) return fullDay.format(from)
  return from.getFullYear() === to.getFullYear()
    ? `${shortDay.format(from)} – ${fullDay.format(to)}`
    : `${fullDay.format(from)} – ${fullDay.format(to)}`
}

// whether a local day key ("2026-03-03") falls in a period key, a range included; '' is all time
export function dayInPeriod(day: string, period: string) {
  const range = rangeOf(period)
  if (range) return day >= range[0] && day <= range[1]
  if (period === '') return true
  if (period.startsWith('d:')) return day === period.slice(2)
  if (period.startsWith('m:') || period.startsWith('y:')) return day.startsWith(period.slice(2))
  if (period.startsWith('q:')) return quarterOf(day.slice(0, 7)) === period
  if (period.startsWith('w:')) return weekOfDay(day) === period
  return false
}

// whether a transaction falls in a period key, a range included
export const inPeriod = (t: Transaction, period: string) => dayInPeriod(dayKey(t.time), period)

// a day key as a local date, and a local date as a day key
const dateOf = (day: string) => new Date(`${day}T00:00:00`)
const keyOf = (date: Date) => dayKey(date.toISOString())
const addDays = (day: string, days: number) => {
  const d = dateOf(day)
  return keyOf(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days))
}
// the same day of the month `months` away, or that month's last day when it is shorter
const addMonths = (day: string, months: number) => {
  const d = dateOf(day)
  const last = new Date(d.getFullYear(), d.getMonth() + months + 1, 0).getDate()
  return keyOf(new Date(d.getFullYear(), d.getMonth() + months, Math.min(d.getDate(), last)))
}
const daysBetween = (from: string, to: string) => Math.round((dateOf(to).getTime() - dateOf(from).getTime()) / 864e5)

// first and last day of a period key; undefined for all time
export function periodBounds(period: string): [string, string] | undefined {
  const range = rangeOf(period)
  if (range) return range
  const key = period.slice(2)
  if (period.startsWith('d:')) return [key, key]
  if (period.startsWith('m:')) return [`${key}-01`, addDays(addMonths(`${key}-01`, 1), -1)]
  if (period.startsWith('q:')) {
    const months = quarterMonths(period)
    return [`${months[0]}-01`, addDays(addMonths(`${months[2]}-01`, 1), -1)]
  }
  if (period.startsWith('y:')) return [`${key}-01-01`, `${key}-12-31`]
  if (period.startsWith('w:')) {
    const days = weekDays(period)
    return [days[0], days[6]]
  }
  return undefined
}

// The period to compare a period with: the one before of the same kind; for a day, the same weekday a week
// earlier (yesterday mostly shows which weekday it was); for a range, as many days just before it. A period
// still running is cut at today and compared with as many days of the one before, so mid-month is not set
// against a whole month. undefined for all time and for a period that has not started.
export function previousOf(period: string, today: string): string | undefined {
  const bounds = periodBounds(period)
  if (!bounds || bounds[0] > today) return undefined
  const [from, end] = bounds
  const to = end < today ? end : today
  const running = to !== end
  const months = { 'm:': 1, 'q:': 3, 'y:': 12 }[period.slice(0, 2)]
  if (months) {
    const before = addMonths(from, -months)
    if (running) return `r:${before}..${addMonths(to, -months)}`
    if (months === 1) return `m:${before.slice(0, 7)}`
    return months === 3 ? quarterOf(before.slice(0, 7)) : `y:${before.slice(0, 4)}`
  }
  if (period.startsWith('w:'))
    return running ? `r:${addDays(from, -7)}..${addDays(to, -7)}` : weekOfDay(addDays(from, -7))
  if (period.startsWith('d:')) return `r:${addDays(from, -7)}..${addDays(from, -7)}`
  const days = daysBetween(from, to) + 1
  return `r:${addDays(from, -days)}..${addDays(from, -1)}`
}

// a period's label: the one known from its transactions, else its days
export const periodLabel = (period: string, known: Map<string, string>) =>
  known.get(period) ?? rangeLabel(`r:${periodBounds(period)!.join('..')}`)
