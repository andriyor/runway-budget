import { type FastifyPluginAsync } from 'fastify'
import type { Goal } from '@runway-budget/shared'
import { eq, sql } from 'drizzle-orm'
import { goals, currencies, type Currency } from '../../db/schema'

type GoalRow = typeof goals.$inferSelect

const toDto = ({ targetCents, position: _position, ...rest }: GoalRow): Goal => ({ ...rest, target: targetCents / 100 })

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
    const rows = await fastify.db.select().from(goals).orderBy(goals.position, goals.id)
    return rows.map(toDto)
  })

  fastify.post<{ Body: GoalBody }>('/', { schema: { body } }, async (request, reply) => {
    // a new goal goes last, so it waits for every existing one
    const position = sql`(select coalesce(max(${goals.position}), -1) + 1 from ${goals})`
    const [row] = await fastify.db.insert(goals).values({ ...toRow(request.body), position }).returning()
    return reply.code(201).send(toDto(row))
  })

  // body is every goal id in the desired order
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
    const existing = (await fastify.db.select({ id: goals.id }).from(goals)).map((g) => g.id)
    const sameSet = ids.length === existing.length && existing.every((id) => ids.includes(id))
    if (!sameSet) return reply.badRequest('ids must list every goal exactly once')

    fastify.db.transaction((tx) => {
      ids.forEach((id, position) => tx.update(goals).set({ position }).where(eq(goals.id, id)).run())
    })
    return reply.code(204).send()
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
