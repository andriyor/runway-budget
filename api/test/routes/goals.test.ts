import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../helper'

test('create, list and delete goals', async (t) => {
  const app = await build(t)

  const created = await app.inject({ method: 'POST', url: '/api/goals', payload: { name: 'Car', target: 15000.5, currency: 'USD' } })
  assert.equal(created.statusCode, 201)
  const { id } = created.json()

  assert.deepEqual((await app.inject({ url: '/api/goals' })).json(), [{ id, name: 'Car', target: 15000.5, currency: 'USD' }])

  assert.equal((await app.inject({ method: 'DELETE', url: `/api/goals/${id}` })).statusCode, 204)
  assert.deepEqual((await app.inject({ url: '/api/goals' })).json(), [])
  assert.equal((await app.inject({ method: 'DELETE', url: `/api/goals/${id}` })).statusCode, 404)

  const bad = await app.inject({ method: 'POST', url: '/api/goals', payload: { name: 'X', target: 0, currency: 'USD' } })
  assert.equal(bad.statusCode, 400)
})

test('edit a goal', async (t) => {
  const app = await build(t)
  const { id } = (await app.inject({ method: 'POST', url: '/api/goals', payload: { name: 'Car', target: 15000, currency: 'USD' } })).json()

  const edited = await app.inject({ method: 'PUT', url: `/api/goals/${id}`, payload: { name: 'Used car', target: 9000.25, currency: 'EUR' } })
  assert.equal(edited.statusCode, 200)
  assert.deepEqual(edited.json(), { id, name: 'Used car', target: 9000.25, currency: 'EUR' })
  assert.deepEqual((await app.inject({ url: '/api/goals' })).json(), [{ id, name: 'Used car', target: 9000.25, currency: 'EUR' }])

  const invalid = await app.inject({ method: 'PUT', url: `/api/goals/${id}`, payload: { name: '', target: 9000, currency: 'EUR' } })
  assert.equal(invalid.statusCode, 400)
  const missing = await app.inject({ method: 'PUT', url: `/api/goals/${id + 1}`, payload: { name: 'X', target: 1, currency: 'USD' } })
  assert.equal(missing.statusCode, 404)
})

test('reorder goals', async (t) => {
  const app = await build(t)
  const add = async (name: string) => (await app.inject({ method: 'POST', url: '/api/goals', payload: { name, target: 100, currency: 'USD' } })).json().id
  const a = await add('A')
  const b = await add('B')
  const c = await add('C')
  const names = async () => (await app.inject({ url: '/api/goals' })).json().map((g: { name: string }) => g.name)
  assert.deepEqual(await names(), ['A', 'B', 'C'])

  assert.equal((await app.inject({ method: 'PUT', url: '/api/goals/order', payload: { ids: [c, a, b] } })).statusCode, 204)
  assert.deepEqual(await names(), ['C', 'A', 'B'])
  // a new goal goes last
  await add('D')
  assert.deepEqual(await names(), ['C', 'A', 'B', 'D'])

  const partial = await app.inject({ method: 'PUT', url: '/api/goals/order', payload: { ids: [a, b] } })
  assert.equal(partial.statusCode, 400)
})
