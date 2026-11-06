import { test } from 'node:test'
import * as assert from 'node:assert'
import { nextRun } from '../../src/plugins/mono-schedule'

test('next Monobank sync is the next 09:00 or 21:00 local', () => {
  const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m)
  assert.deepEqual(nextRun(at(6, 3)), at(6, 9))
  assert.deepEqual(nextRun(at(6, 9)), at(6, 21)) // exactly at a run time: the next one
  assert.deepEqual(nextRun(at(6, 15, 30)), at(6, 21))
  assert.deepEqual(nextRun(at(6, 23)), at(7, 9))
  // month and year boundaries
  assert.deepEqual(nextRun(new Date(2026, 10, 30, 22)), new Date(2026, 11, 1, 9))
  assert.deepEqual(nextRun(new Date(2026, 11, 31, 22)), new Date(2027, 0, 1, 9))
  // other times, unsorted
  assert.deepEqual(nextRun(at(6, 13), [[18, 30], [7, 15]]), at(6, 18, 30))
})
