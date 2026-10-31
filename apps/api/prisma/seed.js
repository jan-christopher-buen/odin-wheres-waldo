import { db } from '../src/db.js'
await db.scene.upsert({
  where: { id: 'market' },
  create: { id: 'market', name: 'Midnight Market', asset: '/market.svg' },
  update: {},
})
for (const [id, name, symbol, x, y, width, height] of [
  ['moth', 'Miso the moth', 'moth', 0.735, 0.178, 0.05, 0.075],
  ['robot', 'Bolt the courier', 'robot', 0.255, 0.626, 0.05, 0.105],
  ['cat', 'Clementine', 'cat', 0.825, 0.69, 0.06, 0.09],
  ['teapot', 'The moon teapot', 'teapot', 0.46, 0.415, 0.06, 0.075],
])
  await db.target.upsert({
    where: { id },
    create: { id, name, symbol, x, y, width, height, sceneId: 'market' },
    update: { name, symbol, x, y, width, height },
  })
await db.$disconnect()
