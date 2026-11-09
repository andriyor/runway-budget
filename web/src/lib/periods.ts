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

const longDay = new Intl.DateTimeFormat('uk-UA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })

// ISO week key of a local date: "w:2026-45"
const weekKey = (date: Date) => {
  const { year, week } = isoWeek(date)
  return `w:${year}-${String(week).padStart(2, '0')}`
}

// week key of a day key: "2026-11-09" → "w:2026-46"
export const weekOfDay = (day: string) => weekKey(new Date(`${day}T00:00:00`))

// quarter of a month key: "2026-10" → "q:2026-4"
export const quarterOf = (month: string) => `q:${month.slice(0, 4)}-${Math.floor((Number(month.slice(5, 7)) - 1) / 3) + 1}`

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
