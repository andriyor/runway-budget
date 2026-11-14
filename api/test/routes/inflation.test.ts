import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../helper'

test('inflation keeps the all-items, nationwide month-over-month CPI', async (t) => {
  const app = await build(t)
  const realFetch = globalThis.fetch
  const urls: string[] = []
  const row = (dt: string, value: number, rest: object = {}) =>
    ({ dt, id_api: 'prices_price_cpi_', mcrd081: 'Total', ku: null, tzep: 'PCPM_', value, ...rest })
  globalThis.fetch = (async (url: string) => {
    urls.push(url)
    return new Response(JSON.stringify([
      row('20250101', 1.4),
      row('20250201', 1.2),
      // year over year, a region, a spending group and producer prices are left out
      row('20250201', 12.9, { tzep: 'PCCM_' }),
      row('20250201', 9.9, { ku: '6' }),
      row('20250201', 0.4, { mcrd081: '01' }),
      row('20250201', 0.5, { id_api: 'prices_price_ppi_' }),
    ]))
  }) as typeof fetch
  t.after(() => { globalThis.fetch = realFetch })

  const res = await app.inject({ url: '/api/inflation?from=2025-01' })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.json(), { '2025-01': 1.4, '2025-02': 1.2 })
  assert.ok(urls[0].includes('start=20250101') && urls[0].includes('period=m'))

  assert.equal((await app.inject({ url: '/api/inflation' })).statusCode, 400)
  assert.equal((await app.inject({ url: '/api/inflation?from=2025-13' })).statusCode, 400)
  assert.equal((await app.inject({ url: '/api/inflation?from=2025-01-01' })).statusCode, 400)
})
