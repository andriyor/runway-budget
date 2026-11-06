import { type FastifyPluginAsync } from 'fastify'
import { budget, currencies, type Currency } from '../../db/schema'

type BudgetInput = { monthlySpend: number, currency: Currency }

const toDto = (row?: typeof budget.$inferSelect) =>
  row ? { monthlySpend: row.monthlySpendCents / 100, currency: row.currency } : null

const budgetRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => {
    const [row] = await fastify.db.select().from(budget).limit(1)
    return toDto(row)
  })

  fastify.put<{ Body: BudgetInput }>('/', {
    schema: {
      body: {
        type: 'object',
        required: ['monthlySpend', 'currency'],
        additionalProperties: false,
        properties: {
          monthlySpend: { type: 'number', exclusiveMinimum: 0 },
          currency: { type: 'string', enum: currencies }
        }
      }
    }
  }, async (request) => {
    const values = {
      monthlySpendCents: Math.round(request.body.monthlySpend * 100),
      currency: request.body.currency
    }
    const [row] = await fastify.db.insert(budget)
      .values({ id: 1, ...values })
      .onConflictDoUpdate({ target: budget.id, set: values })
      .returning()
    return toDto(row)
  })
}

export default budgetRoutes
