import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../helper'
import { accounts, transactions } from '../../src/db/schema'

test('spending per year sums spending categories net of refunds in one currency', async (t) => {
  const app = await build(t)
  const realFetch = globalThis.fetch
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify([
        { cc: 'USD', rate: 40, exchangedate: '14.11.2026' },
        { cc: 'EUR', rate: 45, exchangedate: '14.11.2026' },
      ]),
    )) as typeof fetch
  t.after(() => {
    globalThis.fetch = realFetch
  })

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kyiv' }).format(new Date())
  const year = Number(today.slice(0, 4))
  const [uah, usd] = app.db
    .insert(accounts)
    .values([
      { name: 'Mono', currency: 'UAH', balanceCents: 0 },
      { name: 'Cash', currency: 'USD', balanceCents: 0 },
    ])
    .returning()
    .all()
  const tx = (
    accountId: number,
    externalId: string,
    time: string | Date,
    description: string,
    mcc: number,
    amountCents: number,
  ) => ({ accountId, externalId, time: new Date(time), description, mcc, amountCents })
  app.db
    .insert(transactions)
    .values([
      tx(uah.id, 'a', `${year - 1}-01-01T10:00:00Z`, 'Сільпо', 5411, -10000),
      tx(uah.id, 'b', `${year - 1}-12-31T10:00:00Z`, 'Сільпо', 5411, -5000),
      tx(uah.id, 'c', new Date(), 'Сільпо', 5411, -3000),
      // a partial refund lowers spending
      tx(uah.id, 'd', new Date(), 'Скасування. Сільпо', 5411, 1000),
      // a cancelled purchase counts as nothing
      tx(uah.id, 'e', new Date(Date.now() - 1000), 'Rozetka', 5262, -7000),
      tx(uah.id, 'f', new Date(), 'Скасування. Rozetka', 5262, 7000),
      // $10 at 40 UAH
      tx(usd.id, 'g', new Date(), 'Сільпо', 5411, -1000),
    ])
    .run()

  const res = await app.inject({ url: '/api/stats/spending-per-year?currency=UAH&tz=Europe/Kyiv' })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.json(), {
    today,
    first: `${year - 1}-01-01`,
    years: [year - 1, year],
    comparable: true,
    rows: [
      {
        category: 'groceries',
        byYear: { [year - 1]: 150, [year]: 420 },
        // 31 December counts only on the last day of the year
        lastYearToDate: today.endsWith('-12-31') ? 150 : 100,
      },
    ],
  })
  assert.equal(
    (await app.inject({ url: '/api/stats/spending-per-year?currency=USD&tz=Europe/Kyiv' })).json().rows[0].byYear[year],
    10.5,
  )

  assert.equal((await app.inject({ url: '/api/stats/spending-per-year?currency=UAH&tz=Mars/Base' })).statusCode, 400)
  assert.equal((await app.inject({ url: '/api/stats/spending-per-year?currency=GBP&tz=Europe/Kyiv' })).statusCode, 400)
  assert.equal((await app.inject({ url: '/api/stats/spending-per-year?currency=UAH' })).statusCode, 400)
})
