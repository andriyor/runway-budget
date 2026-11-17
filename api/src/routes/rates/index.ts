import { type FastifyPluginAsync } from 'fastify'
import type { RateHistory } from '@runway-budget/shared'
import { currentRates } from '../../rates'

// one currency's daily rates over a range, oldest first
const NBU_RANGE_URL = 'https://bank.gov.ua/NBU_Exchange/exchange_site'
const HISTORY_TTL_MS = 12 * 60 * 60 * 1000
const compact = (day: string) => day.replaceAll('-', '')
// "20.12.2024" → "2024-12-20"
const isoDay = (nbu: string) => nbu.split('.').reverse().join('-')

// ponytail: in-memory per `from` and refetched after HISTORY_TTL_MS; a rates table if the NBU gets slow or rate-limits
const historyCache = new Map<string, { at: number; value: RateHistory }>()

async function fetchHistory(from: string, to: string): Promise<RateHistory> {
  const series = await Promise.all(
    (['USD', 'EUR'] as const).map(async (cc) => {
      const query = new URLSearchParams({
        start: compact(from),
        end: compact(to),
        valcode: cc.toLowerCase(),
        sort: 'exchangedate',
        order: 'asc',
        json: '',
      })
      const res = await fetch(`${NBU_RANGE_URL}?${query}`)
      if (!res.ok) throw new Error(`NBU responded ${res.status}`)
      const list = (await res.json()) as Array<{ exchangedate: string; rate_per_unit: number }>
      return new Map(list.map((r) => [isoDay(r.exchangedate), r.rate_per_unit]))
    }),
  )
  const [usd, eur] = series
  const history: RateHistory = {}
  for (const [day, rate] of usd) {
    const euro = eur.get(day)
    if (euro !== undefined) history[day] = { UAH: 1, USD: rate, EUR: euro }
  }
  return history
}

const ratesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    try {
      return await currentRates(request.log)
    } catch {
      return reply.badGateway('Exchange rates unavailable')
    }
  })

  fastify.get<{ Querystring: { from: string } }>(
    '/history',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['from'],
          additionalProperties: false,
          // the NBU range endpoint starts in the 1990s; a far older date is a mistake
          properties: { from: { type: 'string', pattern: '^(199[6-9]|20\\d{2})-\\d{2}-\\d{2}$' } },
        },
      },
    },
    async (request, reply) => {
      const { from } = request.query
      const cached = historyCache.get(from)
      if (cached && Date.now() - cached.at < HISTORY_TTL_MS) return cached.value
      try {
        const value = await fetchHistory(from, new Date().toISOString().slice(0, 10))
        historyCache.set(from, { at: Date.now(), value })
        return value
      } catch (err) {
        request.log.warn({ err }, 'NBU rate history fetch failed')
        if (cached) return cached.value
        return reply.badGateway('Exchange rate history unavailable')
      }
    },
  )
}

export default ratesRoutes
