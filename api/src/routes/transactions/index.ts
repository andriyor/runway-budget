import { type FastifyPluginAsync } from 'fastify'
import { eq } from 'drizzle-orm'
import { transactions } from '../../db/schema'

const transactionsRoutes: FastifyPluginAsync = async (fastify) => {
  // an empty or blank note clears it
  fastify.patch<{ Params: { id: number }, Body: { note: string | null } }>('/:id', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'integer' } } },
      body: {
        type: 'object',
        required: ['note'],
        additionalProperties: false,
        properties: { note: { type: ['string', 'null'], maxLength: 1000 } }
      }
    }
  }, async (request, reply) => {
    const note = request.body.note?.trim() || null
    const [row] = await fastify.db.update(transactions).set({ note })
      .where(eq(transactions.id, request.params.id)).returning({ note: transactions.note })
    if (!row) return reply.notFound()
    return row
  })
}

export default transactionsRoutes
