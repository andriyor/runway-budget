import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../helper'

test('create, list and update accounts', async (t) => {
  const app = await build(t)

  const created = await app.inject({
    method: 'POST',
    url: '/api/accounts',
    payload: { name: 'Mono', currency: 'UAH', balance: 1234.56 }
  })
  assert.equal(created.statusCode, 201)
  const { id } = created.json()

  const updated = await app.inject({
    method: 'PATCH',
    url: `/api/accounts/${id}`,
    payload: { balance: 0.1 + 0.2, currency: 'USD' }
  })
  assert.equal(updated.statusCode, 200)

  const list = (await app.inject({ url: '/api/accounts' })).json()
  assert.equal(list.length, 1)
  assert.equal(list[0].balance, 0.3)
  assert.equal(list[0].currency, 'USD')

  const bad = await app.inject({ method: 'POST', url: '/api/accounts', payload: { name: 'X', currency: 'GBP', balance: 1 } })
  assert.equal(bad.statusCode, 400)

  const missing = await app.inject({ method: 'PATCH', url: '/api/accounts/999', payload: { balance: 1 } })
  assert.equal(missing.statusCode, 404)
})

test('account kind defaults to bank and can be changed', async (t) => {
  const app = await build(t)
  const bank = (await app.inject({ method: 'POST', url: '/api/accounts', payload: { name: 'Mono', currency: 'UAH', balance: 1 } })).json()
  assert.equal(bank.kind, 'bank')
  const cash = (await app.inject({ method: 'POST', url: '/api/accounts', payload: { name: 'Wallet', currency: 'USD', balance: 1, kind: 'cash' } })).json()
  assert.equal(cash.kind, 'cash')

  const changed = await app.inject({ method: 'PATCH', url: `/api/accounts/${bank.id}`, payload: { kind: 'cash' } })
  assert.equal(changed.json().kind, 'cash')
  assert.equal((await app.inject({ method: 'PATCH', url: `/api/accounts/${bank.id}`, payload: { kind: 'crypto' } })).statusCode, 400)
})

test('rename and delete account', async (t) => {
  const app = await build(t)
  const { id } = (await app.inject({ method: 'POST', url: '/api/accounts', payload: { name: 'Old', currency: 'EUR', balance: 5 } })).json()

  const renamed = await app.inject({ method: 'PATCH', url: `/api/accounts/${id}`, payload: { name: 'New' } })
  assert.equal(renamed.json().name, 'New')
  assert.equal(renamed.json().balance, 5)
  assert.equal((await app.inject({ method: 'PATCH', url: `/api/accounts/${id}`, payload: { name: '' } })).statusCode, 400)

  assert.equal((await app.inject({ method: 'DELETE', url: `/api/accounts/${id}` })).statusCode, 204)
  assert.deepEqual((await app.inject({ url: '/api/accounts' })).json(), [])
  assert.equal((await app.inject({ method: 'DELETE', url: `/api/accounts/${id}` })).statusCode, 404)
})

test('reorder accounts', async (t) => {
  const app = await build(t)
  const create = async (name: string) =>
    (await app.inject({ method: 'POST', url: '/api/accounts', payload: { name, currency: 'UAH', balance: 1 } })).json()
  const a = await create('A')
  const b = await create('B')
  const c = await create('C')
  const names = async () => (await app.inject({ url: '/api/accounts' })).json().map((x: { name: string }) => x.name)

  assert.deepEqual(await names(), ['A', 'B', 'C'])
  const order = await app.inject({ method: 'PUT', url: '/api/accounts/order', payload: { ids: [c.id, a.id, b.id] } })
  assert.equal(order.statusCode, 204)
  assert.deepEqual(await names(), ['C', 'A', 'B'])

  const list = (await app.inject({ url: '/api/accounts' })).json()
  assert.equal(list.find((x: { id: number }) => x.id === a.id).updatedAt, a.updatedAt)

  await create('D')
  assert.deepEqual(await names(), ['C', 'A', 'B', 'D'])

  const partial = await app.inject({ method: 'PUT', url: '/api/accounts/order', payload: { ids: [a.id, b.id] } })
  assert.equal(partial.statusCode, 400)
})

test('sync Monobank statement into one account', async (t) => {
  const app = await build(t)
  process.env.MONO_TOKEN = 'token'
  process.env.MONO_ACCOUNT = 'acc1'
  t.after(() => { delete process.env.MONO_TOKEN; delete process.env.MONO_ACCOUNT })

  const statement = [
    { id: 'b', time: 1_700_000_200, description: 'Скасування. Сільпо', mcc: 5814, amount: -9500, balance: 100500 },
    { id: 'a', time: 1_700_000_100, description: 'Salary', mcc: 4829, amount: 110000, balance: 110000 }
  ]
  const info = { accounts: [{ id: 'other', creditLimit: 0, currencyCode: 840 }, { id: 'acc1', creditLimit: 50000, currencyCode: 980 }] }
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url: string) =>
    Response.json(url.endsWith('/client-info') ? info : statement))

  const first = await app.inject({ method: 'POST', url: '/api/accounts/mono/sync' })
  assert.equal(first.statusCode, 200)
  // 1005 statement balance minus 500 credit limit
  assert.equal(first.json().account.balance, 505)
  assert.equal(first.json().account.currency, 'UAH')
  assert.match(String(fetchMock.mock.calls[1].arguments[0]), /\/personal\/statement\/acc1\/\d+\/\d+$/)

  // re-sync does not duplicate transactions or accounts
  await app.inject({ method: 'POST', url: '/api/accounts/mono/sync' })
  assert.equal((await app.inject({ url: '/api/accounts' })).json().length, 1)

  const list = (await app.inject({ url: `/api/accounts/${first.json().account.id}/transactions` })).json()
  assert.deepEqual(list.map((x: { externalId: string, amount: number, category: string }) => [x.externalId, x.amount, x.category]),
    [['b', -95, 'coffee_snacks'], ['a', 1100, 'income']])
  assert.equal(list[0].mccDescription, 'Ресторани швидкого харчування')
  assert.deepEqual(list.map((x: { merchantDomain: string | null }) => x.merchantDomain), ['silpo.ua', null])

  // an older window adds its transactions but keeps the newer balance
  const older = [{ id: 'z', time: 1_690_000_000, description: 'Old', mcc: 5411, amount: -100, balance: 999999 }]
  fetchMock.mock.mockImplementation(async (url: string) => Response.json(url.endsWith('/client-info') ? info : older))
  const back = await app.inject({ method: 'POST', url: '/api/accounts/mono/sync?to=1690000100' })
  assert.equal(back.json().account.balance, 505)
  assert.match(String(fetchMock.mock.calls.at(-1)!.arguments[0]), /\/statement\/acc1\/1687321700\/1690000100$/)
  assert.equal((await app.inject({ url: `/api/accounts/${first.json().account.id}/transactions` })).json().length, 3)
  assert.equal((await app.inject({ method: 'POST', url: '/api/accounts/mono/sync?to=-1' })).statusCode, 400)

  fetchMock.mock.mockImplementation(async () => new Response('', { status: 429 }))
  assert.equal((await app.inject({ method: 'POST', url: '/api/accounts/mono/sync' })).statusCode, 429)

  // deleting the account removes its transactions
  await app.inject({ method: 'DELETE', url: `/api/accounts/${first.json().account.id}` })
  assert.deepEqual((await app.inject({ url: `/api/accounts/${first.json().account.id}/transactions` })).json(), [])
})
