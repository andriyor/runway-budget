import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../helper'

test('budget is empty, then set and overwritten', async (t) => {
  const app = await build(t)
  const put = (payload: object) => app.inject({ method: 'PUT', url: '/budget', payload })
  const none = { salary: null, salaryCurrency: null, reserve: null, reserveCurrency: null, minimalSpend: null, minimalSpendCurrency: null, targetMonths: null }

  assert.equal((await app.inject({ url: '/budget' })).json(), null)

  await put({ monthlySpend: 1000, currency: 'USD', salary: 2000, salaryCurrency: 'USD', reserve: 5000, reserveCurrency: 'EUR' })
  const res = await put({ monthlySpend: 40000.5, currency: 'UAH' })
  const expected = { monthlySpend: 40000.5, currency: 'UAH', ...none }
  assert.deepEqual(res.json(), expected)
  assert.deepEqual((await app.inject({ url: '/budget' })).json(), expected)

  const fullBody = {
    monthlySpend: 40000,
    currency: 'UAH',
    salary: 1500.25,
    salaryCurrency: 'USD',
    reserve: 3000,
    reserveCurrency: 'EUR',
    minimalSpend: 15000,
    minimalSpendCurrency: 'UAH',
    targetMonths: 12
  }
  assert.deepEqual((await put(fullBody)).json(), fullBody)

  assert.equal((await put({ monthlySpend: 0, currency: 'UAH' })).statusCode, 400)
  assert.equal((await put({ monthlySpend: 1, currency: 'UAH', salary: 100 })).statusCode, 400)
  assert.equal((await put({ monthlySpend: 1, currency: 'UAH', reserve: 100 })).statusCode, 400)
  assert.equal((await put({ monthlySpend: 1, currency: 'UAH', minimalSpend: 100 })).statusCode, 400)
  assert.equal((await put({ monthlySpend: 1, currency: 'UAH', minimalSpend: 0, minimalSpendCurrency: 'UAH' })).statusCode, 400)
  assert.equal((await put({ monthlySpend: 1, currency: 'UAH', targetMonths: 0 })).statusCode, 400)
  assert.equal((await put({ monthlySpend: 1, currency: 'UAH', targetMonths: 1.5 })).statusCode, 400)
})
