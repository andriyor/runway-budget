import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const currencies = ['USD', 'EUR', 'UAH'] as const
export type Currency = typeof currencies[number]

export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  currency: text('currency', { enum: currencies }).notNull(),
  // stored in minor units (cents/kopiykas) to avoid float drift
  balanceCents: integer('balance_cents').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date())
})

// single row (id = 1): how much is spent per month, used for runway
export const budget = sqliteTable('budget', {
  id: integer('id').primaryKey(),
  monthlySpendCents: integer('monthly_spend_cents').notNull(),
  currency: text('currency', { enum: currencies }).notNull(),
  // optional; both set or both null
  salaryCents: integer('salary_cents'),
  salaryCurrency: text('salary_currency', { enum: currencies })
})
