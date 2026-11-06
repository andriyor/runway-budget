import { type FastifyPluginAsync } from 'fastify'
import { budget, currencies, type Currency } from '../../db/schema'

type BudgetInput = { monthlySpend: number, currency: Currency, salary?: number, salaryCurrency?: Currency }

const toDto = (row?: typeof budget.$inferSelect) =>
  row
    ? {
        monthlySpend: row.monthlySpendCents / 100,
        currency: row.currency,
        salary: row.salaryCents === null ? null : row.salaryCents / 100,
        salaryCurrency: row.salaryCurrency
      }
    : null

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
          currency: { type: 'string', enum: currencies },
          salary: { type: 'number', minimum: 0 },
          salaryCurrency: { type: 'string', enum: currencies }
        },
        dependencies: { salary: ['salaryCurrency'] }
      }
    }
  }, async (request) => {
    const { monthlySpend, currency, salary, salaryCurrency } = request.body
    const hasSalary = salary !== undefined
    const values = {
      monthlySpendCents: Math.round(monthlySpend * 100),
      currency,
      // omitted salary clears it
      salaryCents: hasSalary ? Math.round(salary * 100) : null,
      salaryCurrency: hasSalary ? salaryCurrency! : null
    }
    const [row] = await fastify.db.insert(budget)
      .values({ id: 1, ...values })
      .onConflictDoUpdate({ target: budget.id, set: values })
      .returning()
    return toDto(row)
  })
}

export default budgetRoutes
