import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../helper'

test('rate history merges USD and EUR per day and validates from', async (t) => {
  const app = await build(t)
  const realFetch = globalThis.fetch
  const urls: string[] = []
  globalThis.fetch = (async (url: string) => {
    urls.push(url)
    const usd = url.includes('valcode=usd')
    return new Response(JSON.stringify([
      { exchangedate: '20.12.2024', rate_per_unit: usd ? 41.9 : 43.7 },
      { exchangedate: '21.12.2024', rate_per_unit: usd ? 41.9 : 43.7 },
      // only one currency has this day: left out rather than half-filled
      ...(usd ? [{ exchangedate: '22.12.2024', rate_per_unit: 42 }] : []),
    ]))
  }) as typeof fetch
  t.after(() => { globalThis.fetch = realFetch })

  const res = await app.inject({ url: '/api/rates/history?from=2024-12-20' })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.json(), {
    '2024-12-20': { UAH: 1, USD: 41.9, EUR: 43.7 },
    '2024-12-21': { UAH: 1, USD: 41.9, EUR: 43.7 },
  })
  assert.ok(urls.every((u) => u.includes('start=20241220')))

  assert.equal((await app.inject({ url: '/api/rates/history' })).statusCode, 400)
  assert.equal((await app.inject({ url: '/api/rates/history?from=yesterday' })).statusCode, 400)
  assert.equal((await app.inject({ url: '/api/rates/history?from=1900-01-01' })).statusCode, 400)
})
