import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../helper'

test('create, list and update accounts', async (t) => {
  const app = await build(t)

  const created = await app.inject({
    method: 'POST',
    url: '/accounts',
    payload: { name: 'Mono', currency: 'UAH', balance: 1234.56 }
  })
  assert.equal(created.statusCode, 201)
  const { id } = created.json()

  const updated = await app.inject({
    method: 'PATCH',
    url: `/accounts/${id}`,
    payload: { balance: 0.1 + 0.2, currency: 'USD' }
  })
  assert.equal(updated.statusCode, 200)

  const list = (await app.inject({ url: '/accounts' })).json()
  assert.equal(list.length, 1)
  assert.equal(list[0].balance, 0.3)
  assert.equal(list[0].currency, 'USD')

  const bad = await app.inject({ method: 'POST', url: '/accounts', payload: { name: 'X', currency: 'GBP', balance: 1 } })
  assert.equal(bad.statusCode, 400)

  const missing = await app.inject({ method: 'PATCH', url: '/accounts/999', payload: { balance: 1 } })
  assert.equal(missing.statusCode, 404)
})
