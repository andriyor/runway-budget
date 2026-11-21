// Run: node --test web/src/lib/goals.test.ts (Node 24 strips the types)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addMonths, spreadWishes } from './goals.ts'

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
