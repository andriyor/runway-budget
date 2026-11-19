// Run: node --test web/src/lib/periods.test.ts (Node 24 strips the types)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { periodBounds, previousOf } from './periods.ts'

const today = '2026-11-19'

test('bounds of each period kind', () => {
  assert.deepEqual(periodBounds('m:2026-02'), ['2026-02-01', '2026-02-28'])
  assert.deepEqual(periodBounds('q:2026-4'), ['2026-10-01', '2026-12-31'])
  assert.deepEqual(periodBounds('y:2025'), ['2025-01-01', '2025-12-31'])
  assert.deepEqual(periodBounds('w:2026-01'), ['2025-12-29', '2026-01-04'])
  assert.deepEqual(periodBounds('d:2026-03-03'), ['2026-03-03', '2026-03-03'])
  assert.equal(periodBounds(''), undefined)
})

test('a whole period compares with the whole one before', () => {
  assert.equal(previousOf('m:2026-10', today), 'm:2026-09')
  assert.equal(previousOf('m:2026-01', today), 'm:2025-12')
  assert.equal(previousOf('q:2026-1', today), 'q:2025-4')
  assert.equal(previousOf('y:2025', today), 'y:2024')
  assert.equal(previousOf('w:2026-01', today), 'w:2025-52')
})

test('a running period compares with as many days of the one before', () => {
  assert.equal(previousOf('m:2026-11', today), 'r:2026-10-01..2026-10-19')
  assert.equal(previousOf('q:2026-4', today), 'r:2026-07-01..2026-08-19')
  assert.equal(previousOf('y:2026', today), 'r:2025-01-01..2025-11-19')
  // Monday 16 – Thursday 19 November
  assert.equal(previousOf('w:2026-47', today), 'r:2026-11-09..2026-11-12')
})

test('a day, a range, all time and the future', () => {
  assert.equal(previousOf('d:2026-11-19', today), 'r:2026-11-12..2026-11-12')
  assert.equal(previousOf('r:2026-03-10..2026-03-19', today), 'r:2026-02-28..2026-03-09')
  assert.equal(previousOf('', today), undefined)
  assert.equal(previousOf('m:2026-12', today), undefined)
})

test('a month end falls back to the shorter month', () => {
  assert.equal(previousOf('r:2026-03-31..2026-03-31', today), 'r:2026-03-30..2026-03-30')
  // on the 30th, March is still running and February has no 30th
  assert.equal(previousOf('m:2026-03', '2026-03-30'), 'r:2026-02-01..2026-02-28')
  // on the 31st, March is whole
  assert.equal(previousOf('m:2026-03', '2026-03-31'), 'm:2026-02')
})
