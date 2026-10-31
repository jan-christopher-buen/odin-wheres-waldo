import { createHash } from 'node:crypto'
export const hash = (value) => createHash('sha256').update(value).digest('hex')
export const publicTarget = ({ id, name, symbol }) => ({ id, name, symbol })
export const marker = (t) => ({
  targetId: t.id,
  x: t.x + t.width / 2,
  y: t.y + t.height / 2,
})
export const failure = (status, message) =>
  Object.assign(new Error(message), { status })
export const inside = (target, x, y) =>
  x >= target.x &&
  x <= target.x + target.width &&
  y >= target.y &&
  y <= target.y + target.height
export const state = (r) => ({
  startedAt: r.startedAt,
  completedAt: r.completedAt,
  elapsedMs: r.completedAt ? r.completedAt - r.startedAt : null,
  markers: r.finds.map((f) => marker(f.target)),
  submitted: Boolean(r.score),
})
