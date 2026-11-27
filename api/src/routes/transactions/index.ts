import { type FastifyPluginAsync } from 'fastify'
import { eq, sql } from 'drizzle-orm'
import { accounts, transactions } from '../../db/schema'
import { transferId } from '../../transactions'

const transactionsRoutes: FastifyPluginAsync = async (fastify) => {
  // an empty or blank note clears it; essential: null falls back to the merchant's or category's flag
  fastify.patch<{ Params: { id: number }; Body: { note?: string | null; essential?: boolean | null } }>(
    '/:id',
    {
      schema: {
        params: { type: 'object', properties: { id: { type: 'integer' } } },
        body: {
          type: 'object',
          minProperties: 1,
          additionalProperties: false,
          properties: {
            note: { type: ['string', 'null'], maxLength: 1000 },
            essential: { type: ['boolean', 'null'] },
          },
        },
      },
    },
    async (request, reply) => {
      const { note, essential } = request.body
      const [row] = await fastify.db
        .update(transactions)
        .set({
          ...(note !== undefined && { note: note?.trim() || null }),
          ...(essential !== undefined && { essential }),
        })
        .where(eq(transactions.id, request.params.id))
        .returning({ note: transactions.note, essential: transactions.essential })
      if (!row) return reply.notFound()
      return row
    },
  )

  // links the transaction to an account without sync, such as cash: that account gets the opposite entry
  // (externalId transfer:<id>) and its balance moves by it, and the transaction becomes «між своїми
  // рахунками». accountId: null unlinks, undoing both. Relinking moves the entry to the new account.
  fastify.put<{ Params: { id: number }; Body: { accountId: number | null } }>(
    '/:id/transfer',
    {
      schema: {
        params: { type: 'object', properties: { id: { type: 'integer' } } },
        body: {
          type: 'object',
          required: ['accountId'],
          additionalProperties: false,
          properties: { accountId: { type: ['integer', 'null'] } },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params
      const { accountId } = request.body
      const source = fastify.db.select().from(transactions).where(eq(transactions.id, id)).get()
      if (!source) return reply.notFound()
      if (source.externalId.startsWith('transfer:')) return reply.badRequest('Change the transfer from its other side')
      if (accountId !== null) {
        const from = fastify.db.select().from(accounts).where(eq(accounts.id, source.accountId)).get()!
        const to = fastify.db.select().from(accounts).where(eq(accounts.id, accountId)).get()
        if (!to) return reply.badRequest('No such account')
        if (to.id === from.id) return reply.badRequest('Pick another account')
        if (to.monoAccountId) return reply.badRequest('Synced accounts take their balance from the bank')
        // shortcut: no conversion, so a transfer needs one currency; add rates here if cross-currency is needed
        if (to.currency !== from.currency) return reply.badRequest(`The account must be in ${from.currency}`)
      }
      fastify.db.transaction((tx) => {
        const mirror = tx
          .select()
          .from(transactions)
          .where(eq(transactions.externalId, transferId(id)))
          .get()
        if (mirror) {
          tx.update(accounts)
            .set({ balanceCents: sql`${accounts.balanceCents} - ${mirror.amountCents}` })
            .where(eq(accounts.id, mirror.accountId))
            .run()
          tx.delete(transactions).where(eq(transactions.id, mirror.id)).run()
        }
        if (accountId === null) {
          if (source.category === 'own')
            tx.update(transactions).set({ category: null }).where(eq(transactions.id, id)).run()
          return
        }
        const from = tx.select().from(accounts).where(eq(accounts.id, source.accountId)).get()!
        tx.insert(transactions)
          .values({
            accountId,
            externalId: transferId(id),
            time: source.time,
            description: `${source.amountCents < 0 ? 'З' : 'На'} ${from.name}: ${source.description}`,
            mcc: 0,
            amountCents: -source.amountCents,
            category: 'own',
          })
          .run()
        tx.update(accounts)
          .set({ balanceCents: sql`${accounts.balanceCents} - ${source.amountCents}` })
          .where(eq(accounts.id, accountId))
          .run()
        tx.update(transactions).set({ category: 'own' }).where(eq(transactions.id, id)).run()
      })
      return reply.code(204).send()
    },
  )
}

export default transactionsRoutes
