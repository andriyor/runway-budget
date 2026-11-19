// Run: node --test web/src/lib/tips.test.ts (Node 24 strips the types)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tipsFor, type TipInput } from './tips.ts'

const base: TipInput = {
  fundMonths: 4,
  essentialMonths: 10,
  targetMonths: 6,
  income: 100,
  spending: 85,
  hryvniaSavings: 0,
  inflation: undefined,
  priceRises: [],
  money: (n) => `${Math.round(n)} грн`,
}
const ids = (input: Partial<TipInput>) => tipsFor({ ...base, ...input }).map((t) => t.id)

test('nothing to say in the middle of every guideline', () => {
  assert.deepEqual(ids({}), [])
})

test('a thin fund comes first, a covered one is good news last', () => {
  assert.deepEqual(ids({ fundMonths: 2, spending: 70 }), ['fund-low', 'savings-good'])
  assert.deepEqual(ids({ fundMonths: 6 }), ['fund-covered'])
  assert.deepEqual(ids({ fundMonths: Infinity }), ['fund-covered'])
  assert.match(tipsFor({ ...base, fundMonths: 2 })[0].text, /10\.0 months of essentials only/)
})

test('savings rate: negative, low and good', () => {
  assert.deepEqual(ids({ spending: 120 }), ['savings-negative'])
  assert.deepEqual(ids({ spending: 95 }), ['savings-low'])
  assert.deepEqual(ids({ spending: 80 }), ['savings-good'])
  assert.deepEqual(ids({ income: 0 }), [])
})

test('price rises: over 10% only, one tip for several', () => {
  const rise = (merchant: string, latest: number) => ({ merchant, name: merchant, latest, usual: 100 })
  assert.deepEqual(ids({ priceRises: [rise('a', 105)] }), [])
  assert.deepEqual(ids({ priceRises: [rise('a', 120)] }), ['price-rise:a'])
  assert.deepEqual(ids({ priceRises: [rise('b', 120), rise('a', 130)] }), ['price-rise:a,b'])
})

test('inflation on hryvnia savings is worth knowing, before good news', () => {
  const tips = tipsFor({ ...base, fundMonths: 6, hryvniaSavings: 300000, inflation: 0.11 })
  assert.deepEqual(
    tips.map((t) => t.id),
    ['inflation-hryvnia', 'fund-covered'],
  )
  assert.match(tips[0].text, /loses about 33000 грн/)
})
