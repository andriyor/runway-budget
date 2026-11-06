import { type FastifyPluginAsync } from 'fastify'
import type { Goal } from '@runway-budget/shared'
import { eq } from 'drizzle-orm'
import { goals, currencies, type Currency } from '../../db/schema'

type GoalRow = typeof goals.$inferSelect

const toDto = ({ targetCents, ...rest }: GoalRow): Goal => ({ ...rest, target: targetCents / 100 })

const goalsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => {
    const rows = await fastify.db.select().from(goals).orderBy(goals.id)
    return rows.map(toDto)
  })

  fastify.post<{ Body: { name: string, target: number, currency: Currency } }>('/', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'target', 'currency'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          target: { type: 'number', exclusiveMinimum: 0 },
          currency: { type: 'string', enum: currencies }
        }
      }
    }
  }, async (request, reply) => {
    const { name, target, currency } = request.body
    const [row] = await fastify.db.insert(goals)
      .values({ name, currency, targetCents: Math.round(target * 100) })
      .returning()
    return reply.code(201).send(toDto(row))
  })

  fastify.delete<{ Params: { id: number } }>('/:id', {
    schema: { params: { type: 'object', properties: { id: { type: 'integer' } } } }
  }, async (request, reply) => {
    const [row] = await fastify.db.delete(goals).where(eq(goals.id, request.params.id)).returning()
    if (!row) return reply.notFound()
    return reply.code(204).send()
  })
}

export default goalsRoutes
