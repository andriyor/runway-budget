import { type FastifyPluginAsync } from 'fastify'
import { eq } from 'drizzle-orm'
import { accounts, currencies, type Currency } from '../../db/schema'

type AccountRow = typeof accounts.$inferSelect
type AccountInput = { name: string, currency: Currency, balance: number }

const toDto = ({ balanceCents, ...rest }: AccountRow) => ({ ...rest, balance: balanceCents / 100 })
const toCents = (balance: number) => Math.round(balance * 100)

const inputProps = {
  name: { type: 'string', minLength: 1, maxLength: 100 },
  currency: { type: 'string', enum: currencies },
  balance: { type: 'number' }
}

const accountsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => {
    const rows = await fastify.db.select().from(accounts).orderBy(accounts.id)
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
      .values({ name, currency, balanceCents: toCents(balance) })
      .returning()
    return reply.code(201).send(toDto(row))
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
}

export default accountsRoutes
