import './src/server/loadEnv'
import { createServer } from 'node:http'
import next from 'next'
import { env } from './src/env'
import { wsHandler, wireEngineEvents } from './src/server/ws'
import { database } from './src/server/services/database'

const dev = env.NODE_ENV !== 'production'
const hostname = env.HOST
const port = env.PORT

// Initialize database and load persisted state.
database.loadMatches().then(() => {
  console.log('📦 Loaded persisted matches from database')
}).catch((error) => {
  console.error('⚠️  Failed to load matches:', error)
})

const engine = database.getEngine()
wireEngineEvents(engine)

const nextApp = next({ dev, hostname, port })
const handle = nextApp.getRequestHandler()

void nextApp.prepare().then(() => {
  const server = createServer((req, res) => {
    void handle(req, res)
  })

  // Intercept WebSocket upgrade requests for /ws.
  // NOTE: non-/ws upgrades (e.g. Turbopack's `/_next/hmr` in dev) must be
  // left alone. Actively rejecting them (socket.destroy()/end()) breaks the
  // dev HMR client in a way that prevents client-side hydration entirely,
  // so Next.js pages render SSR shells with no data. In production there is
  // no HMR client, so unknown upgrades are safe to destroy.
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    if (url.pathname === '/ws') {
      wsHandler.handleUpgrade(req, socket, head)
    } else if (!dev) {
      socket.destroy()
    }
  })

  server.listen(port, hostname, () => {
    console.log(`🚀 LLM Chess Arena running at http://${hostname}:${port}`)
    console.log(`📡 WebSocket available at ws://${hostname}:${port}/ws`)
  })
})
