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

// month and week keys a transaction belongs to, with a label for each, in local time
export function periodsOf(t: Transaction): Array<[string, string]> {
  const date = new Date(t.time)
  const { year, week } = isoWeek(date)
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() || 7) - 1))
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  return [
    [`m:${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, monthName.format(date)],
    [`w:${year}-${String(week).padStart(2, '0')}`, `Тиждень ${week} · ${shortDay.format(monday)} – ${shortDay.format(sunday)} ${year}`],
  ]
}
