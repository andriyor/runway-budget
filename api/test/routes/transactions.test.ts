import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../helper'
import { accounts, transactions } from '../../src/db/schema'

test('set and clear a transaction note', async (t) => {
  const app = await build(t)
  const [account] = app.db.insert(accounts).values({ name: 'Mono', currency: 'UAH', balanceCents: 0 }).returning().all()
  const [tx] = app.db.insert(transactions)
    .values({ accountId: account.id, externalId: 'x', time: new Date(), description: 'Сільпо', mcc: 5411, amountCents: -100 })
    .returning().all()
  const note = (value: unknown) => app.inject({ method: 'PATCH', url: `/api/transactions/${tx.id}`, payload: { note: value } })
  const listed = async () => (await app.inject({ url: `/api/accounts/${account.id}/transactions` })).json()[0].note

  assert.deepEqual((await note('  на день народження ')).json(), { note: 'на день народження', essential: null })
  assert.equal(await listed(), 'на день народження')
  assert.deepEqual((await note('   ')).json(), { note: null, essential: null })
  assert.equal(await listed(), null)
  assert.equal((await note('x'.repeat(1001))).statusCode, 400)
  assert.equal((await app.inject({ method: 'PATCH', url: '/api/transactions/999', payload: { note: 'x' } })).statusCode, 404)
})

test('essential comes from the category, then the merchant, then the transaction', async (t) => {
  const app = await build(t)
  const [account] = app.db.insert(accounts).values({ name: 'Mono', currency: 'UAH', balanceCents: 0 }).returning().all()
  const [grocery, shop, refund] = app.db.insert(transactions).values([
    { accountId: account.id, externalId: 'a', time: new Date(3000), description: 'Сільпо', mcc: 5411, amountCents: -100 },
    { accountId: account.id, externalId: 'b', time: new Date(2000), description: 'Rozetka', mcc: 5262, amountCents: -200 },
    { accountId: account.id, externalId: 'c', time: new Date(1000), description: 'Скасування. Rozetka', mcc: 5262, amountCents: 200 }
  ]).returning().all()
  const essentials = async () => Object.fromEntries((await app.inject({ url: `/api/accounts/${account.id}/transactions` })).json()
    .map((x: { externalId: string, essential: boolean, essentialSource: string }) => [x.externalId, `${x.essential}/${x.essentialSource}`]))
  const merchant = (description: string, essential: boolean | null) =>
    app.inject({ method: 'PUT', url: '/api/categories/merchants/essential', payload: { description, essential } })
  const own = (id: number, essential: boolean | null) =>
    app.inject({ method: 'PATCH', url: `/api/transactions/${id}`, payload: { essential } })

  // supermarket is essential by default, marketplaces are not
  assert.deepEqual(await essentials(), { a: 'true/auto', b: 'false/auto', c: 'false/auto' })
  // a merchant flag covers its refunds too
  assert.equal((await merchant('ROZETKA', true)).statusCode, 204)
  assert.deepEqual(await essentials(), { a: 'true/auto', b: 'true/merchant', c: 'true/merchant' })
  // a transaction's own flag wins
  assert.equal((await own(shop.id, false)).statusCode, 200)
  assert.deepEqual(await essentials(), { a: 'true/auto', b: 'false/transaction', c: 'true/merchant' })
  assert.equal((await own(grocery.id, false)).json().essential, false)
  assert.equal((await essentials()).a, 'false/transaction')
  // null resets each level
  await own(shop.id, null)
  await merchant('Rozetka', null)
  assert.deepEqual(await essentials(), { a: 'false/transaction', b: 'false/auto', c: 'false/auto' })
  assert.equal(refund.essential, null)
  assert.equal((await app.inject({ method: 'PATCH', url: `/api/transactions/${shop.id}`, payload: {} })).statusCode, 400)
  assert.equal((await merchant('Rozetka', 'yes' as unknown as boolean)).statusCode, 400)
})
