import { type FastifyPluginAsync } from 'fastify'
import type { BoughtWish, Goal } from '@runway-budget/shared'
import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm'
import { accounts, goals, currencies, transactions, type Currency } from '../../db/schema'
import { categoryTree } from '../../categories'

type GoalRow = typeof goals.$inferSelect

const toDto = ({
  targetCents,
  position: _position,
  addedAt,
  matchAfter,
  boughtAt: _boughtAt,
  boughtTransactionId: _boughtTransactionId,
  ...rest
}: GoalRow): Goal => ({
  ...rest,
  target: targetCents / 100,
  addedAt: addedAt.toISOString(),
  matchAfter: matchAfter?.toISOString() ?? null,
})

const spendingCategories = categoryTree.filter((c) => c.spending).map((c) => c.id)

// wish defaults to false when adding and stays as it is when editing; so do plannedFor, category and matchAfter,
// which null clears
type GoalBody = {
  name: string
  target: number
  currency: Currency
  wish?: boolean
  plannedFor?: string | null
  category?: string | null
  matchAfter?: string | null
}
const body = {
  type: 'object',
  required: ['name', 'target', 'currency'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    target: { type: 'number', exclusiveMinimum: 0 },
    currency: { type: 'string', enum: currencies },
    wish: { type: 'boolean' },
    plannedFor: { type: ['string', 'null'], pattern: '^[0-9]{4}-(0[1-9]|1[0-2])$' },
    category: { type: ['string', 'null'], enum: [...spendingCategories, null] },
    matchAfter: { type: ['string', 'null'], format: 'date-time' },
  },
}
const params = { type: 'object', properties: { id: { type: 'integer' } } }
const toRow = ({ name, target, currency, wish, plannedFor, category, matchAfter }: GoalBody) => ({
  name,
  currency,
  wish,
  plannedFor,
  category,
  matchAfter: matchAfter === undefined ? undefined : matchAfter === null ? null : new Date(matchAfter),
  targetCents: Math.round(target * 100),
})

const goalsRoutes: FastifyPluginAsync = async (fastify) => {
  // goals and the wishes still wanted; bought wishes are only in /bought
  fastify.get('/', async () => {
    const rows = await fastify.db.select().from(goals).where(isNull(goals.boughtAt)).orderBy(goals.position, goals.id)
    return rows.map(toDto)
  })

  // the wishes bought, newest first, with the purchase they were bought in
  fastify.get('/bought', async (): Promise<BoughtWish[]> => {
    const rows = await fastify.db
      .select({ goal: goals, purchase: transactions, currency: accounts.currency })
      .from(goals)
      .leftJoin(transactions, eq(transactions.id, goals.boughtTransactionId))
      .leftJoin(accounts, eq(accounts.id, transactions.accountId))
      .where(isNotNull(goals.boughtAt))
      .orderBy(desc(goals.boughtAt), desc(goals.id))
    return rows.map(({ goal, purchase, currency }) => ({
      id: goal.id,
      name: goal.name,
      target: goal.targetCents / 100,
      currency: goal.currency,
      boughtAt: goal.boughtAt!.toISOString(),
      purchase:
        purchase && currency
          ? {
              id: purchase.id,
              description: purchase.description,
              time: purchase.time.toISOString(),
              amount: purchase.amountCents / 100,
              currency,
            }
          : null,
    }))
  })

  // marks a wish bought in that transaction (null: without one), which takes it out of the plan; bought: false
  // puts it back on the list, in its old place
  fastify.put<{ Params: { id: number }; Body: { bought: boolean; transactionId?: number | null } }>(
    '/:id/bought',
    {
      schema: {
        params,
        body: {
          type: 'object',
          required: ['bought'],
          additionalProperties: false,
          properties: { bought: { type: 'boolean' }, transactionId: { type: ['integer', 'null'] } },
        },
      },
    },
    async (request, reply) => {
      const { bought, transactionId = null } = request.body
      if (bought && transactionId !== null) {
        const exists = fastify.db
          .select({ id: transactions.id })
          .from(transactions)
          .where(eq(transactions.id, transactionId))
          .get()
        if (!exists) return reply.badRequest('No such transaction')
      }
      const [row] = await fastify.db
        .update(goals)
        .set(
          bought
            ? { boughtAt: new Date(), boughtTransactionId: transactionId }
            : { boughtAt: null, boughtTransactionId: null },
        )
        .where(and(eq(goals.id, request.params.id), eq(goals.wish, true)))
        .returning()
      if (!row) return reply.notFound()
      return reply.code(204).send()
    },
  )

  fastify.post<{ Body: GoalBody }>('/', { schema: { body } }, async (request, reply) => {
    // a new goal goes last, so it waits for every existing one
    const position = sql`(select coalesce(max(${goals.position}), -1) + 1 from ${goals})`
    const [row] = await fastify.db
      .insert(goals)
      .values({ ...toRow(request.body), position, addedAt: new Date() })
      .returning()
    return reply.code(201).send(toDto(row))
  })

  // body is every goal and wish id in the desired order
  fastify.put<{ Body: { ids: number[] } }>(
    '/order',
    {
      schema: {
        body: {
          type: 'object',
          required: ['ids'],
          additionalProperties: false,
          properties: { ids: { type: 'array', items: { type: 'integer' }, uniqueItems: true } },
        },
      },
    },
    async (request, reply) => {
      const { ids } = request.body
      const existing = (await fastify.db.select({ id: goals.id }).from(goals).where(isNull(goals.boughtAt))).map(
        (g) => g.id,
      )
      const sameSet = ids.length === existing.length && existing.every((id) => ids.includes(id))
      if (!sameSet) return reply.badRequest('ids must list every goal and wish exactly once')

      fastify.db.transaction((tx) => {
        ids.forEach((id, position) => tx.update(goals).set({ position }).where(eq(goals.id, id)).run())
      })
      return reply.code(204).send()
    },
  )

  // replaces a goal's name, target and currency, and its wish flag, planned month, category and matchAfter when given
  fastify.put<{ Params: { id: number }; Body: GoalBody }>(
    '/:id',
    { schema: { params, body } },
    async (request, reply) => {
      const [row] = await fastify.db
        .update(goals)
        .set(toRow(request.body))
        .where(eq(goals.id, request.params.id))
        .returning()
      if (!row) return reply.notFound()
      return toDto(row)
    },
  )

  fastify.delete<{ Params: { id: number } }>('/:id', { schema: { params } }, async (request, reply) => {
    const [row] = await fastify.db.delete(goals).where(eq(goals.id, request.params.id)).returning()
    if (!row) return reply.notFound()
    return reply.code(204).send()
  })
}

export default goalsRoutes
