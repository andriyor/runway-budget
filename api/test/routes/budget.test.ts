import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../helper'

test('budget is empty, then set and overwritten', async (t) => {
  const app = await build(t)
  const put = (payload: object) => app.inject({ method: 'PUT', url: '/budget', payload })

  assert.equal((await app.inject({ url: '/budget' })).json(), null)

  await put({ monthlySpend: 1000, currency: 'USD', salary: 2000, salaryCurrency: 'USD' })
  const res = await put({ monthlySpend: 40000.5, currency: 'UAH' })
  const expected = { monthlySpend: 40000.5, currency: 'UAH', salary: null, salaryCurrency: null }
  assert.deepEqual(res.json(), expected)
  assert.deepEqual((await app.inject({ url: '/budget' })).json(), expected)

  const withSalary = await put({ monthlySpend: 40000, currency: 'UAH', salary: 1500.25, salaryCurrency: 'USD' })
  assert.deepEqual(withSalary.json(), { monthlySpend: 40000, currency: 'UAH', salary: 1500.25, salaryCurrency: 'USD' })

  assert.equal((await put({ monthlySpend: 0, currency: 'UAH' })).statusCode, 400)
  assert.equal((await put({ monthlySpend: 1, currency: 'UAH', salary: 100 })).statusCode, 400)
})
