import { type FastifyPluginAsync } from 'fastify'
import { desc, eq, isNotNull, or } from 'drizzle-orm'
import type { CategoryRules } from '@runway-budget/shared'
import { categoryIds, categoryTree, merchantKey, type CategoryId } from '../../categories'
import { accounts, merchantCategories, merchantEssentials, transactions } from '../../db/schema'

const categoriesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => categoryTree)

  fastify.get('/rules', async (): Promise<CategoryRules> => {
    const rules = new Map<string, { category: string | null; essential: boolean | null }>()
    for (const r of await fastify.db.select().from(merchantCategories))
      rules.set(r.merchant, { category: r.category, essential: null })
    for (const r of await fastify.db.select().from(merchantEssentials))
      rules.set(r.merchant, { category: rules.get(r.merchant)?.category ?? null, essential: r.essential })
    // newest first, so the first description seen for a merchant is its latest; a refund's only if nothing else
    const seen = new Map<string, { description: string; count: number }>()
    const all = await fastify.db
      .select({ description: transactions.description })
      .from(transactions)
      .orderBy(desc(transactions.time))
    for (const { description } of all) {
      const key = merchantKey(description)
      if (!rules.has(key)) continue
      const s = seen.get(key) ?? { description, count: 0 }
      if (/^скасування\./i.test(s.description)) s.description = description
      s.count++
      seen.set(key, s)
    }
    const own = await fastify.db
      .select({
        id: transactions.id,
        accountId: transactions.accountId,
        description: transactions.description,
        time: transactions.time,
        amountCents: transactions.amountCents,
        currency: accounts.currency,
        category: transactions.category,
        essential: transactions.essential,
      })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .where(or(isNotNull(transactions.category), isNotNull(transactions.essential)))
      .orderBy(desc(transactions.time), desc(transactions.id))
    return {
      merchants: [...rules]
        .map(([merchant, rule]) => ({
          merchant,
          description: seen.get(merchant)?.description ?? merchant,
          ...rule,
          transactionCount: seen.get(merchant)?.count ?? 0,
        }))
        .sort((a, b) => b.transactionCount - a.transactionCount || a.description.localeCompare(b.description)),
      transactions: own.map(({ amountCents, time, ...t }) => ({
        ...t,
        time: time.toISOString(),
        amount: amountCents / 100,
      })),
    }
  })

  // category: null drops the override and goes back to the automatic one
  fastify.put<{ Body: { description: string; category: CategoryId | null } }>(
    '/merchants',
    {
      schema: {
        body: {
          type: 'object',
          required: ['description', 'category'],
          additionalProperties: false,
          properties: {
            description: { type: 'string', minLength: 1, maxLength: 1000 },
            category: { type: ['string', 'null'], enum: [...categoryIds, null] },
          },
        },
      },
    },
    async (request, reply) => {
      const { description, category } = request.body
      const merchant = merchantKey(description)
      if (category === null) {
        await fastify.db.delete(merchantCategories).where(eq(merchantCategories.merchant, merchant))
      } else {
        await fastify.db
          .insert(merchantCategories)
          .values({ merchant, category })
          .onConflictDoUpdate({ target: merchantCategories.merchant, set: { category } })
      }
      return reply.code(204).send()
    },
  )

  // essential: null drops the merchant's flag, back to each transaction's category default
  fastify.put<{ Body: { description: string; essential: boolean | null } }>(
    '/merchants/essential',
    {
      schema: {
        body: {
          type: 'object',
          required: ['description', 'essential'],
          additionalProperties: false,
          properties: {
            description: { type: 'string', minLength: 1, maxLength: 1000 },
            essential: { type: ['boolean', 'null'] },
          },
        },
      },
    },
    async (request, reply) => {
      const { description, essential } = request.body
      const merchant = merchantKey(description)
      if (essential === null) {
        await fastify.db.delete(merchantEssentials).where(eq(merchantEssentials.merchant, merchant))
      } else {
        await fastify.db
          .insert(merchantEssentials)
          .values({ merchant, essential })
          .onConflictDoUpdate({ target: merchantEssentials.merchant, set: { essential } })
      }
      return reply.code(204).send()
    },
  )

  // category: null drops the transaction's own category, falling back to the merchant's
  fastify.put<{ Params: { id: number }; Body: { category: CategoryId | null } }>(
    '/transactions/:id',
    {
      schema: {
        params: { type: 'object', properties: { id: { type: 'integer' } } },
        body: {
          type: 'object',
          required: ['category'],
          additionalProperties: false,
          properties: { category: { type: ['string', 'null'], enum: [...categoryIds, null] } },
        },
      },
    },
    async (request, reply) => {
      const [row] = await fastify.db
        .update(transactions)
        .set({ category: request.body.category })
        .where(eq(transactions.id, request.params.id))
        .returning()
      if (!row) return reply.notFound()
      return reply.code(204).send()
    },
  )
}

export default categoriesRoutes
