// Run: node --test web/src/lib/goals.test.ts (Node 24 strips the types)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addMonths, findPurchase, spreadWishes } from './goals.ts'

test('addMonths crosses years', () => {
  assert.equal(addMonths('2026-11', 0), '2026-11')
  assert.equal(addMonths('2026-11', 3), '2027-02')
  assert.equal(addMonths('2026-12', 13), '2028-01')
})

test('spreadWishes fills each month up to the budget, in order', () => {
  // 100 a month; November already has 70 planned
  const taken = new Map([['2026-11', 70]])
  assert.deepEqual(spreadWishes([30, 50, 60, 20, 250], taken, 100, '2026-11'), [
    '2026-11', // 70 + 30 = 100
    '2026-12',
    '2027-01', // 50 + 60 would pass 100
    '2026-12', // a later cheap one still fills an earlier month
    '2027-02', // dearer than the budget: a month of its own
  ])
})

test('findPurchase takes the closest spending in the category after the wish was added', () => {
  const wish = {
    id: 1,
    name: 'Lamp',
    target: 1000,
    currency: 'UAH',
    wish: true,
    plannedFor: null,
    category: 'home',
    matchAfter: null,
    addedAt: '2026-11-01T00:00:00.000Z',
  } as const
  const tx = (id: number, time: string, amount: number, category = 'furniture', cancelled = false) =>
    ({ id, time, amount, category, cancelled }) as never
  const parentOf = (c: string) => (c === 'furniture' ? 'home' : 'other')
  const spent = (t: { amount: number }) => -t.amount
  const list = [
    tx(1, '2026-10-20T00:00:00.000Z', -1000), // before the wish
    tx(2, '2026-11-05T00:00:00.000Z', -1150),
    tx(3, '2026-11-06T00:00:00.000Z', -980),
    tx(4, '2026-11-07T00:00:00.000Z', -1000, 'groceries'), // another category
    tx(5, '2026-11-08T00:00:00.000Z', -1000, 'furniture', true), // cancelled
    tx(6, '2026-11-09T00:00:00.000Z', -5000), // too far from the price
  ]
  assert.equal(findPurchase(wish, list, parentOf, spent)?.id, 3)
  // after "not it" on the 3rd, only later ones count
  assert.equal(findPurchase({ ...wish, matchAfter: '2026-11-06T00:00:00.000Z' }, list, parentOf, spent), undefined)
  assert.equal(findPurchase({ ...wish, category: null }, list, parentOf, spent), undefined)
})
