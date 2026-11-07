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
