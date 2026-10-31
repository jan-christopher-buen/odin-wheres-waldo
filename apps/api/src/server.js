import { createApp } from './app.js'
import { db } from './db.js'
const server = createApp().listen(process.env.PORT || 3001, () =>
  console.log('Market API listening'),
)
process.on('SIGTERM', () =>
  server.close(async () => {
    await db.$disconnect()
    process.exit(0)
  }),
)
