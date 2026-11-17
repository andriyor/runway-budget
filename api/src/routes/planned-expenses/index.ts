import { type FastifyPluginAsync } from 'fastify'
import type { PlannedExpense } from '@runway-budget/shared'
import { eq } from 'drizzle-orm'
import { plannedExpenses, currencies, type Currency } from '../../db/schema'

const toDto = ({ amountCents, ...rest }: typeof plannedExpenses.$inferSelect): PlannedExpense => ({
  ...rest,
  amount: amountCents / 100,
})

type Body = { name: string; amount: number; currency: Currency; months: number | null; active: boolean }
const body = {
  type: 'object',
  required: ['name', 'amount', 'currency', 'months', 'active'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    amount: { type: 'number', exclusiveMinimum: 0 },
    currency: { type: 'string', enum: currencies },
    months: { type: ['integer', 'null'], minimum: 1, maximum: 120 },
    active: { type: 'boolean' },
  },
}
const params = { type: 'object', properties: { id: { type: 'integer' } } }
const toRow = ({ amount, ...rest }: Body) => ({ ...rest, amountCents: Math.round(amount * 100) })

const plannedExpensesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => {
    const rows = await fastify.db.select().from(plannedExpenses).orderBy(plannedExpenses.id)
    return rows.map(toDto)
  })

  fastify.post<{ Body: Body }>('/', { schema: { body } }, async (request, reply) => {
    const [row] = await fastify.db.insert(plannedExpenses).values(toRow(request.body)).returning()
    return reply.code(201).send(toDto(row))
  })

  fastify.put<{ Params: { id: number }; Body: Body }>('/:id', { schema: { params, body } }, async (request, reply) => {
    const [row] = await fastify.db
      .update(plannedExpenses)
      .set(toRow(request.body))
      .where(eq(plannedExpenses.id, request.params.id))
      .returning()
    if (!row) return reply.notFound()
    return toDto(row)
  })

  fastify.delete<{ Params: { id: number } }>('/:id', { schema: { params } }, async (request, reply) => {
    const [row] = await fastify.db.delete(plannedExpenses).where(eq(plannedExpenses.id, request.params.id)).returning()
    if (!row) return reply.notFound()
    return reply.code(204).send()
  })
}

export default plannedExpensesRoutes
