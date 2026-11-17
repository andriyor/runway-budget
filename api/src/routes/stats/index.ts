import { type FastifyPluginAsync } from 'fastify'
import type { Currency, SpendingPerYear } from '@runway-budget/shared'
import { categoryTree } from '../../categories'
import { accounts, currencies } from '../../db/schema'
import { currentRates } from '../../rates'
import { accountTransactions } from '../../transactions'

// most recent years reported, the running one included
const YEARS = 3

// leaf category → its top-level category, for those that count as spending
const spendingParent = new Map(
  categoryTree
    .filter((c) => c.spending)
    .flatMap((c) => [[c.id, c.id] as const, ...c.subcategories.map((s) => [s.id, c.id] as const)]),
)

const statsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: { currency: Currency; tz: string } }>(
    '/spending-per-year',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['currency', 'tz'],
          additionalProperties: false,
          // tz: an IANA time zone such as Europe/Kyiv; the year and today are the user's, not the server's
          properties: {
            currency: { type: 'string', enum: currencies },
            tz: { type: 'string', minLength: 1, maxLength: 100 },
          },
        },
      },
    },
    async (request, reply): Promise<SpendingPerYear | undefined> => {
      const { currency, tz } = request.query
      let localDay: (date: Date) => string
      try {
        // en-CA formats as YYYY-MM-DD
        const format = new Intl.DateTimeFormat('en-CA', {
          timeZone: tz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
        localDay = (date) => format.format(date)
      } catch {
        return reply.badRequest('tz must be an IANA time zone')
      }
      let rates
      try {
        rates = (await currentRates(request.log)).rates
      } catch {
        return reply.badGateway('Exchange rates unavailable')
      }

      const today = localDay(new Date())
      const year = Number(today.slice(0, 4))
      // last year's spending up to today's date compares with this year's so far
      const yearAgo = `${year - 1}${today.slice(4)}`
      const rows = new Map<string, SpendingPerYear['rows'][number]>()
      let first: string | undefined
      for (const account of await fastify.db.select().from(accounts)) {
        for (const t of await accountTransactions(fastify.db, account.id)) {
          if (t.cancelled) continue
          const day = localDay(new Date(t.time))
          if (!first || day < first) first = day
          const parent = spendingParent.get(t.category)
          const y = Number(day.slice(0, 4))
          if (!parent || y <= year - YEARS) continue
          // spending is negative, refunds positive; rates are UAH per unit
          const spent = (-t.amount * rates[account.currency]) / rates[currency]
          const row = rows.get(parent) ?? { category: parent, byYear: {}, lastYearToDate: 0 }
          row.byYear[y] = (row.byYear[y] ?? 0) + spent
          if (y === year - 1 && day <= yearAgo) row.lastYearToDate += spent
          rows.set(parent, row)
        }
      }
      if (!first) return { today, first: null, years: [], comparable: false, rows: [] }
      const since = first
      // the first year counts only with at least its December, else a few days of data look like a cheap year
      const years = Array.from({ length: YEARS }, (_, i) => year - YEARS + 1 + i).filter(
        (y) => y > Number(since.slice(0, 4)) || `${y}-12-01` > since,
      )
      const cents = (n: number) => Math.round(n * 100) / 100
      return {
        today,
        first,
        years,
        comparable: years.includes(year - 1) && first <= `${year - 1}-01-01`,
        rows: [...rows.values()]
          .map((r) => ({
            ...r,
            byYear: Object.fromEntries(Object.entries(r.byYear).map(([y, n]) => [y, cents(n)])),
            lastYearToDate: cents(r.lastYearToDate),
          }))
          .sort(
            (a, b) =>
              (b.byYear[year] ?? 0) - (a.byYear[year] ?? 0) || (b.byYear[year - 1] ?? 0) - (a.byYear[year - 1] ?? 0),
          ),
      }
    },
  )
}

export default statsRoutes
