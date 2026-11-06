// Builds a demo database with made-up data, for screenshots and trying the app.
// usage: node scripts/seed-demo.mjs <path/to/demo.db>   (refuses to touch an existing file)
// Shop names are public brands; people, the landlord and the employer are invented.
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

const file = process.argv[2]
if (!file) throw new Error('usage: node scripts/seed-demo.mjs <path/to/demo.db>')
if (existsSync(file)) throw new Error(`${file} exists; pick a new path so no real data is overwritten`)

const sqlite = new Database(file)
migrate(drizzle({ client: sqlite }), { migrationsFolder: join(import.meta.dirname, '..', 'drizzle') })

// fixed seed: the same data every run
let seed = 20260101
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const between = (min, max) => min + random() * (max - min)
const cents = (uah) => Math.round(uah * 100)
const now = Math.floor(Date.now() / 1000)

const account = sqlite.prepare('insert into accounts (name, currency, kind, balance_cents, position, mono_account_id, updated_at) values (?, ?, ?, ?, ?, ?, ?)')
const accounts = [
  ['Monobank', 'UAH', 'bank', 48250, 'demo-mono'],
  ['ПриватБанк', 'UAH', 'bank', 112400, null],
  ['Wise', 'EUR', 'bank', 4150, null],
  ['Долари вдома', 'USD', 'cash', 3200, null],
  ['Гаманець', 'UAH', 'cash', 6500, null],
]
const ids = accounts.map(([name, currency, kind, balance, mono], position) =>
  account.run(name, currency, kind, cents(balance), position, mono, now).lastInsertRowid)
const mono = ids[0]

sqlite.prepare(`insert into budget (id, monthly_spend_cents, currency, salary_cents, salary_currency, reserve_cents, reserve_currency,
  minimal_spend_cents, minimal_spend_currency, target_months) values (1, ?, 'UAH', ?, 'UAH', ?, 'USD', ?, 'UAH', 6)`)
  .run(cents(45000), cents(95000), cents(2000), cents(22000))
const goal = sqlite.prepare('insert into goals (name, target_cents, currency) values (?, ?, ?)')
goal.run('Відпустка в Карпатах', cents(1500), 'EUR')
goal.run('Новий автомобіль', cents(12000), 'USD')

const tx = sqlite.prepare('insert into transactions (account_id, external_id, time, description, mcc, amount_cents, note) values (?, ?, ?, ?, ?, ?, ?)')
let n = 0
const add = (date, description, mcc, uah, note = null) => {
  // a random time of day between 08:00 and 22:00 local
  const time = Math.floor(new Date(date).setHours(8 + Math.floor(random() * 14), Math.floor(random() * 60)) / 1000)
  if (time <= now) tx.run(mono, `demo-${++n}`, time, description, mcc, cents(uah), note)
}
// `times` purchases spread over the month
const spread = (year, month, times, description, mcc, min, max) => {
  for (let i = 0; i < times; i++) add(new Date(year, month, 1 + Math.floor(random() * 28)), description, mcc, -between(min, max))
}

for (let month = 0; month < 11; month++) {
  const day = (d) => new Date(2026, month, d)
  const winter = month < 2 || month > 9

  add(day(5), 'ТОВ «Демо Софт»', 4829, 95000)
  add(day(2), 'ФОП Коваленко Олег', 4829, -20000)
  add(day(12), 'Комунальні послуги', 4900, -between(winter ? 2600 : 1400, winter ? 3400 : 1900))
  add(day(14), 'Київстар', 4814, -350)
  add(day(15), 'Воля', 4899, -260)
  add(day(6), 'Interactive Brokers', 6211, -10000)

  spread(2026, month, 8, 'Сільпо', 5411, 300, 1500)
  spread(2026, month, 6, 'АТБ', 5411, 150, 700)
  spread(2026, month, 4, 'Ринок на Подолі', 5499, 120, 450)
  spread(2026, month, 10, 'Aroma Kava', 5814, 80, 180)
  spread(2026, month, 3, 'Пузата Хата', 5812, 300, 650)
  spread(2026, month, 1, 'Хмільний бар', 5813, 400, 900)
  spread(2026, month, 4, 'Uklon', 4121, 120, 350)
  spread(2026, month, 8, 'Київ Цифровий', 4111, 8, 30)
  spread(2026, month, 2, 'WOG', 5541, 1200, 1800)
  spread(2026, month, 2, 'Аптека «Подорожник»', 5912, 200, 900)
  spread(2026, month, 1, 'MasterZoo', 5995, 600, 900)
  spread(2026, month, 1, 'Rozetka', 5262, 500, 4000)
  spread(2026, month, 1, 'Multiplex', 7832, 250, 400)
  spread(2026, month, 2, 'Поповнення «На дрони для 3 ОШБр»', 4829, 200, 1000)

  add(day(9), 'Spotify', 5815, -199)
  add(day(11), 'Apple', 5818, -between(99, 449))
  add(day(18), 'GitHub', 7372, -410)
  add(day(21), 'Google', 5817, -99)
  if (month % 2 === 0) add(day(19), 'Тарас Мельник', 4829, -between(1000, 3000))
  if (month % 3 === 0) add(day(16), 'Податкова (ЄП)', 9311, -4500)
  if (month % 4 === 1) add(day(23), 'Добробут', 8011, -between(1500, 3500))
  if (month % 3 === 2) add(day(24), 'Епіцентр', 5211, -between(800, 5000))
  if (month % 5 === 4) add(day(20), 'Yakaboo', 5942, -between(400, 900))
  add(day(28), 'Виведення кешбеку', 4829, between(300, 900))
}
// one-off months make the chart worth reading
add(new Date(2026, 2, 8), 'Стоматологія «Посмішка»', 8021, -6800)
add(new Date(2026, 6, 3), 'Укрзалізниця', 4112, -2400)
add(new Date(2026, 6, 4), 'Booking.com', 7011, -14500, 'Карпати, 5 ночей')
add(new Date(2026, 6, 10), 'Concert.ua', 7922, -1800)
add(new Date(2026, 8, 12), 'Comfy', 5732, -42000, 'Ноутбук, ціль досягнута')
add(new Date(2026, 8, 14), 'Скасування. Rozetka', 5262, 1200)
add(new Date(2026, 9, 2), 'Zara', 5651, -3200)

// the landlord is paid by transfer: corrected once for the whole merchant
sqlite.prepare("insert into merchant_categories (merchant, category) values ('фоп коваленко олег', 'rent')").run()

sqlite.close()
console.log(`${file}: ${accounts.length} accounts, ${n} transactions`)
