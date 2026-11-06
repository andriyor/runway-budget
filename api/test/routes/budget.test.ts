import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../helper'

test('budget is empty, then set and overwritten', async (t) => {
  const app = await build(t)
  const put = (payload: object) => app.inject({ method: 'PUT', url: '/budget', payload })
  const none = { salary: null, salaryCurrency: null, reserve: null, reserveCurrency: null }

  assert.equal((await app.inject({ url: '/budget' })).json(), null)

  await put({ monthlySpend: 1000, currency: 'USD', salary: 2000, salaryCurrency: 'USD', reserve: 5000, reserveCurrency: 'EUR' })
  const res = await put({ monthlySpend: 40000.5, currency: 'UAH' })
  const expected = { monthlySpend: 40000.5, currency: 'UAH', ...none }
  assert.deepEqual(res.json(), expected)
  assert.deepEqual((await app.inject({ url: '/budget' })).json(), expected)

  const full = await put({ monthlySpend: 40000, currency: 'UAH', salary: 1500.25, salaryCurrency: 'USD', reserve: 3000, reserveCurrency: 'EUR' })
  assert.deepEqual(full.json(), { monthlySpend: 40000, currency: 'UAH', salary: 1500.25, salaryCurrency: 'USD', reserve: 3000, reserveCurrency: 'EUR' })

  assert.equal((await put({ monthlySpend: 0, currency: 'UAH' })).statusCode, 400)
  assert.equal((await put({ monthlySpend: 1, currency: 'UAH', salary: 100 })).statusCode, 400)
  assert.equal((await put({ monthlySpend: 1, currency: 'UAH', reserve: 100 })).statusCode, 400)
})
