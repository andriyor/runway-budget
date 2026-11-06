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

test('account kind defaults to bank and can be changed', async (t) => {
  const app = await build(t)
  const bank = (await app.inject({ method: 'POST', url: '/accounts', payload: { name: 'Mono', currency: 'UAH', balance: 1 } })).json()
  assert.equal(bank.kind, 'bank')
  const cash = (await app.inject({ method: 'POST', url: '/accounts', payload: { name: 'Wallet', currency: 'USD', balance: 1, kind: 'cash' } })).json()
  assert.equal(cash.kind, 'cash')

  const changed = await app.inject({ method: 'PATCH', url: `/accounts/${bank.id}`, payload: { kind: 'cash' } })
  assert.equal(changed.json().kind, 'cash')
  assert.equal((await app.inject({ method: 'PATCH', url: `/accounts/${bank.id}`, payload: { kind: 'crypto' } })).statusCode, 400)
})

test('rename and delete account', async (t) => {
  const app = await build(t)
  const { id } = (await app.inject({ method: 'POST', url: '/accounts', payload: { name: 'Old', currency: 'EUR', balance: 5 } })).json()

  const renamed = await app.inject({ method: 'PATCH', url: `/accounts/${id}`, payload: { name: 'New' } })
  assert.equal(renamed.json().name, 'New')
  assert.equal(renamed.json().balance, 5)
  assert.equal((await app.inject({ method: 'PATCH', url: `/accounts/${id}`, payload: { name: '' } })).statusCode, 400)

  assert.equal((await app.inject({ method: 'DELETE', url: `/accounts/${id}` })).statusCode, 204)
  assert.deepEqual((await app.inject({ url: '/accounts' })).json(), [])
  assert.equal((await app.inject({ method: 'DELETE', url: `/accounts/${id}` })).statusCode, 404)
})

test('reorder accounts', async (t) => {
  const app = await build(t)
  const create = async (name: string) =>
    (await app.inject({ method: 'POST', url: '/accounts', payload: { name, currency: 'UAH', balance: 1 } })).json()
  const a = await create('A')
  const b = await create('B')
  const c = await create('C')
  const names = async () => (await app.inject({ url: '/accounts' })).json().map((x: { name: string }) => x.name)

  assert.deepEqual(await names(), ['A', 'B', 'C'])
  const order = await app.inject({ method: 'PUT', url: '/accounts/order', payload: { ids: [c.id, a.id, b.id] } })
  assert.equal(order.statusCode, 204)
  assert.deepEqual(await names(), ['C', 'A', 'B'])

  const list = (await app.inject({ url: '/accounts' })).json()
  assert.equal(list.find((x: { id: number }) => x.id === a.id).updatedAt, a.updatedAt)

  await create('D')
  assert.deepEqual(await names(), ['C', 'A', 'B', 'D'])

  const partial = await app.inject({ method: 'PUT', url: '/accounts/order', payload: { ids: [a.id, b.id] } })
  assert.equal(partial.statusCode, 400)
})
