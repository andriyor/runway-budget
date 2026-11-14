import { type FastifyPluginAsync } from 'fastify'
import type { Inflation } from '@runway-budget/shared'

// every price statistic the NBU publishes for the months in range; the all-items CPI is filtered out of it
const NBU_URL = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/inflation'
// published monthly, so a day is fresh enough
const TTL_MS = 24 * 60 * 60 * 1000

type Row = { dt: string, id_api: string, mcrd081: string, ku: string | null, tzep: string, value: number }

// ponytail: in-memory per `from`; a table if refetching a few MB per day ever matters
const cache = new Map<string, { at: number, value: Inflation }>()

async function fetchCpi (from: string): Promise<Inflation> {
  const now = new Date()
  const query = new URLSearchParams({
    start: `${from.replace('-', '')}01`,
    end: `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}01`,
    period: 'm',
    json: ''
  })
  const res = await fetch(`${NBU_URL}?${query}`)
  if (!res.ok) throw new Error(`NBU responded ${res.status}`)
  const rows = await res.json() as Row[]
  const cpi: Inflation = {}
  // all items (Total), the whole country (no region code), change from the previous month (PCPM_)
  for (const r of rows) {
    if (r.id_api === 'prices_price_cpi_' && r.mcrd081 === 'Total' && r.ku === null && r.tzep === 'PCPM_') {
      cpi[`${r.dt.slice(0, 4)}-${r.dt.slice(4, 6)}`] = r.value
    }
  }
  return cpi
}

const inflationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: { from: string } }>('/', {
    schema: {
      querystring: {
        type: 'object',
        required: ['from'],
        additionalProperties: false,
        properties: { from: { type: 'string', pattern: '^(199[6-9]|20\\d{2})-(0[1-9]|1[0-2])$' } }
      }
    }
  }, async (request, reply) => {
    const { from } = request.query
    const cached = cache.get(from)
    if (cached && Date.now() - cached.at < TTL_MS) return cached.value
    try {
      const value = await fetchCpi(from)
      cache.set(from, { at: Date.now(), value })
      return value
    } catch (err) {
      request.log.warn({ err }, 'NBU inflation fetch failed')
      if (cached) return cached.value
      return reply.badGateway('Inflation data unavailable')
    }
  })
}

export default inflationRoutes
