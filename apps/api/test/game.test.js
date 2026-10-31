import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { db } from '../src/db.js'
import { createApp } from '../src/app.js'
const url = new URL(process.env.DATABASE_URL)
if (
  url.pathname !== '/odin_wheres_waldo_test' ||
  !['localhost', '127.0.0.1'].includes(url.hostname)
)
  throw new Error(
    'Tests require the dedicated local odin_wheres_waldo_test database',
  )
const app = createApp()
let targets
before(async () => {
  await db.score.deleteMany()
  await db.find.deleteMany()
  await db.round.deleteMany()
  targets = await db.target.findMany({ where: { sceneId: 'market' } })
  assert.equal(targets.length, 4, 'Seed the test database first')
})
after(async () => {
  await db.score.deleteMany()
  await db.find.deleteMany()
  await db.round.deleteMany()
  await db.$disconnect()
})
const start = async () =>
  (
    await request(app)
      .post('/api/rounds')
      .send({ sceneId: 'market' })
      .expect(201)
  ).body
const guess = (credential, t, coords = {}) =>
  request(app)
    .post('/api/guesses')
    .auth(credential, { type: 'bearer' })
    .send({
      targetId: t.id,
      x: t.x + t.width / 2,
      y: t.y + t.height / 2,
      ...coords,
    })
test('public responses reveal no answers or credentials', async () => {
  const { body } = await request(app).get('/api/scene').expect(200)
  assert.deepEqual(Object.keys(body.targets[0]).sort(), [
    'id',
    'name',
    'symbol',
  ])
  assert.equal(JSON.stringify(body).includes('credential'), false)
})
test('validates positions, identifiers, ownership, and expiry', async () => {
  const a = await start(),
    b = await start(),
    t = targets[0]
  await guess(a.credential, t, { x: -0.1 }).expect(400)
  await guess(a.credential, t, { x: '0.5' }).expect(400)
  await guess(a.credential, t, { x: null }).expect(400)
  await guess(a.credential, { ...t, id: 'missing' }).expect(400)
  await db.scene.create({
    data: {
      id: 'other',
      name: 'Other',
      asset: '/other.svg',
      targets: {
        create: {
          id: 'foreign',
          name: 'Foreign',
          symbol: 'cat',
          x: 0,
          y: 0,
          width: 1,
          height: 1,
        },
      },
    },
  })
  try {
    await guess(a.credential, { ...t, id: 'foreign' }).expect(400)
  } finally {
    await db.target.delete({ where: { id: 'foreign' } })
    await db.scene.delete({ where: { id: 'other' } })
  }
  await guess('0'.repeat(64), t).expect(401)
  await request(app)
    .post('/api/guesses')
    .send({ targetId: t.id, x: 0.5, y: 0.5 })
    .expect(401)
  await guess(a.credential, t).expect(200)
  assert.equal(
    (
      await request(app)
        .get('/api/round')
        .auth(b.credential, { type: 'bearer' })
    ).body.markers.length,
    0,
  )
  await db.round.updateMany({
    where: {
      credentialHash: (await import('node:crypto'))
        .createHash('sha256')
        .update(a.credential)
        .digest('hex'),
    },
    data: { startedAt: new Date(Date.now() - 7200001) },
  })
  await guess(a.credential, t).expect(410)
})
test('incorrect, boundaries, concurrent duplicate finds, authoritative completion and scores', async () => {
  const { credential } = await start(),
    t = targets[0]
  const wrong = await guess(credential, t, { x: 0, y: 0 }).expect(200)
  assert.equal(wrong.body.correct, false)
  assert.equal(wrong.body.markers.length, 0)
  await request(app)
    .post('/api/scores')
    .auth(credential, { type: 'bearer' })
    .send({ name: 'Early', elapsedMs: 0, completed: true })
    .expect(409)
  const concurrent = await Promise.all([
    guess(credential, t, { x: t.x, y: t.y }),
    guess(credential, t),
  ])
  concurrent.forEach((r) => assert.equal(r.status, 200))
  assert.equal(concurrent[1].body.markers.length, 1)
  let result
  for (const target of targets.slice(1))
    result = await guess(credential, target).expect(200)
  assert.equal(result.body.markers.length, 4)
  assert.ok(result.body.completedAt)
  assert.ok(result.body.elapsedMs >= 0)
  assert.equal(
    result.body.elapsedMs,
    new Date(result.body.completedAt) - new Date(result.body.startedAt),
  )
  await request(app)
    .post('/api/scores')
    .auth(credential, { type: 'bearer' })
    .send({ name: '<script>' })
    .expect(400)
  await request(app)
    .post('/api/scores')
    .auth(credential, { type: 'bearer' })
    .send({ name: '  Night Owl  ', elapsedMs: -100 })
    .expect(201)
  await request(app)
    .post('/api/scores')
    .auth(credential, { type: 'bearer' })
    .send({ name: 'Again' })
    .expect(409)
  const board = (await request(app).get('/api/leaderboard').expect(200)).body
  assert.equal(board[0].name, 'Night Owl')
  assert.equal(board[0].elapsedMs, result.body.elapsedMs)
  assert.deepEqual(Object.keys(board[0]).sort(), ['elapsedMs', 'name'])
})
test('leaderboard uses stable ties and bounds results', async () => {
  const rounds = await db.round.findMany({ take: 1 })
  for (let i = 0; i < 23; i++) {
    const r = await db.round.create({
      data: {
        sceneId: 'market',
        credentialHash: `fixture-${i}`,
        startedAt: new Date('2025-12-31'),
        completedAt: new Date(),
      },
    })
    await db.score.create({
      data: {
        roundId: r.id,
        name: `Player ${i}`,
        elapsedMs: i < 2 ? 1 : 100 + i,
        createdAt: new Date('2026-01-01'),
      },
    })
  }
  assert.ok(rounds.length)
  const board = (await request(app).get('/api/leaderboard')).body
  assert.equal(board.length, 20)
  assert.equal(board[0].name, 'Player 0')
  assert.equal(board[1].name, 'Player 1')
  for (let i = 1; i < board.length; i++)
    assert.ok(board[i].elapsedMs >= board[i - 1].elapsedMs)
})

test('inclusive upper boundaries, out-of-bounds misses, and concurrent scores', async () => {
  const a = await start()
  const t = targets[0]
  const miss = await guess(a.credential, t, {
    x: t.x + t.width + 0.0001,
  }).expect(200)
  assert.equal(miss.body.correct, false)
  for (const target of targets)
    await guess(a.credential, target, {
      x: target.x + target.width,
      y: target.y + target.height,
    }).expect(200)
  const [one, two] = await Promise.all([
    request(app)
      .post('/api/scores')
      .auth(a.credential, { type: 'bearer' })
      .send({ name: 'First' }),
    request(app)
      .post('/api/scores')
      .auth(a.credential, { type: 'bearer' })
      .send({ name: 'Second' }),
  ])
  assert.deepEqual([one.status, two.status].sort(), [201, 409])
  const state = (
    await request(app)
      .get('/api/round')
      .auth(a.credential, { type: 'bearer' })
      .expect(200)
  ).body
  assert.equal(state.markers.length, 4)
  assert.equal(state.submitted, true)
  assert.equal('credentialHash' in state, false)
})
