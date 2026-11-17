import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../helper'

test('planned expenses are added, replaced, listed and deleted', async (t) => {
  const app = await build(t)
  const rent = { name: 'Rent', amount: 15000, currency: 'UAH', months: null, active: false }

  assert.deepEqual((await app.inject({ url: '/api/planned-expenses' })).json(), [])
  const created = await app.inject({ method: 'POST', url: '/api/planned-expenses', payload: rent })
  assert.equal(created.statusCode, 201)
  const { id } = created.json()
  assert.deepEqual(created.json(), { id, ...rent })

  const course = { name: 'English', amount: 3000.5, currency: 'UAH', months: 6, active: true }
  const put = (payload: object, at = id) => app.inject({ method: 'PUT', url: `/api/planned-expenses/${at}`, payload })
  assert.deepEqual((await put(course)).json(), { id, ...course })
  assert.deepEqual((await app.inject({ url: '/api/planned-expenses' })).json(), [{ id, ...course }])

  assert.equal((await put({ ...course, months: 0 })).statusCode, 400)
  assert.equal((await put({ ...course, amount: 0 })).statusCode, 400)
  assert.equal((await put({ ...course, active: undefined })).statusCode, 400)
  assert.equal((await put(course, 999)).statusCode, 404)

  assert.equal((await app.inject({ method: 'DELETE', url: `/api/planned-expenses/${id}` })).statusCode, 204)
  assert.equal((await app.inject({ method: 'DELETE', url: `/api/planned-expenses/${id}` })).statusCode, 404)
})
