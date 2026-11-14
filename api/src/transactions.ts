import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type { Transaction } from '@runway-budget/shared'
import { desc, eq } from 'drizzle-orm'
// MCC → description, from github.com/Oleksios/Merchant-Category-Codes (MIT, see data/mcc.LICENSE)
import mccDescriptions from './data/mcc.json'
import { cancelledIds } from './cancellations'
import { categorize, isEssential, merchantKey, type CategoryId } from './categories'
// merchant domain → lowercase name fragments; the domain is used for the icon
import merchantKeywords from './data/merchants.json'
import { merchantCategories, merchantEssentials, transactions } from './db/schema'

const merchants = Object.entries(merchantKeywords as Record<string, string[]>)
const merchantDomain = (description: string) => {
  const text = description.toLowerCase()
  return merchants.find(([, keywords]) => keywords.some((k) => text.includes(k)))?.[0] ?? null
}

// An account's transactions, newest first, with their category, essential flag and cancellation pairing resolved
export async function accountTransactions (db: BetterSQLite3Database, accountId: number): Promise<Transaction[]> {
  const rows = await db.select().from(transactions)
    .where(eq(transactions.accountId, accountId))
    .orderBy(desc(transactions.time), desc(transactions.id))
  const overrides = new Map((await db.select().from(merchantCategories))
    .map((o) => [o.merchant, o.category as CategoryId]))
  const essentials = new Map((await db.select().from(merchantEssentials)).map((o) => [o.merchant, o.essential]))
  const cancelled = cancelledIds(rows)
  return rows.map(({ amountCents, category: own, essential: ownEssential, time, operationAmount: _op, operationCurrency: _cur, ...rest }): Transaction => {
    const key = merchantKey(rest.description)
    const merchant = overrides.get(key)
    const merchantEssential = essentials.get(key)
    const category = categorize(rest.mcc, rest.description, amountCents, own ?? merchant)
    return {
      ...rest,
      time: time.toISOString(),
      amount: amountCents / 100,
      // groups a merchant's purchases and refunds, same key as merchant category overrides
      merchant: key,
      category,
      // which level decided the category, so the UI can offer to promote or reset it
      categorySource: own ? 'transaction' : merchant ? 'merchant' : 'auto',
      // needed to live; same three levels as the category, the default comes from the category
      essential: ownEssential ?? merchantEssential ?? isEssential(category),
      essentialSource: ownEssential != null ? 'transaction' : merchantEssential != null ? 'merchant' : 'auto',
      mccDescription: (mccDescriptions as Record<string, string>)[rest.mcc] ?? null,
      merchantDomain: merchantDomain(rest.description),
      cancelled: cancelled.has(rest.id)
    }
  })
}
