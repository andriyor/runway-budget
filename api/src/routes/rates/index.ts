import { type FastifyPluginAsync } from 'fastify'
import type { Rates } from '@runway-budget/shared'

// National Bank of Ukraine official rates: UAH per 1 unit of currency
const NBU_URL = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json'
const TTL_MS = 60 * 60 * 1000

let cache: { at: number, value: Rates } | undefined

async function fetchNbu (): Promise<Rates> {
  const res = await fetch(NBU_URL)
  if (!res.ok) throw new Error(`NBU responded ${res.status}`)
  const list = await res.json() as Array<{ cc: string, rate: number, exchangedate: string }>
  const find = (cc: string) => {
    const item = list.find((r) => r.cc === cc)
    if (!item) throw new Error(`NBU has no rate for ${cc}`)
    return item
  }
  const usd = find('USD')
  return { date: usd.exchangedate, rates: { UAH: 1, USD: usd.rate, EUR: find('EUR').rate } }
}

const ratesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.value
    try {
      cache = { at: Date.now(), value: await fetchNbu() }
      return cache.value
    } catch (err) {
      request.log.warn({ err }, 'NBU rates fetch failed')
      // stale rates beat no totals at all
      if (cache) return cache.value
      return reply.badGateway('Exchange rates unavailable')
    }
  })
}

export default ratesRoutes
