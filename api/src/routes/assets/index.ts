import { type FastifyPluginAsync } from 'fastify'
import type { Asset } from '@runway-budget/shared'
import { eq } from 'drizzle-orm'
import { assets, currencies, type Currency } from '../../db/schema'

const toDto = ({ valueCents, ...rest }: typeof assets.$inferSelect): Asset => ({ ...rest, value: valueCents / 100 })

type AssetBody = { name: string; value: number; currency: Currency; discount: number; sellable: boolean }
const body = {
  type: 'object',
  required: ['name', 'value', 'currency', 'discount', 'sellable'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    value: { type: 'number', exclusiveMinimum: 0 },
    currency: { type: 'string', enum: currencies },
    discount: { type: 'integer', minimum: 0, maximum: 90 },
    sellable: { type: 'boolean' },
  },
}
const params = { type: 'object', properties: { id: { type: 'integer' } } }
const toRow = ({ value, ...rest }: AssetBody) => ({ ...rest, valueCents: Math.round(value * 100) })

const assetsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => {
    const rows = await fastify.db.select().from(assets).orderBy(assets.id)
    return rows.map(toDto)
  })

  fastify.post<{ Body: AssetBody }>('/', { schema: { body } }, async (request, reply) => {
    const [row] = await fastify.db.insert(assets).values(toRow(request.body)).returning()
    return reply.code(201).send(toDto(row))
  })

  fastify.put<{ Params: { id: number }; Body: AssetBody }>(
    '/:id',
    { schema: { params, body } },
    async (request, reply) => {
      const [row] = await fastify.db
        .update(assets)
        .set(toRow(request.body))
        .where(eq(assets.id, request.params.id))
        .returning()
      if (!row) return reply.notFound()
      return toDto(row)
    },
  )

  fastify.delete<{ Params: { id: number } }>('/:id', { schema: { params } }, async (request, reply) => {
    const [row] = await fastify.db.delete(assets).where(eq(assets.id, request.params.id)).returning()
    if (!row) return reply.notFound()
    return reply.code(204).send()
  })
}

export default assetsRoutes
