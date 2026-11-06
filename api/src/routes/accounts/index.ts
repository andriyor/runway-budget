import { type FastifyPluginAsync } from 'fastify'
import { eq, sql } from 'drizzle-orm'
import { accounts, currencies, type Currency } from '../../db/schema'

type AccountRow = typeof accounts.$inferSelect
type AccountInput = { name: string, currency: Currency, balance: number }

const toDto = ({ balanceCents, position: _position, ...rest }: AccountRow) => ({ ...rest, balance: balanceCents / 100 })
const toCents = (balance: number) => Math.round(balance * 100)

const inputProps = {
  name: { type: 'string', minLength: 1, maxLength: 100 },
  currency: { type: 'string', enum: currencies },
  balance: { type: 'number' }
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
    const { name, currency, balance } = request.body
    const [row] = await fastify.db.insert(accounts)
      .values({
        name,
        currency,
        balanceCents: toCents(balance),
        // append to the end of the list
        position: sql`(select coalesce(max(${accounts.position}), -1) + 1 from ${accounts})`
      })
      .returning()
    return reply.code(201).send(toDto(row))
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
