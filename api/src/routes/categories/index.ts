import { type FastifyPluginAsync } from 'fastify'
import { eq } from 'drizzle-orm'
import { categories, categoryIds, merchantKey, type CategoryId } from '../../categories'
import { merchantCategories, transactions } from '../../db/schema'

const categoriesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => categories.map(({ id, label, emoji }) => ({ id, label, emoji })))

  // category: null drops the override and goes back to the automatic one
  fastify.put<{ Body: { description: string, category: CategoryId | null } }>('/merchants', {
    schema: {
      body: {
        type: 'object',
        required: ['description', 'category'],
        additionalProperties: false,
        properties: {
          description: { type: 'string', minLength: 1, maxLength: 1000 },
          category: { type: ['string', 'null'], enum: [...categoryIds, null] }
        }
      }
    }
  }, async (request, reply) => {
    const { description, category } = request.body
    const merchant = merchantKey(description)
    if (category === null) {
      await fastify.db.delete(merchantCategories).where(eq(merchantCategories.merchant, merchant))
    } else {
      await fastify.db.insert(merchantCategories).values({ merchant, category })
        .onConflictDoUpdate({ target: merchantCategories.merchant, set: { category } })
    }
    return reply.code(204).send()
  })

  // category: null drops the transaction's own category, falling back to the merchant's
  fastify.put<{ Params: { id: number }, Body: { category: CategoryId | null } }>('/transactions/:id', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'integer' } } },
      body: {
        type: 'object',
        required: ['category'],
        additionalProperties: false,
        properties: { category: { type: ['string', 'null'], enum: [...categoryIds, null] } }
      }
    }
  }, async (request, reply) => {
    const [row] = await fastify.db.update(transactions).set({ category: request.body.category })
      .where(eq(transactions.id, request.params.id)).returning()
    if (!row) return reply.notFound()
    return reply.code(204).send()
  })
}

export default categoriesRoutes
