import { type FastifyPluginAsync } from 'fastify'
import { desc, eq, sql } from 'drizzle-orm'
import { accounts, accountKinds, currencies, transactions, type AccountKind, type Currency } from '../../db/schema'

type AccountRow = typeof accounts.$inferSelect
type AccountInput = { name: string, currency: Currency, balance: number, kind?: AccountKind }

const toDto = ({ balanceCents, position: _position, ...rest }: AccountRow) => ({ ...rest, balance: balanceCents / 100 })
const toCents = (balance: number) => Math.round(balance * 100)

const MONO_URL = 'https://api.monobank.ua/personal'
// statement allows at most 31 days + 1 hour per request
const MONTH_S = 31 * 24 * 60 * 60
// ISO 4217 numeric codes
const monoCurrencies: Record<number, Currency> = { 980: 'UAH', 840: 'USD', 978: 'EUR' }
type ClientInfo = { accounts: Array<{ id: string, creditLimit: number, currencyCode: number }> }
type StatementItem = { id: string, time: number, description: string, mcc: number, amount: number, balance: number }

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
    return rows.map(({ amountCents, ...rest }) => ({ ...rest, amount: amountCents / 100 }))
  })

  // pulls the last month of the MONO_ACCOUNT statement; safe to repeat
  fastify.post('/mono/sync', async (request, reply) => {
    const { MONO_TOKEN: token, MONO_ACCOUNT: monoAccountId } = process.env
    if (!token || !monoAccountId) return reply.internalServerError('MONO_TOKEN and MONO_ACCOUNT must be set')

    // both endpoints allow one call per minute
    const get = async (path: string) => {
      const res = await fetch(`${MONO_URL}${path}`, { headers: { 'X-Token': token } })
      if (res.status === 429) throw fastify.httpErrors.tooManyRequests('Monobank allows one sync per minute')
      if (!res.ok) {
        request.log.warn({ path, status: res.status, body: await res.text() }, 'Monobank request failed')
        throw fastify.httpErrors.badGateway(`Monobank responded ${res.status}`)
      }
      return res.json()
    }
    const info = await get('/client-info') as ClientInfo
    const card = info.accounts.find((x) => x.id === monoAccountId)
    if (!card) return reply.badRequest('MONO_ACCOUNT not found in Monobank client info')
    const currency = monoCurrencies[card.currencyCode]
    if (!currency) return reply.badRequest(`Unsupported Monobank currency ${card.currencyCode}`)

    const to = Math.floor(Date.now() / 1000)
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
        tx.insert(transactions).values(items.map((i) => ({
          accountId: row.id,
          externalId: i.id,
          time: new Date(i.time * 1000),
          description: i.description,
          mcc: i.mcc,
          amountCents: i.amount
        }))).onConflictDoNothing().run()
        const latest = items.reduce((a, b) => (b.time > a.time ? b : a))
        // statement balance includes the bank's credit limit; keep only own money
        row = tx.update(accounts).set({ balanceCents: latest.balance - card.creditLimit }).where(eq(accounts.id, row.id)).returning().get()
      }
      return row
    })
    return { account: toDto(account), fetched: items.length }
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
