import { type FastifyPluginAsync } from 'fastify'
import type { Account, Transaction } from '@runway-budget/shared'
import { desc, eq, sql } from 'drizzle-orm'
// MCC → description, from github.com/Oleksios/Merchant-Category-Codes (MIT, see data/mcc.LICENSE)
import mccDescriptions from '../../data/mcc.json'
import { categorize, isEssential, merchantKey, type CategoryId } from '../../categories'
// merchant domain → lowercase name fragments; the domain is used for the icon
import merchantKeywords from '../../data/merchants.json'
import { syncMono } from '../../mono'
import { accounts, accountKinds, currencies, merchantCategories, merchantEssentials, transactions, type AccountKind, type Currency } from '../../db/schema'

type AccountRow = typeof accounts.$inferSelect
type AccountInput = { name: string, currency: Currency, balance: number, kind?: AccountKind }

const toDto = ({ balanceCents, position: _position, updatedAt, ...rest }: AccountRow): Account =>
  ({ ...rest, updatedAt: updatedAt.toISOString(), balance: balanceCents / 100 })
const toCents = (balance: number) => Math.round(balance * 100)

const merchants = Object.entries(merchantKeywords as Record<string, string[]>)
const merchantDomain = (description: string) => {
  const text = description.toLowerCase()
  return merchants.find(([, keywords]) => keywords.some((k) => text.includes(k)))?.[0] ?? null
}


const inputProps = {
  name: { type: 'string', minLength: 1, maxLength: 100 },
  currency: { type: 'string', enum: currencies },
  balance: { type: 'number' },
  kind: { type: 'string', enum: accountKinds }
}

const accountsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => {
    const rows = await fastify.db.select().from(accounts).orderBy(accounts.position, accounts.id)
    return rows.map(toDto)
  })

  fastify.post<{ Body: AccountInput }>('/', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'currency', 'balance'],
        additionalProperties: false,
        properties: inputProps
      }
    }
  }, async (request, reply) => {
    const { name, currency, balance, kind } = request.body
    const [row] = await fastify.db.insert(accounts)
      .values({
        name,
        currency,
        kind,
        balanceCents: toCents(balance),
        // append to the end of the list
        position: sql`(select coalesce(max(${accounts.position}), -1) + 1 from ${accounts})`
      })
      .returning()
    return reply.code(201).send(toDto(row))
  })

  fastify.get<{ Params: { id: number } }>('/:id/transactions', {
    schema: { params: { type: 'object', properties: { id: { type: 'integer' } } } }
  }, async (request) => {
    const rows = await fastify.db.select().from(transactions)
      .where(eq(transactions.accountId, request.params.id))
      .orderBy(desc(transactions.time), desc(transactions.id))
    const overrides = new Map((await fastify.db.select().from(merchantCategories))
      .map((o) => [o.merchant, o.category as CategoryId]))
    const essentials = new Map((await fastify.db.select().from(merchantEssentials)).map((o) => [o.merchant, o.essential]))
    return rows.map(({ amountCents, category: own, essential: ownEssential, time, ...rest }): Transaction => {
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
        merchantDomain: merchantDomain(rest.description)
      }
    })
  })

  // pulls 31 days of the MONO_ACCOUNT statement ending at `to` (unix seconds, default now); safe to repeat
  fastify.post<{ Querystring: { to?: number } }>('/mono/sync', {
    schema: { querystring: { type: 'object', additionalProperties: false, properties: { to: { type: 'integer', minimum: 0 } } } }
  }, async (request) => {
    const { account, fetched } = await syncMono(fastify, request.log, request.query.to)
    return { account: toDto(account), fetched }
  })

  // body is every account id in the desired order
  fastify.put<{ Body: { ids: number[] } }>('/order', {
    schema: {
      body: {
        type: 'object',
        required: ['ids'],
        additionalProperties: false,
        properties: { ids: { type: 'array', items: { type: 'integer' }, uniqueItems: true } }
      }
    }
  }, async (request, reply) => {
    const { ids } = request.body
    const existing = (await fastify.db.select({ id: accounts.id }).from(accounts)).map((a) => a.id)
    const sameSet = ids.length === existing.length && existing.every((id) => ids.includes(id))
    if (!sameSet) return reply.badRequest('ids must list every account exactly once')

    fastify.db.transaction((tx) => {
      ids.forEach((id, position) => {
        tx.update(accounts)
          // keep updatedAt: reordering is not a balance change
          .set({ position, updatedAt: sql`${accounts.updatedAt}` })
          .where(eq(accounts.id, id))
          .run()
      })
    })
    return reply.code(204).send()
  })

  fastify.patch<{ Params: { id: number }, Body: Partial<AccountInput> }>('/:id', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'integer' } } },
      body: {
        type: 'object',
        minProperties: 1,
        additionalProperties: false,
        properties: inputProps
      }
    }
  }, async (request, reply) => {
    const { balance, ...rest } = request.body
    const [row] = await fastify.db.update(accounts)
      .set({ ...rest, ...(balance !== undefined && { balanceCents: toCents(balance) }) })
      .where(eq(accounts.id, request.params.id))
      .returning()
    if (!row) return reply.notFound()
    return toDto(row)
  })

  fastify.delete<{ Params: { id: number } }>('/:id', {
    schema: { params: { type: 'object', properties: { id: { type: 'integer' } } } }
  }, async (request, reply) => {
    const [row] = await fastify.db.delete(accounts).where(eq(accounts.id, request.params.id)).returning()
    if (!row) return reply.notFound()
    return reply.code(204).send()
  })
}

export default accountsRoutes
