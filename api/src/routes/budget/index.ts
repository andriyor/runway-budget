import { type FastifyPluginAsync } from 'fastify'
import { budget, currencies, type Currency } from '../../db/schema'

type BudgetInput = {
  monthlySpend: number
  currency: Currency
  salary?: number
  salaryCurrency?: Currency
  reserve?: number
  reserveCurrency?: Currency
  minimalSpend?: number
  minimalSpendCurrency?: Currency
}

const fromCents = (cents: number | null) => cents === null ? null : cents / 100
// omitted amount clears the pair
const toCents = (amount?: number) => amount === undefined ? null : Math.round(amount * 100)

const toDto = (row?: typeof budget.$inferSelect) =>
  row
    ? {
        monthlySpend: row.monthlySpendCents / 100,
        currency: row.currency,
        salary: fromCents(row.salaryCents),
        salaryCurrency: row.salaryCurrency,
        reserve: fromCents(row.reserveCents),
        reserveCurrency: row.reserveCurrency,
        minimalSpend: fromCents(row.minimalSpendCents),
        minimalSpendCurrency: row.minimalSpendCurrency
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
          salaryCurrency: { type: 'string', enum: currencies },
          reserve: { type: 'number', minimum: 0 },
          reserveCurrency: { type: 'string', enum: currencies },
          minimalSpend: { type: 'number', exclusiveMinimum: 0 },
          minimalSpendCurrency: { type: 'string', enum: currencies }
        },
        dependencies: {
          salary: ['salaryCurrency'],
          reserve: ['reserveCurrency'],
          minimalSpend: ['minimalSpendCurrency']
        }
      }
    }
  }, async (request) => {
    const { monthlySpend, currency, salary, salaryCurrency, reserve, reserveCurrency, minimalSpend, minimalSpendCurrency } = request.body
    const values = {
      monthlySpendCents: Math.round(monthlySpend * 100),
      currency,
      salaryCents: toCents(salary),
      salaryCurrency: salary === undefined ? null : salaryCurrency!,
      reserveCents: toCents(reserve),
      reserveCurrency: reserve === undefined ? null : reserveCurrency!,
      minimalSpendCents: toCents(minimalSpend),
      minimalSpendCurrency: minimalSpend === undefined ? null : minimalSpendCurrency!
    }
    const [row] = await fastify.db.insert(budget)
      .values({ id: 1, ...values })
      .onConflictDoUpdate({ target: budget.id, set: values })
      .returning()
    return toDto(row)
  })
}

export default budgetRoutes
