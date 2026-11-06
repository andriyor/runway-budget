import { type FastifyPluginAsync } from 'fastify'
import { eq } from 'drizzle-orm'
import { transactions } from '../../db/schema'

const transactionsRoutes: FastifyPluginAsync = async (fastify) => {
  // an empty or blank note clears it; essential: null falls back to the merchant's or category's flag
  fastify.patch<{ Params: { id: number }, Body: { note?: string | null, essential?: boolean | null } }>('/:id', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'integer' } } },
      body: {
        type: 'object',
        minProperties: 1,
        additionalProperties: false,
        properties: {
          note: { type: ['string', 'null'], maxLength: 1000 },
          essential: { type: ['boolean', 'null'] }
        }
      }
    }
  }, async (request, reply) => {
    const { note, essential } = request.body
    const [row] = await fastify.db.update(transactions)
      .set({
        ...(note !== undefined && { note: note?.trim() || null }),
        ...(essential !== undefined && { essential })
      })
      .where(eq(transactions.id, request.params.id)).returning({ note: transactions.note, essential: transactions.essential })
    if (!row) return reply.notFound()
    return row
  })
}

export default transactionsRoutes
