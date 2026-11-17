import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../helper'

test('assets are added, replaced, listed and deleted', async (t) => {
  const app = await build(t)
  const car = { name: 'Car', value: 12000.5, currency: 'USD', discount: 20, sellable: true }

  assert.deepEqual((await app.inject({ url: '/api/assets' })).json(), [])
  const created = await app.inject({ method: 'POST', url: '/api/assets', payload: car })
  assert.equal(created.statusCode, 201)
  const { id } = created.json()
  assert.deepEqual(created.json(), { id, ...car })

  const flat = { name: 'Flat', value: 3000000, currency: 'UAH', discount: 10, sellable: false }
  assert.deepEqual((await app.inject({ method: 'PUT', url: `/api/assets/${id}`, payload: flat })).json(), {
    id,
    ...flat,
  })
  assert.deepEqual((await app.inject({ url: '/api/assets' })).json(), [{ id, ...flat }])

  const post = (payload: object) => app.inject({ method: 'POST', url: '/api/assets', payload })
  assert.equal((await post({ ...car, value: 0 })).statusCode, 400)
  assert.equal((await post({ ...car, discount: 95 })).statusCode, 400)
  assert.equal((await post({ ...car, sellable: undefined })).statusCode, 400)
  assert.equal((await app.inject({ method: 'PUT', url: '/api/assets/999', payload: car })).statusCode, 404)

  assert.equal((await app.inject({ method: 'DELETE', url: `/api/assets/${id}` })).statusCode, 204)
  assert.equal((await app.inject({ method: 'DELETE', url: `/api/assets/${id}` })).statusCode, 404)
})
