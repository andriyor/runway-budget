import { type FastifyPluginAsync } from 'fastify'
import { eq } from 'drizzle-orm'
import { categories, categoryIds, merchantKey, type CategoryId } from '../../categories'
import { merchantCategories } from '../../db/schema'

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
}

export default categoriesRoutes
