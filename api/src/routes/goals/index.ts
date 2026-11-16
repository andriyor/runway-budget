import { type FastifyPluginAsync } from 'fastify'
import type { Goal } from '@runway-budget/shared'
import { eq } from 'drizzle-orm'
import { goals, currencies, type Currency } from '../../db/schema'

type GoalRow = typeof goals.$inferSelect

const toDto = ({ targetCents, ...rest }: GoalRow): Goal => ({ ...rest, target: targetCents / 100 })

type GoalBody = { name: string, target: number, currency: Currency }
const body = {
  type: 'object',
  required: ['name', 'target', 'currency'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    target: { type: 'number', exclusiveMinimum: 0 },
    currency: { type: 'string', enum: currencies }
  }
}
const params = { type: 'object', properties: { id: { type: 'integer' } } }
const toRow = ({ name, target, currency }: GoalBody) => ({ name, currency, targetCents: Math.round(target * 100) })

const goalsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => {
    const rows = await fastify.db.select().from(goals).orderBy(goals.id)
    return rows.map(toDto)
  })

  fastify.post<{ Body: GoalBody }>('/', { schema: { body } }, async (request, reply) => {
    const [row] = await fastify.db.insert(goals).values(toRow(request.body)).returning()
    return reply.code(201).send(toDto(row))
  })

  // replaces a goal's name, target and currency
  fastify.put<{ Params: { id: number }, Body: GoalBody }>('/:id', { schema: { params, body } }, async (request, reply) => {
    const [row] = await fastify.db.update(goals).set(toRow(request.body)).where(eq(goals.id, request.params.id)).returning()
    if (!row) return reply.notFound()
    return toDto(row)
  })

  fastify.delete<{ Params: { id: number } }>('/:id', { schema: { params } }, async (request, reply) => {
    const [row] = await fastify.db.delete(goals).where(eq(goals.id, request.params.id)).returning()
    if (!row) return reply.notFound()
    return reply.code(204).send()
  })
}

export default goalsRoutes
