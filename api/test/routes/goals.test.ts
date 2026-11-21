import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../helper'

// addedAt is the time of the request, so tests check it is recent and compare the rest
const withoutAddedAt = <T extends { addedAt: string }>(goals: T[]) =>
  goals.map(({ addedAt, ...rest }) => {
    assert.ok(Date.now() - Date.parse(addedAt) < 60_000)
    return rest
  })

test('create, list and delete goals', async (t) => {
  const app = await build(t)

  const created = await app.inject({
    method: 'POST',
    url: '/api/goals',
    payload: { name: 'Car', target: 15000.5, currency: 'USD' },
  })
  assert.equal(created.statusCode, 201)
  const { id } = created.json()

  assert.deepEqual(withoutAddedAt((await app.inject({ url: '/api/goals' })).json()), [
    {
      id,
      name: 'Car',
      target: 15000.5,
      currency: 'USD',
      wish: false,
      plannedFor: null,
      category: null,
      matchAfter: null,
    },
  ])

  assert.equal((await app.inject({ method: 'DELETE', url: `/api/goals/${id}` })).statusCode, 204)
  assert.deepEqual((await app.inject({ url: '/api/goals' })).json(), [])
  assert.equal((await app.inject({ method: 'DELETE', url: `/api/goals/${id}` })).statusCode, 404)

  const bad = await app.inject({
    method: 'POST',
    url: '/api/goals',
    payload: { name: 'X', target: 0, currency: 'USD' },
  })
  assert.equal(bad.statusCode, 400)
})

test('edit a goal', async (t) => {
  const app = await build(t)
  const { id } = (
    await app.inject({ method: 'POST', url: '/api/goals', payload: { name: 'Car', target: 15000, currency: 'USD' } })
  ).json()

  const edited = await app.inject({
    method: 'PUT',
    url: `/api/goals/${id}`,
    payload: { name: 'Used car', target: 9000.25, currency: 'EUR' },
  })
  assert.equal(edited.statusCode, 200)
  assert.deepEqual(withoutAddedAt([edited.json()]), [
    {
      id,
      name: 'Used car',
      target: 9000.25,
      currency: 'EUR',
      wish: false,
      plannedFor: null,
      category: null,
      matchAfter: null,
    },
  ])
  assert.deepEqual(withoutAddedAt((await app.inject({ url: '/api/goals' })).json()), [
    {
      id,
      name: 'Used car',
      target: 9000.25,
      currency: 'EUR',
      wish: false,
      plannedFor: null,
      category: null,
      matchAfter: null,
    },
  ])

  const invalid = await app.inject({
    method: 'PUT',
    url: `/api/goals/${id}`,
    payload: { name: '', target: 9000, currency: 'EUR' },
  })
  assert.equal(invalid.statusCode, 400)
  const missing = await app.inject({
    method: 'PUT',
    url: `/api/goals/${id + 1}`,
    payload: { name: 'X', target: 1, currency: 'USD' },
  })
  assert.equal(missing.statusCode, 404)
})

test('reorder goals', async (t) => {
  const app = await build(t)
  const add = async (name: string) =>
    (await app.inject({ method: 'POST', url: '/api/goals', payload: { name, target: 100, currency: 'USD' } })).json().id
  const a = await add('A')
  const b = await add('B')
  const c = await add('C')
  const names = async () => (await app.inject({ url: '/api/goals' })).json().map((g: { name: string }) => g.name)
  assert.deepEqual(await names(), ['A', 'B', 'C'])

  assert.equal(
    (await app.inject({ method: 'PUT', url: '/api/goals/order', payload: { ids: [c, a, b] } })).statusCode,
    204,
  )
  assert.deepEqual(await names(), ['C', 'A', 'B'])
  // a new goal goes last
  await add('D')
  assert.deepEqual(await names(), ['C', 'A', 'B', 'D'])

  const partial = await app.inject({ method: 'PUT', url: '/api/goals/order', payload: { ids: [a, b] } })
  assert.equal(partial.statusCode, 400)
})

test('a wish stays a wish when edited, and can become a goal', async (t) => {
  const app = await build(t)
  const created = await app.inject({
    method: 'POST',
    url: '/api/goals',
    payload: { name: 'Chair', target: 800, currency: 'USD', wish: true },
  })
  const { id } = created.json()
  assert.equal(withoutAddedAt([created.json()])[0].wish, true)

  const renamed = await app.inject({
    method: 'PUT',
    url: `/api/goals/${id}`,
    payload: { name: 'Office chair', target: 700, currency: 'USD' },
  })
  assert.equal(renamed.json().wish, true)

  const promoted = await app.inject({
    method: 'PUT',
    url: `/api/goals/${id}`,
    payload: { name: 'Office chair', target: 700, currency: 'USD', wish: false, plannedFor: null },
  })
  assert.equal(promoted.json().wish, false)
  assert.equal(promoted.json().addedAt, created.json().addedAt)
})

test('a wish keeps its planned month until it is changed or cleared', async (t) => {
  const app = await build(t)
  const created = await app.inject({
    method: 'POST',
    url: '/api/goals',
    payload: { name: 'Camera', target: 900, currency: 'USD', wish: true, plannedFor: '2027-03' },
  })
  assert.equal(created.json().plannedFor, '2027-03')
  const { id } = created.json()
  const put = (payload: object) => app.inject({ method: 'PUT', url: `/api/goals/${id}`, payload })

  assert.equal((await put({ name: 'Camera', target: 950, currency: 'USD' })).json().plannedFor, '2027-03')
  assert.equal((await put({ name: 'Camera', target: 950, currency: 'USD', plannedFor: null })).json().plannedFor, null)
  assert.equal((await put({ name: 'Camera', target: 950, currency: 'USD', plannedFor: '2027-13' })).statusCode, 400)
})

test('a wish keeps its category and the time its purchase was looked for up to', async (t) => {
  const app = await build(t)
  const { id } = (
    await app.inject({
      method: 'POST',
      url: '/api/goals',
      payload: { name: 'Lamp', target: 40, currency: 'USD', wish: true, category: 'home' },
    })
  ).json()
  const put = (payload: object) =>
    app.inject({
      method: 'PUT',
      url: `/api/goals/${id}`,
      payload: { name: 'Lamp', target: 40, currency: 'USD', ...payload },
    })

  const checked = await put({ matchAfter: '2026-11-20T10:00:00.000Z' })
  assert.equal(checked.json().category, 'home')
  assert.equal(checked.json().matchAfter, '2026-11-20T10:00:00.000Z')
  assert.equal((await put({ category: null })).json().category, null)
  assert.equal((await put({ category: 'income' })).statusCode, 400)
})
