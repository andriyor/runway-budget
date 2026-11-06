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
