import express from 'express'
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'
import { randomBytes } from 'node:crypto'
import { db } from './db.js'
import { hash, publicTarget, failure, inside, state } from './game.js'
import { withRound } from './rounds.js'
export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1)
  app.use(
    cors({
      origin: (origin, cb) =>
        cb(
          null,
          !origin ||
            (process.env.CORS_ORIGINS || 'http://localhost:5173')
              .split(',')
              .includes(origin),
        ),
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  )
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })
  app.use(express.json({ limit: '4kb' }))
  app.use((req, _res, next) => {
    req.body ??= {}
    next()
  })
  app.use(
    '/api',
    rateLimit({
      windowMs: 60000,
      limit: 180,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: 'Too many requests. Wait a minute and retry.' },
    }),
  )
  app.get('/api/health', (_req, res) => res.json({ ok: true }))
  app.get('/api/scene', async (_req, res) => {
    const scene = await db.scene.findUnique({
      where: { id: 'market' },
      include: { targets: { orderBy: { id: 'asc' } } },
    })
    if (!scene) throw failure(503, 'The market is not ready. Please try again.')
    res.json({
      id: scene.id,
      name: scene.name,
      asset: scene.asset,
      targets: scene.targets.map(publicTarget),
    })
  })
  app.post(
    '/api/rounds',
    rateLimit({
      windowMs: 60000,
      limit: 15,
      message: { error: 'Too many new rounds. Wait a minute and retry.' },
    }),
    async (req, res) => {
      if (req.body.sceneId !== 'market') throw failure(400, 'Unknown scene.')
      const credential = randomBytes(32).toString('hex')
      const round = await db.round.create({
        data: { sceneId: 'market', credentialHash: hash(credential) },
      })
      res.status(201).json({ credential, startedAt: round.startedAt })
    },
  )
  app.get('/api/round', async (req, res) =>
    res.json(
      await withRound(req.get('Authorization'), (_tx, round) => state(round)),
    ),
  )
  app.post('/api/guesses', async (req, res) => {
    const { targetId, x, y } = req.body
    if (
      typeof targetId !== 'string' ||
      ![x, y].every(
        (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1,
      )
    )
      throw failure(400, 'Choose a valid position and target.')
    res.json(
      await withRound(req.get('Authorization'), async (tx, round) => {
        const target = round.scene.targets.find((t) => t.id === targetId)
        if (!target)
          throw failure(400, 'That target does not belong to this scene.')
        if (round.finds.some((f) => f.targetId === targetId))
          return { correct: true, duplicate: true, ...state(round) }
        if (round.completedAt) throw failure(409, 'Round already complete.')
        const correct = inside(target, x, y)
        if (correct) {
          await tx.find.create({ data: { roundId: round.id, targetId } })
          round.finds.push({ target })
          if (round.finds.length === round.scene.targets.length) {
            round.completedAt = new Date()
            await tx.round.update({
              where: { id: round.id },
              data: { completedAt: round.completedAt },
            })
          }
        }
        return { correct, ...state(round) }
      }),
    )
  })
  app.post('/api/scores', async (req, res) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : ''
    if (name.length < 1 || name.length > 24 || /[\p{C}<>]/u.test(name))
      throw failure(
        400,
        'Use 1–24 characters without control characters or angle brackets.',
      )
    await withRound(req.get('Authorization'), async (tx, round) => {
      if (!round.completedAt) throw failure(409, 'Find every target first.')
      if (round.score)
        throw failure(409, 'This time has already been submitted.')
      await tx.score.create({
        data: {
          name,
          roundId: round.id,
          elapsedMs: round.completedAt - round.startedAt,
        },
      })
    })
    res.status(201).json({ ok: true })
  })
  app.get('/api/leaderboard', async (_req, res) =>
    res.json(
      await db.score.findMany({
        where: { round: { sceneId: 'market' } },
        orderBy: [{ elapsedMs: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        take: 20,
        select: { name: true, elapsedMs: true },
      }),
    ),
  )
  app.use((err, _req, res, _next) => {
    if (!err.status) console.error(err.message)
    res.status(err.status || 500).json({
      error: err.status
        ? err.message
        : 'The market connection failed. Please retry.',
    })
  })
  return app
}
