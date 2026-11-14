import { type FastifyPluginAsync } from 'fastify'
import type { CategoryBudget } from '@runway-budget/shared'
import { eq } from 'drizzle-orm'
import { categoryTree } from '../../categories'
import { categoryBudgets, currencies, type Currency } from '../../db/schema'

// caps apply to top-level categories that count as spending, like the Spending page's rows
const budgetable = categoryTree.filter((c) => c.spending).map((c) => c.id)

const toDto = ({ amountCents, ...rest }: typeof categoryBudgets.$inferSelect): CategoryBudget => ({ ...rest, amount: amountCents / 100 })

const params = { type: 'object', properties: { category: { type: 'string', enum: budgetable } } }

const categoryBudgetRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => {
    const rows = await fastify.db.select().from(categoryBudgets)
    return rows.map(toDto)
  })

  // sets or replaces the category's cap
  fastify.put<{ Params: { category: string }, Body: { amount: number, currency: Currency } }>('/:category', {
    schema: {
      params,
      body: {
        type: 'object',
        required: ['amount', 'currency'],
        additionalProperties: false,
        properties: {
          amount: { type: 'number', exclusiveMinimum: 0 },
          currency: { type: 'string', enum: currencies }
        }
      }
    }
  }, async (request) => {
    const values = { amountCents: Math.round(request.body.amount * 100), currency: request.body.currency }
    const [row] = await fastify.db.insert(categoryBudgets)
      .values({ category: request.params.category, ...values })
      .onConflictDoUpdate({ target: categoryBudgets.category, set: values })
      .returning()
    return toDto(row)
  })

  fastify.delete<{ Params: { category: string } }>('/:category', { schema: { params } }, async (request, reply) => {
    const [row] = await fastify.db.delete(categoryBudgets).where(eq(categoryBudgets.category, request.params.category)).returning()
    if (!row) return reply.notFound()
    return reply.code(204).send()
  })
}

export default categoryBudgetRoutes
