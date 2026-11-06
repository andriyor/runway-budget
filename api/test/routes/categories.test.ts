import { test } from 'node:test'
import * as assert from 'node:assert'
import { eq } from 'drizzle-orm'
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
  add('Interactive Brokers', 6211, -800)

  const categoryOf = async () => Object.fromEntries((await app.inject({ url: `/accounts/${account.id}/transactions` })).json()
    .map((x: { externalId: string, category: string }) => [x.externalId, x.category]))

  assert.deepEqual(await categoryOf(), { 0: 'supermarket', 1: 'army_funds', 2: 'transfers', 3: 'income', 4: 'marketplaces', 5: 'marketplaces', 6: 'other_expenses', 7: 'rent', 8: 'investments' })

  // an override covers the merchant's refunds too
  const set = (description: string, category: string | null) =>
    app.inject({ method: 'PUT', url: '/categories/merchants', payload: { description, category } })
  assert.equal((await set('ROZETKA', 'renovation')).statusCode, 204)
  assert.equal((await set('Іван Петренко', 'own')).statusCode, 204)
  assert.deepEqual(await categoryOf(), { 0: 'supermarket', 1: 'army_funds', 2: 'own', 3: 'income', 4: 'renovation', 5: 'renovation', 6: 'other_expenses', 7: 'rent', 8: 'investments' })

  assert.equal((await set('Rozetka', null)).statusCode, 204)
  assert.equal((await categoryOf())[4], 'marketplaces')
  assert.equal((await set('Rozetka', 'nope')).statusCode, 400)
  // a category with subcategories is not a leaf and cannot be stored
  assert.equal((await set('Rozetka', 'shopping')).statusCode, 400)

  // a transaction's own category wins over its merchant's, and clearing it falls back
  assert.equal((await set('Rozetka', 'renovation')).statusCode, 204)
  const [refund] = app.db.select().from(transactions).where(eq(transactions.externalId, '5')).all()
  const setOne = (id: number, category: string | null) =>
    app.inject({ method: 'PUT', url: `/categories/transactions/${id}`, payload: { category } })
  assert.equal((await setOne(refund.id, 'pharmacy')).statusCode, 204)
  const rows = (await app.inject({ url: `/accounts/${account.id}/transactions` })).json()
  const byId = (id: string) => rows.find((x: { externalId: string }) => x.externalId === id)
  assert.deepEqual([byId('4').category, byId('4').categorySource], ['renovation', 'merchant'])
  assert.deepEqual([byId('5').category, byId('5').categorySource], ['pharmacy', 'transaction'])
  assert.equal(byId('0').categorySource, 'auto')
  assert.equal((await setOne(refund.id, null)).statusCode, 204)
  assert.equal((await categoryOf())[5], 'renovation')
  assert.equal((await setOne(999, 'renovation')).statusCode, 404)

  const list = (await app.inject({ url: '/categories' })).json()
  assert.deepEqual(list[0].subcategories[0], { id: 'supermarket', label: 'Супермаркет' })
  assert.equal(list.find((c: { id: string }) => c.id === 'investments').spending, false)
  assert.deepEqual(list.find((c: { id: string }) => c.id === 'income'), { id: 'income', label: 'Надходження', emoji: '💰', spending: false, subcategories: [] })
})
