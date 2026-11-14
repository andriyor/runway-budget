import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../helper'

test('category budgets are set, replaced, listed and deleted', async (t) => {
  const app = await build(t)
  const put = (category: string, payload: object) => app.inject({ method: 'PUT', url: `/api/category-budgets/${category}`, payload })

  assert.deepEqual((await app.inject({ url: '/api/category-budgets' })).json(), [])
  assert.deepEqual((await put('groceries', { amount: 8000, currency: 'UAH' })).json(), { category: 'groceries', amount: 8000, currency: 'UAH' })
  await put('groceries', { amount: 9000.5, currency: 'UAH' })
  await put('cafes_restaurants', { amount: 100, currency: 'USD' })
  const list = (await app.inject({ url: '/api/category-budgets' })).json()
  assert.deepEqual(list.toSorted((a: any, b: any) => a.category.localeCompare(b.category)), [
    { category: 'cafes_restaurants', amount: 100, currency: 'USD' },
    { category: 'groceries', amount: 9000.5, currency: 'UAH' },
  ])

  // subcategories and categories that are not spending (income) take no cap
  assert.equal((await put('supermarket', { amount: 1, currency: 'UAH' })).statusCode, 400)
  assert.equal((await put('income', { amount: 1, currency: 'UAH' })).statusCode, 400)
  assert.equal((await put('groceries', { amount: 0, currency: 'UAH' })).statusCode, 400)
  assert.equal((await put('groceries', { amount: 1 })).statusCode, 400)

  assert.equal((await app.inject({ method: 'DELETE', url: '/api/category-budgets/groceries' })).statusCode, 204)
  assert.equal((await app.inject({ method: 'DELETE', url: '/api/category-budgets/groceries' })).statusCode, 404)
  assert.equal((await app.inject({ url: '/api/category-budgets' })).json().length, 1)
})
