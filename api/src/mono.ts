import { type FastifyBaseLogger, type FastifyInstance } from 'fastify'
import { eq, max, sql } from 'drizzle-orm'
import { accounts, transactions, type Currency } from './db/schema'
// type-only: the plugins that add fastify.db and fastify.httpErrors
import type {} from './plugins/db'
import type {} from '@fastify/sensible'

const MONO_URL = 'https://api.monobank.ua/personal'
// statement allows at most 31 days + 1 hour per request
const MONTH_S = 31 * 24 * 60 * 60
// ISO 4217 numeric codes
const monoCurrencies: Record<number, Currency> = { 980: 'UAH', 840: 'USD', 978: 'EUR' }
type ClientInfo = { accounts: Array<{ id: string, creditLimit: number, currencyCode: number }> }
type StatementItem = { id: string, time: number, description: string, mcc: number, amount: number, balance: number }

// Pulls 31 days of the MONO_ACCOUNT statement ending at `to` (unix seconds) into its account; safe to repeat.
// Used by POST /accounts/mono/sync and the twice-daily schedule. Failures throw HTTP errors.
export async function syncMono (fastify: FastifyInstance, log: FastifyBaseLogger, to = Math.floor(Date.now() / 1000)) {
  const { MONO_TOKEN: token, MONO_ACCOUNT: monoAccountId } = process.env
  if (!token || !monoAccountId) throw fastify.httpErrors.internalServerError('MONO_TOKEN and MONO_ACCOUNT must be set')

  // both endpoints allow one call per minute
  const get = async (path: string) => {
    const res = await fetch(`${MONO_URL}${path}`, { headers: { 'X-Token': token } })
    if (res.status === 429) throw fastify.httpErrors.tooManyRequests('Monobank allows one sync per minute')
    if (!res.ok) {
      log.warn({ path, status: res.status, body: await res.text() }, 'Monobank request failed')
      throw fastify.httpErrors.badGateway(`Monobank responded ${res.status}`)
    }
    return res.json()
  }
  const info = await get('/client-info') as ClientInfo
  const card = info.accounts.find((x) => x.id === monoAccountId)
  if (!card) throw fastify.httpErrors.badRequest('MONO_ACCOUNT not found in Monobank client info')
  const currency = monoCurrencies[card.currencyCode]
  if (!currency) throw fastify.httpErrors.badRequest(`Unsupported Monobank currency ${card.currencyCode}`)

  // ponytail: Monobank caps a statement at 500 items; page by `to` if a month ever exceeds that
  const items = await get(`/statement/${monoAccountId}/${to - MONTH_S}/${to}`) as StatementItem[]

  const account = fastify.db.transaction((tx) => {
    let row = tx.select().from(accounts).where(eq(accounts.monoAccountId, monoAccountId)).get() ??
      tx.insert(accounts).values({
        name: 'Monobank',
        currency,
        balanceCents: 0,
        monoAccountId,
        position: sql`(select coalesce(max(${accounts.position}), -1) + 1 from ${accounts})`
      }).returning().get()

    if (items.length > 0) {
      const stored = tx.select({ latest: max(transactions.time) }).from(transactions).where(eq(transactions.accountId, row.id)).get()
      tx.insert(transactions).values(items.map((i) => ({
        accountId: row.id,
        externalId: i.id,
        time: new Date(i.time * 1000),
        description: i.description,
        mcc: i.mcc,
        amountCents: i.amount
      }))).onConflictDoNothing().run()
      const latest = items.reduce((a, b) => (b.time > a.time ? b : a))
      // an older window must not roll the balance back
      // statement balance includes the bank's credit limit; keep only own money
      if (!stored?.latest || latest.time * 1000 >= stored.latest.getTime()) row = tx.update(accounts).set({ balanceCents: latest.balance - card.creditLimit }).where(eq(accounts.id, row.id)).returning().get()
    }
    return row
  })
  return { account, fetched: items.length }
}
