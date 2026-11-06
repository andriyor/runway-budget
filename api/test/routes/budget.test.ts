import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../helper'

test('budget is empty, then set and overwritten', async (t) => {
  const app = await build(t)

  assert.equal((await app.inject({ url: '/budget' })).json(), null)

  await app.inject({ method: 'PUT', url: '/budget', payload: { monthlySpend: 1000, currency: 'USD' } })
  const res = await app.inject({ method: 'PUT', url: '/budget', payload: { monthlySpend: 40000.5, currency: 'UAH' } })
  assert.deepEqual(res.json(), { monthlySpend: 40000.5, currency: 'UAH' })
  assert.deepEqual((await app.inject({ url: '/budget' })).json(), { monthlySpend: 40000.5, currency: 'UAH' })

  const bad = await app.inject({ method: 'PUT', url: '/budget', payload: { monthlySpend: 0, currency: 'UAH' } })
  assert.equal(bad.statusCode, 400)
})
