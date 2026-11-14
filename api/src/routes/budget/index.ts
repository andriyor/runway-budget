import { type FastifyPluginAsync } from 'fastify'
import type { Budget, Income } from '@runway-budget/shared'
import { budget, currencies, type Currency } from '../../db/schema'

type IncomeInput = Omit<Income, 'keeps'> & { keeps?: boolean }

type BudgetInput = {
  monthlySpend: number
  currency: Currency
  incomes?: IncomeInput[]
  reserve?: number
  reserveCurrency?: Currency
  minimalSpend?: number
  minimalSpendCurrency?: Currency
  targetMonths?: number
}

const fromCents = (cents: number | null) => cents === null ? null : cents / 100
// omitted amount clears the pair
const toCents = (amount?: number) => amount === undefined ? null : Math.round(amount * 100)

const toDto = (row?: typeof budget.$inferSelect): Budget | null =>
  row
    ? {
        monthlySpend: row.monthlySpendCents / 100,
        currency: row.currency,
        incomes: row.incomes.map(({ amountCents, keeps = false, ...rest }) => ({ ...rest, amount: amountCents / 100, keeps })),
        reserve: fromCents(row.reserveCents),
        reserveCurrency: row.reserveCurrency,
        minimalSpend: fromCents(row.minimalSpendCents),
        minimalSpendCurrency: row.minimalSpendCurrency,
        targetMonths: row.targetMonths
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
          incomes: {
            type: 'array',
            maxItems: 20,
            items: {
              type: 'object',
              required: ['name', 'amount', 'currency'],
              additionalProperties: false,
              properties: {
                name: { type: 'string', minLength: 1, maxLength: 100 },
                amount: { type: 'number', exclusiveMinimum: 0 },
                currency: { type: 'string', enum: currencies },
                keeps: { type: 'boolean' }
              }
            }
          },
          reserve: { type: 'number', minimum: 0 },
          reserveCurrency: { type: 'string', enum: currencies },
          minimalSpend: { type: 'number', exclusiveMinimum: 0 },
          minimalSpendCurrency: { type: 'string', enum: currencies },
          targetMonths: { type: 'integer', minimum: 1 }
        },
        dependencies: {
          reserve: ['reserveCurrency'],
          minimalSpend: ['minimalSpendCurrency']
        }
      }
    }
  }, async (request) => {
    const { monthlySpend, currency, incomes = [], reserve, reserveCurrency, minimalSpend, minimalSpendCurrency, targetMonths } = request.body
    const values = {
      monthlySpendCents: Math.round(monthlySpend * 100),
      currency,
      incomes: incomes.map(({ amount, keeps = false, ...rest }) => ({ ...rest, amountCents: Math.round(amount * 100), keeps })),
      reserveCents: toCents(reserve),
      reserveCurrency: reserve === undefined ? null : reserveCurrency!,
      minimalSpendCents: toCents(minimalSpend),
      minimalSpendCurrency: minimalSpend === undefined ? null : minimalSpendCurrency!,
      targetMonths: targetMonths ?? null
    }
    const [row] = await fastify.db.insert(budget)
      .values({ id: 1, ...values })
      .onConflictDoUpdate({ target: budget.id, set: values })
      .returning()
    return toDto(row)
  })
}

export default budgetRoutes
