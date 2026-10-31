import { db } from './db.js'
import { hash, failure } from './game.js'
// Lock the parent round before reading or changing its finds or score.
// All competing writes for this credential then observe a consistent round.
export async function withRound(authorization, action) {
  const credential = authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1]
  if (!credential) throw failure(401, 'Start a new round to play.')
  return db.$transaction(async (tx) => {
    const rows =
      await tx.$queryRaw`SELECT id FROM "Round" WHERE "credentialHash" = ${hash(credential)} FOR UPDATE`
    if (!rows.length) throw failure(401, 'This round is unavailable.')
    const round = await tx.round.findUnique({ where: { id: rows[0].id } })
    if (Date.now() - round.startedAt.getTime() > 7200000)
      throw failure(410, 'This round expired. Start another round.')
    const targets = await tx.target.findMany({
      where: { sceneId: round.sceneId },
    })
    const finds = await tx.find.findMany({ where: { roundId: round.id } })
    const score = await tx.score.findUnique({ where: { roundId: round.id } })
    return action(tx, {
      ...round,
      scene: { targets },
      finds: finds.map((f) => ({
        ...f,
        target: targets.find((t) => t.id === f.targetId),
      })),
      score,
    })
  })
}
