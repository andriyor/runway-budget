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
  const note = (value: unknown) => app.inject({ method: 'PATCH', url: `/transactions/${tx.id}`, payload: { note: value } })
  const listed = async () => (await app.inject({ url: `/accounts/${account.id}/transactions` })).json()[0].note

  assert.deepEqual((await note('  на день народження ')).json(), { note: 'на день народження' })
  assert.equal(await listed(), 'на день народження')
  assert.deepEqual((await note('   ')).json(), { note: null })
  assert.equal(await listed(), null)
  assert.equal((await note('x'.repeat(1001))).statusCode, 400)
  assert.equal((await app.inject({ method: 'PATCH', url: '/transactions/999', payload: { note: 'x' } })).statusCode, 404)
})
