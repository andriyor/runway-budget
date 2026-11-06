import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import type { AccountKind, AllOf, Currency } from '@runway-budget/shared'
import { categoryIds } from '../categories'

export type { AccountKind, Currency }
// runtime lists for column enums and request validation; AllOf keeps them equal to the shared unions
const currencyList = ['USD', 'EUR', 'UAH'] as const
export const currencies: AllOf<Currency, typeof currencyList> = currencyList
const accountKindList = ['bank', 'cash'] as const
export const accountKinds: AllOf<AccountKind, typeof accountKindList> = accountKindList

export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  currency: text('currency', { enum: currencies }).notNull(),
  kind: text('kind', { enum: accountKinds }).notNull().default('bank'),
  // stored in minor units (cents/kopiykas) to avoid float drift
  balanceCents: integer('balance_cents').notNull(),
  // display order, ascending; ties fall back to id
  position: integer('position').notNull().default(0),
  // set for accounts synced from Monobank
  monoAccountId: text('mono_account_id').unique(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date())
})

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  // bank's own transaction id, keeps re-syncs idempotent
  externalId: text('external_id').notNull().unique(),
  time: integer('time', { mode: 'timestamp' }).notNull(),
  description: text('description').notNull(),
  mcc: integer('mcc').notNull(),
  // account currency, minor units; negative = spending
  amountCents: integer('amount_cents').notNull(),
  // user's category for this transaction only; wins over merchant_categories
  category: text('category', { enum: categoryIds as [string, ...string[]] }),
  // user's free-text note
  note: text('note')
})

// user's category for every transaction of a merchant; key is merchantKey(description)
export const merchantCategories = sqliteTable('merchant_categories', {
  merchant: text('merchant').primaryKey(),
  category: text('category', { enum: categoryIds as [string, ...string[]] }).notNull()
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
