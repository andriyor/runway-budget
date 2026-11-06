import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const currencies = ['USD', 'EUR', 'UAH'] as const
export type Currency = typeof currencies[number]
export const accountKinds = ['bank', 'cash'] as const
export type AccountKind = typeof accountKinds[number]

export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  currency: text('currency', { enum: currencies }).notNull(),
  kind: text('kind', { enum: accountKinds }).notNull().default('bank'),
  // stored in minor units (cents/kopiykas) to avoid float drift
  balanceCents: integer('balance_cents').notNull(),
  // display order, ascending; ties fall back to id
  position: integer('position').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date())
})

export const goals = sqliteTable('goals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  targetCents: integer('target_cents').notNull(),
  currency: text('currency', { enum: currencies }).notNull()
})

// single row (id = 1): how much is spent per month, used for runway
export const budget = sqliteTable('budget', {
  id: integer('id').primaryKey(),
  monthlySpendCents: integer('monthly_spend_cents').notNull(),
  currency: text('currency', { enum: currencies }).notNull(),
  // optional; both set or both null
  salaryCents: integer('salary_cents'),
  salaryCurrency: text('salary_currency', { enum: currencies }),
  // optional amount that is never spent; excluded from runway
  reserveCents: integer('reserve_cents'),
  reserveCurrency: text('reserve_currency', { enum: currencies }),
  // optional extreme-saving monthly spend, expected below monthlySpend
  minimalSpendCents: integer('minimal_spend_cents'),
  minimalSpendCurrency: text('minimal_spend_currency', { enum: currencies }),
  // optional months to live without salary; drives the max monthly spend
  targetMonths: integer('target_months')
})
