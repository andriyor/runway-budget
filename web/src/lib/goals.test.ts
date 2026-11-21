// Run: node --test web/src/lib/goals.test.ts (Node 24 strips the types)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { monthsUntil, wishFit } from './goals.ts'

test('monthsUntil counts calendar months and clamps past ones to now', () => {
  const now = new Date(2026, 10, 21) // November 2026
  assert.equal(monthsUntil('2026-11', now), 0)
  assert.equal(monthsUntil('2027-03', now), 4)
  assert.equal(monthsUntil('2026-01', now), 0)
})

test('wishFit pays wishes only from what is above the goals', () => {
  // 1000 saved, goals take 800, 100 a month: a 500 wish needs 300 more, so 3 months
  assert.deepEqual(wishFit(800, 1000, 100, 500, 4), { left: 100, earliest: 3 })
  assert.deepEqual(wishFit(800, 1000, 100, 500, 1), { left: -200, earliest: 3 })
  assert.deepEqual(wishFit(0, 1000, 0, 500, 2), { left: 500, earliest: 0 })
  assert.deepEqual(wishFit(800, 1000, 0, 500, 2), { left: -300, earliest: Infinity })
})
