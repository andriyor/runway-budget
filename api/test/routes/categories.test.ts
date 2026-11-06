import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../helper'
import { accounts, transactions } from '../../src/db/schema'

test('categories come from MCC, description rules and merchant overrides', async (t) => {
  const app = await build(t)
  const [account] = app.db.insert(accounts).values({ name: 'Mono', currency: 'UAH', balanceCents: 0 }).returning().all()
  let n = 0
  const add = (description: string, mcc: number, amountCents: number) =>
    app.db.insert(transactions).values({ accountId: account.id, externalId: String(n++), time: new Date(n * 1000), description, mcc, amountCents }).run()
  add('Сільпо', 5411, -100)
  add('Поповнення «Авто для бригади»', 4829, -200)
  add('Іван Петренко', 4829, -300)
  add('Від: Петренко', 4829, 400)
  add('Rozetka', 5262, -500)
  add('Скасування. Rozetka', 5262, 500)
  add('Невідомо', 1, -600)
  add('Агенція нерухомості', 6513, -700)

  const categoryOf = async () => Object.fromEntries((await app.inject({ url: `/accounts/${account.id}/transactions` })).json()
    .map((x: { externalId: string, category: string }) => [x.externalId, x.category]))

  assert.deepEqual(await categoryOf(), { 0: 'groceries', 1: 'charity', 2: 'transfers', 3: 'income', 4: 'shopping', 5: 'shopping', 6: 'other', 7: 'housing' })

  // an override covers the merchant's refunds too
  const set = (description: string, category: string | null) =>
    app.inject({ method: 'PUT', url: '/categories/merchants', payload: { description, category } })
  assert.equal((await set('ROZETKA', 'home')).statusCode, 204)
  assert.equal((await set('Іван Петренко', 'own')).statusCode, 204)
  assert.deepEqual(await categoryOf(), { 0: 'groceries', 1: 'charity', 2: 'own', 3: 'income', 4: 'home', 5: 'home', 6: 'other', 7: 'housing' })

  assert.equal((await set('Rozetka', null)).statusCode, 204)
  assert.equal((await categoryOf())[4], 'shopping')
  assert.equal((await set('Rozetka', 'nope')).statusCode, 400)

  const list = (await app.inject({ url: '/categories' })).json()
  assert.deepEqual(list[0], { id: 'groceries', label: 'Продукти', emoji: '🛒' })
})
